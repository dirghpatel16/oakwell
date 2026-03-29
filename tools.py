"""Custom tools for the Battle Card Pipeline.

Provides HTML battle card generation, comparison chart creation,
and Playwright-based competitor scraping (full React-rendered content → Markdown).
"""

import logging
import os
from pathlib import Path
from datetime import datetime
from typing import Optional, List, Union, Dict, Any
from google.adk.tools import ToolContext
from google.genai import types, Client
import asyncio
import json
import random
from playwright.async_api import async_playwright
from markdownify import markdownify as md

logger = logging.getLogger("BattleCardPipeline")

# Create outputs directory for generated files
OUTPUTS_DIR = Path(__file__).parent / "outputs"
OUTPUTS_DIR.mkdir(exist_ok=True)

# Active fast model for the working product path.
FAST_MODEL = os.environ.get("OAKWELL_FAST_MODEL", "gemini-2.5-flash")


def resolve_genai_api_key(api_key: Optional[str] = None) -> Optional[str]:
    """Resolve the backend Gemini API key deterministically.

    Accepts an explicit override first, then falls back to server-side env vars.
    Supporting both names makes deployments less brittle across environments.
    """
    candidates = [
        api_key,
        os.environ.get("GOOGLE_API_KEY"),
        os.environ.get("GEMINI_API_KEY"),
    ]

    for candidate in candidates:
        if candidate and candidate.strip():
            return candidate.strip()
    return None


def require_genai_api_key(api_key: Optional[str] = None) -> str:
    """Return a configured backend Gemini API key or raise a clear error."""
    resolved = resolve_genai_api_key(api_key)
    if resolved:
        return resolved

    raise RuntimeError(
        "Backend AI credentials are not configured. Set GOOGLE_API_KEY or GEMINI_API_KEY on the server."
    )


def create_genai_client(api_key: Optional[str] = None) -> Client:
    """Create a google.genai client with an explicit server-side API key."""
    return Client(
        api_key=require_genai_api_key(api_key),
        http_options={"api_version": "v1"},
    )


async def capture_page_screenshot(url: str) -> Dict[str, Any]:
    """Capture a full-page screenshot via stealth Playwright (single browser session).

    Returns dict with: status, img_bytes, artifact_name, filepath.
    Used by the batch verification pipeline so we only open ONE browser per URL.
    """
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)

            if not url.lower().startswith("https://"):
                if url.lower().startswith("http://"):
                    url = "https://" + url.split("://", 1)[1]
                else:
                    url = "https://" + url

            USER_AGENT = (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/119.0.0.0 Safari/537.36"
            )
            stealth_headers = {
                "Accept-Language": "en-US,en;q=0.9",
                "Referer": "https://www.google.com/",
            }
            context = await browser.new_context(
                user_agent=USER_AGENT, locale="en-US", extra_http_headers=stealth_headers
            )
            page = await context.new_page()
            await page.add_init_script("""
Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
window.chrome = {runtime: {}};
Object.defineProperty(navigator, 'languages', {get: () => ['en-US', 'en']});
Object.defineProperty(navigator, 'plugins', {get: () => [1, 2, 3, 4, 5]});
""")
            await page.goto(
                url, wait_until="domcontentloaded", timeout=60000,
                referer="https://www.google.com/",
            )
            await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            await asyncio.sleep(random.uniform(1, 3))
            await page.evaluate("window.scrollTo(0, 0)")
            await asyncio.sleep(random.uniform(1, 2))
            img_bytes = await page.screenshot(full_page=True)
            await context.close()
            await browser.close()

        artifact_name = f"proof_{datetime.now().strftime('%H%M%S')}_{random.randint(1000, 9999)}.png"
        filepath = OUTPUTS_DIR / artifact_name
        filepath.write_bytes(img_bytes)

        return {
            "status": "success",
            "img_bytes": img_bytes,
            "artifact_name": artifact_name,
            "filepath": str(filepath),
        }
    except Exception as e:
        logger.exception("capture_page_screenshot failed: %s", e)
        return {"status": "error", "message": str(e), "img_bytes": None, "artifact_name": None}


async def verify_claim_against_screenshot(
    img_bytes: bytes,
    claim: str,
    proof_filename: str,
    api_key: Optional[str] = None,
) -> Dict[str, Any]:
    """Verify a single claim against pre-captured screenshot bytes.

    Calls Gemini Vision; retries up to 3× on 503 with 5 s backoff.
    Used by the batch verification pipeline in main.py.
    """
    try:
        client = create_genai_client(api_key)
        prompt = (
            f"Analyze this screenshot. Is the claim '{claim}' true or false? "
            f"Respond only with JSON: {{'verified': bool, 'confidence': float, 'explanation': str}}"
        )
        await asyncio.sleep(min(2 ** 0 + 2, 10))  # Exponential backoff base: 3 s
        response = None
        for attempt in range(3):
            try:
                response = await client.aio.models.generate_content(
                    model=FAST_MODEL,
                    contents=[types.Part.from_bytes(data=img_bytes, mime_type="image/png"), prompt],
                )
                break
            except Exception as e:
                error_text = str(e)
                if ("503" in error_text or "ServiceUnavailable" in error_text or "429" in error_text) and attempt < 2:
                    wait = min(2 ** (attempt + 1) + 2, 10)
                    logger.warning("Retry %d/3 in %ds: %s", attempt + 1, wait, error_text[:120])
                    await asyncio.sleep(wait)
                    continue
                raise

        res_text = response.text
        start, end = res_text.find("{"), res_text.rfind("}")
        data = json.loads(res_text[start : end + 1]) if start != -1 else {"verified": False}

        return {
            "status": "success",
            "claim": claim,
            "verified": data.get("verified", False),
            "confidence_score": data.get("confidence", 0.0),
            "explanation": data.get("explanation", ""),
            "proof_artifact_path": proof_filename,
        }
    except Exception as e:
        logger.warning("verify_claim_against_screenshot failed for '%s': %s", claim, e)
        return {
            "status": "error",
            "claim": claim,
            "verified": False,
            "confidence_score": 0.0,
            "explanation": str(e),
            "proof_artifact_path": proof_filename,  # Still return proof path!
        }


async def scrape_competitor_website(
    url: str,
    tool_context: Optional[ToolContext] = None,
) -> Dict[str, Any]:
    """Scrape a competitor page with Playwright (avoids bot-detectors), then convert to clean Markdown.

    Uses the same Playwright flow as verify_claim_with_vision: real browser, load + scroll
    to trigger React/lazy content, then extract inner HTML and convert to Markdown with
    markdownify so Oakwell gets full rendered content for analysis.

    Args:
        url: Competitor page URL to scrape.
        tool_context: Optional ADK context for saving the markdown artifact.

    Returns:
        dict with status, markdown (full page as Markdown), url, character_count, and optional artifact path.
    """
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)

            # Prefer HTTPS (many enterprise sites block insecure HTTP)
            if not url.lower().startswith("https://"):
                if url.lower().startswith("http://"):
                    url = "https://" + url.split("://", 1)[1]
                else:
                    url = "https://" + url

            # Stealth: realistic Chrome User-Agent and common headers
            USER_AGENT = (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/119.0.0.0 Safari/537.36"
            )
            stealth_headers = {
                "Accept-Language": "en-US,en;q=0.9",
                "Referer": "https://www.google.com/",
            }

            # Use a browser context with user agent and extra headers to reduce detectability
            context = await browser.new_context(user_agent=USER_AGENT, locale="en-US", extra_http_headers=stealth_headers)
            page = await context.new_page()
            await page.add_init_script("""
Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
window.chrome = {runtime: {}};
Object.defineProperty(navigator, 'languages', {get: () => ['en-US', 'en']});
Object.defineProperty(navigator, 'plugins', {get: () => [1, 2, 3, 4, 5]});
""")
            await page.goto(url, wait_until="domcontentloaded", timeout=60000, referer="https://www.google.com/")
            # Scroll to trigger React/lazy content and let dynamic content render
            await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            await asyncio.sleep(random.uniform(1, 3))
            await page.evaluate("window.scrollTo(0, 0)")
            # Small human-like pause before extracting content
            await asyncio.sleep(0.5)
            # Extract full document HTML (post-render)
            html = await page.content()
            await context.close()
            await browser.close()

        # Convert entire page to clean Markdown for Oakwell to analyze
        markdown_content = md(
            html,
            heading_style="ATX",
            strip=["script", "style", "nav", "footer", "noscript"],
            escape_asterisks=False,
            escape_underscores=False,
        )

        artifact_path = None
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        artifact_name = f"scrape_{timestamp}.md"
        filepath = OUTPUTS_DIR / artifact_name
        filepath.write_text(markdown_content, encoding="utf-8")
        artifact_path = artifact_name

        if tool_context:
            text_artifact = types.Part.from_bytes(
                data=markdown_content.encode("utf-8"),
                mime_type="text/markdown",
            )
            await tool_context.save_artifact(filename=artifact_name, artifact=text_artifact)

        return {
            "status": "success",
            "url": url,
            "markdown": markdown_content,
            "character_count": len(markdown_content),
            "proof_artifact_path": artifact_path,
            "artifact": artifact_name,
        }
    except Exception as e:
        logger.exception("scrape_competitor_website failed: %s", e)
        return {
            "status": "error",
            "url": url,
            "message": str(e),
            "markdown": "",
            "character_count": 0,
            "proof_artifact_path": None,
        }


async def calculate_market_delta(
    current_data: Dict[str, Any],
    historical_data: Dict[str, Any],
    api_key: Optional[str] = None,
) -> Dict[str, Any]:
    """Identify exactly what changed between current and historical pricing/features."""
    try:
        client = create_genai_client(api_key)
        prompt = (
            "You are a market intelligence analyst. Compare CURRENT vs HISTORICAL data and "
            "identify exact changes in pricing, packaging, and features. Provide a concise JSON "
            "response with fields: summary, pricing_changes, feature_changes, removals, additions, and confidence. "
            f"CURRENT_DATA: {json.dumps(current_data, indent=2)}\n"
            f"HISTORICAL_DATA: {json.dumps(historical_data, indent=2)}\n"
            "Respond ONLY with valid JSON."
        )
        response = client.models.generate_content(
            model=FAST_MODEL,
            contents=prompt,
        )
        text = (response.text or "").strip()
        start, end = text.find("{"), text.rfind("}")
        if start == -1 or end == -1:
            return {
                "status": "error",
                "message": "Failed to parse JSON response",
                "raw": text,
            }
        return {
            "status": "success",
            "delta": json.loads(text[start : end + 1]),
        }
    except Exception as e:
        logger.error("Error calculating market delta: %s", e)
        return {"status": "error", "message": str(e)}


async def generate_battle_card_html(
    battle_card_data: str,
    tool_context: ToolContext,
    api_key: Optional[str] = None,
) -> Dict[str, Any]:
    """Generate a professional HTML battle card for sales teams.

    Args:
        battle_card_data: Compiled competitive intelligence data
        tool_context: ADK tool context for artifact saving

    Returns:
        dict with status and artifact info
    """
    current_date = datetime.now().strftime("%B %d, %Y")
    
    prompt = f"""Generate a professional sales battle card in HTML format.

**DATE: {current_date}**

This is a competitive battle card for sales reps to use during deals.

Style it for SALES TEAMS with:
- Clean, scannable design (reps glance at this during calls)
- Color coding: GREEN for our advantages, RED for competitor strengths
- Collapsible sections for detailed content
- Quick-reference format at the top
- Dark blue (#1e3a5f) and orange (#f97316) color scheme
- Print-friendly layout

COMPETITIVE INTELLIGENCE DATA:
{battle_card_data}

**REQUIRED SECTIONS:**

1. **Header** - Competitor name, logo placeholder, last updated date
2. **Quick Stats** - 5-6 one-liner facts about the competitor
3. **At a Glance** - 3 columns: They Win | We Win | Toss-up
4. **Feature Comparison** - Table with checkmarks/X marks
5. **Positioning** - How to position against them (2-3 sentences)
6. **Their Strengths** - Honest list with red indicators
7. **Their Weaknesses** - List with green indicators (our opportunities)
8. **Objection Handling** - Top 5 objections with quick responses
9. **Killer Questions** - Questions to ask prospects
10. **Landmines** - Traps to set in competitive deals

Make it visually impressive but FAST TO SCAN. Sales reps have seconds, not minutes.

Generate complete, valid HTML with embedded CSS and JavaScript for collapsible sections."""

    try:
        client = create_genai_client(api_key)
        response = await client.aio.models.generate_content(
            model=FAST_MODEL,
            contents=prompt,
        )

        html_content = response.text

        # Clean up markdown wrapping if present
        if "```html" in html_content:
            start = html_content.find("```html") + 7
            end = html_content.rfind("```")
            html_content = html_content[start:end].strip()
        elif "```" in html_content:
            start = html_content.find("```") + 3
            end = html_content.rfind("```")
            html_content = html_content[start:end].strip()

        # Save as ADK artifact
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        artifact_name = f"battle_card_{timestamp}.html"
        html_artifact = types.Part.from_bytes(
            data=html_content.encode('utf-8'),
            mime_type="text/html"
        )
        
        version = await tool_context.save_artifact(filename=artifact_name, artifact=html_artifact)
        logger.info(f"Saved battle card artifact: {artifact_name} (version {version})")

        # Also save to outputs folder
        filepath = OUTPUTS_DIR / artifact_name
        filepath.write_text(html_content, encoding='utf-8')
        
        return {
            "status": "success",
            "message": f"Battle card saved as '{artifact_name}' - view in Artifacts tab",
            "artifact": artifact_name,
            "version": version
        }

    except Exception as e:
        logger.error(f"Error generating battle card: {e}")
        return {"status": "error", "message": str(e)}


async def generate_comparison_chart(
    competitor_name: str,
    your_product_name: str,
    comparison_data: str,
    tool_context: ToolContext,
    api_key: Optional[str] = None,
) -> Dict[str, Any]:
    """Generate a visual comparison infographic using Gemini image generation.

    Args:
        competitor_name: Name of the competitor
        your_product_name: Name of your product
        comparison_data: Feature comparison data with scores and highlights
        tool_context: ADK tool context for artifact saving

    Returns:
        dict with status and artifact info
    """
    prompt = f"""Create a professional competitive comparison infographic.

**COMPARISON: {your_product_name} vs {competitor_name}**

Style: Clean, modern, sales-ready infographic
Colors: 
- Green (#22c55e) for {your_product_name} (your product)
- Red (#ef4444) for {competitor_name} (competitor)
- Dark blue (#1e3a5f) for headers and text
- White background

**DATA TO VISUALIZE:**
{comparison_data}

**INFOGRAPHIC LAYOUT:**

1. **Header** - "{your_product_name} vs {competitor_name}" prominently at top
2. **Score Overview** - Large visual showing overall winner
3. **Feature Comparison** - Side-by-side bars or ratings for each feature
4. **Key Differentiators** - Icons highlighting where {your_product_name} wins
5. **Bottom Line** - Clear verdict/recommendation badge

**DESIGN REQUIREMENTS:**
- Professional, enterprise-ready aesthetic
- Easy to read at a glance
- Color-coded clearly (green = us, red = them)
- Include checkmarks for wins, X marks for losses
- Make it look like a Gartner or Forrester comparison graphic
- Data-rich but not cluttered

Generate a visually compelling infographic that sales reps can share with prospects."""

    try:
        client = create_genai_client(api_key)
        # Gemini 1.5 Flash is multimodal; request IMAGE modality. If image generation hits quota,
        # the API still returns text and we fall back to the text description below.
        response = await client.aio.models.generate_content(
            model=FAST_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_modalities=["TEXT", "IMAGE"]
            ),
        )

        # Look for image in response; if unavailable or quota-limited, return text description
        if not response.candidates or not response.candidates[0].content.parts:
            return {
                "status": "partial",
                "message": "Image generation not available, text description provided",
                "description": response.text if response.text else "No content generated",
            }
        for part in response.candidates[0].content.parts:
            if part.inline_data and part.inline_data.mime_type.startswith("image/"):
                image_bytes = part.inline_data.data
                mime_type = part.inline_data.mime_type
                
                # Save as ADK artifact
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                ext = "png" if "png" in mime_type else "jpg"
                artifact_name = f"comparison_infographic_{timestamp}.{ext}"
                
                image_artifact = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
                version = await tool_context.save_artifact(filename=artifact_name, artifact=image_artifact)
                logger.info(f"Saved comparison infographic: {artifact_name} (version {version})")
                
                # Also save to outputs folder
                filepath = OUTPUTS_DIR / artifact_name
                filepath.write_bytes(image_bytes)
                
                return {
                    "status": "success",
                    "message": f"Comparison infographic saved as '{artifact_name}' - view in Artifacts tab",
                    "artifact": artifact_name,
                    "version": version,
                    "comparison": f"{your_product_name} vs {competitor_name}"
                }

        return {
            "status": "partial",
            "message": "Image generation not available, text description provided",
            "description": response.text if response.text else "No content generated"
        }

    except Exception as e:
        logger.error(f"Error generating comparison infographic: {e}")
        return {"status": "error", "message": str(e)}

async def verify_claim_with_vision(
    url: str,
    claim: str,
    tool_context: Optional[ToolContext] = None,
    api_key: Optional[str] = None,
) -> Dict[str, Any]:
    """The 'AGI' Eye: Opens a browser, captures proof, and verifies truth."""
    saved_artifact_name = None
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)

            # Prefer HTTPS to avoid enterprise blocks
            if not url.lower().startswith("https://"):
                if url.lower().startswith("http://"):
                    url = "https://" + url.split("://", 1)[1]
                else:
                    url = "https://" + url

            USER_AGENT = (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/119.0.0.0 Safari/537.36"
            )
            stealth_headers = {
                "Accept-Language": "en-US,en;q=0.9",
                "Referer": "https://www.google.com/",
            }

            context = await browser.new_context(user_agent=USER_AGENT, locale="en-US", extra_http_headers=stealth_headers)
            page = await context.new_page()
            await page.add_init_script("""
Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
window.chrome = {runtime: {}};
Object.defineProperty(navigator, 'languages', {get: () => ['en-US', 'en']});
Object.defineProperty(navigator, 'plugins', {get: () => [1, 2, 3, 4, 5]});
""")
            await page.goto(url, wait_until="domcontentloaded", timeout=60000, referer="https://www.google.com/")

            # 2. Scroll to load lazy content
            await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            await asyncio.sleep(random.uniform(1, 3))
            await page.evaluate("window.scrollTo(0, 0)")

            # 3. Small randomized delay to simulate human viewing
            await asyncio.sleep(random.uniform(1, 2))

            # 4. Capture the visual proof
            img_bytes = await page.screenshot(full_page=True)
            await context.close()
            await browser.close()

        # 4. Save the screenshot as an Artifact (or to OUTPUTS_DIR when no tool_context, e.g. from API)
        # Use millisecond-precision timestamp + random suffix to guarantee unique filenames
        artifact_name = f"proof_{datetime.now().strftime('%H%M%S')}_{random.randint(1000,9999)}.png"
        saved_artifact_name = artifact_name
        if tool_context:
            image_artifact = types.Part.from_bytes(data=img_bytes, mime_type="image/png")
            await tool_context.save_artifact(filename=artifact_name, artifact=image_artifact)
        else:
            filepath = OUTPUTS_DIR / artifact_name
            filepath.write_bytes(img_bytes)

        # 5. Use Gemini 2.0 Flash (High-Precision Vision) to 'Read' the image — AGI-level analysis
        client = create_genai_client(api_key)
        prompt = f"Analyze this screenshot. Is the claim '{claim}' true or false? Respond only with JSON: {{'verified': bool, 'confidence': float, 'explanation': str}}"
        await asyncio.sleep(min(2 ** 0 + 2, 10))  # Exponential backoff base
        response = None
        for attempt in range(3):
            try:
                response = await client.aio.models.generate_content(
                    model=FAST_MODEL,
                    contents=[types.Part.from_bytes(data=img_bytes, mime_type="image/png"), prompt]
                )
                break
            except Exception as e:
                error_text = str(e)
                if ("503" in error_text or "ServiceUnavailable" in error_text or "429" in error_text) and attempt < 2:
                    wait = min(2 ** (attempt + 1) + 2, 10)
                    logger.warning("Retry %d/3 in %ds: %s", attempt + 1, wait, error_text[:120])
                    await asyncio.sleep(wait)
                    continue
                raise
        
        # Parse result
        res_text = response.text
        start, end = res_text.find("{"), res_text.rfind("}")
        data = json.loads(res_text[start:end+1]) if start != -1 else {"verified": False}

        proof_path = artifact_name
        return {
            "status": "success",
            "verified": data.get("verified"),
            "confidence_score": data.get("confidence", 0.0),
            "explanation": data.get("explanation", ""),
            "proof_artifact": artifact_name,
            "proof_artifact_path": proof_path,
        }
    except Exception as e:
        return {"status": "error", "message": str(e), "confidence_score": 0.0, "proof_artifact_path": saved_artifact_name}


async def generate_closing_email(
    deal_results: Dict[str, Any],
    api_key: Optional[str] = None,
) -> str:
    """Generate a kill-shot competitive closing email with proof-referenced arguments.

    Uses gemini-2.0-flash for speed.  Retries up to 3 times on 503 errors
    with a 5-second sleep between attempts.
    """
    try:
        client = create_genai_client(api_key)

        # Resolve the exact proof filename the rep should reference
        proof_filename = (
            deal_results.get("proof_artifact_path")
            or deal_results.get("proof_artifact")
            or "proof_captured.png"
        )
        if str(proof_filename).lower() in ("none", "null", ""):
            proof_filename = "proof_captured.png"

        score = deal_results.get("deal_health_score", "N/A")
        talk_track = deal_results.get("talk_track", "")
        clashes = deal_results.get("clashes_detected", [])
        drift = deal_results.get("market_drift")
        trend = deal_results.get("trend", "")
        deal_stage = deal_results.get("deal_stage", "unknown")
        deal_value = deal_results.get("deal_value")
        risk_level = deal_results.get("risk_level", "")
        score_reasoning = deal_results.get("score_reasoning", "")
        pivot_points = deal_results.get("key_pivot_points", [])

        # Stage-adaptive email tone
        _stage_tone = {
            "discovery": "curious and consultative — open doors, don't hard-sell",
            "technical_eval": "evidence-heavy — reference screenshots and verified data",
            "proposal": "ROI-focused — anchor value against competitor total cost",
            "negotiation": "firm and urgent — defend pricing, expose competitor risk",
            "closing": "decisive and executive — remove final blockers, enable the champion",
        }
        email_tone = _stage_tone.get(deal_stage, "professional and competitive")

        prompt = f"""You are a world-class Sales Strategist writing a kill-shot follow-up email.

DEAL ANALYSIS:
- Deal Health Score: {score}/100
- Risk Level: {risk_level or 'unknown'}
- Score Reasoning: {score_reasoning or 'N/A'}
- Deal Stage: {deal_stage or 'unknown'}
- Deal Value: ${deal_value or 'unknown'}
- Clashes detected: {json.dumps(clashes, indent=2)}
- Talk Track Summary: {talk_track[:2000]}
- Key Pivot Points: {json.dumps(pivot_points) if pivot_points else 'None'}
- Market Drift: {json.dumps(drift) if drift else 'None detected'}
- Trend Analysis: {trend if trend else 'First analysis — no historical trend yet.'}

EMAIL TONE FOR {(deal_stage or 'unknown').upper()} STAGE: {email_tone}

VISUAL PROOF SCREENSHOT: {proof_filename}

WRITE THE EMAIL:
1. Open with a warm but confident hook referencing the conversation.
2. Mention SPECIFIC claims the buyer made that our visual verification disproved.
3. Reference the attached screenshot ("{proof_filename}") as evidence.
4. Position us as the "Verified and Truthful" alternative.
5. If trend data shows declining deal health, subtly note the competitor's decreasing reliability over time.
6. Include a clear call-to-action (meeting, demo, or decision deadline).
7. Tone: Professional, empathetic, but with killer competitive edge.

FORMAT RULES (strict):
- Start with exactly: Subject: <one compelling subject line>
- Then a blank line, then exactly: Body:
- Then the full email body in plain text (no markdown, no asterisks).
- Sign off professionally.
- Keep it under 250 words.

Output ONLY the Subject and Body. Nothing else."""

        email_text = ""
        last_error = None
        for attempt in range(3):
            try:
                response = await client.aio.models.generate_content(
                    model=FAST_MODEL,
                    contents=prompt,
                )
                email_text = (response.text or "").strip()
                break
            except Exception as e:
                last_error = e
                err_str = str(e)
                if ("503" in err_str or "ServiceUnavailable" in err_str) and attempt < 2:
                    logger.warning("Email generation 503 on attempt %d, retrying in 5s…", attempt + 1)
                    await asyncio.sleep(5)
                    continue
                logger.error("Gemini API call failed for email generation: %s", e)
                break

        if not email_text:
            return (
                f"Subject: Follow-up on Deal Analysis\n\n"
                f"Body:\nBased on our verified analysis (score: {score}/100), "
                f"I wanted to follow up on our discussion. We've captured visual proof "
                f"({proof_filename}) that highlights key opportunities worth exploring.\n\n"
                f"Best regards"
            )

        # Ensure clean Subject: / Body: structure
        if "Subject:" not in email_text:
            email_text = "Subject: Follow-up on verified competitive findings\n\nBody:\n" + email_text
        if "Body:" not in email_text:
            # Insert Body: after the Subject line
            parts = email_text.split("\n", 1)
            email_text = parts[0] + "\n\nBody:\n" + (parts[1] if len(parts) > 1 else "")

        return email_text.strip()
    except Exception as e:
        logger.error("Error generating closing email: %s", e)
        return ""


def generate_pdf_report_content(deal_results: Dict[str, Any]) -> str:
    """Generate a clean text report of the full deal analysis for printing / PDF export.

    Returns a formatted plain-text string containing:
    - Deal health score
    - Adversarial talk-track
    - Clashes table
    - Visual proof filenames
    - Market drift alerts (if any)
    - Score history trend
    """
    lines: List[str] = []
    lines.append("=" * 64)
    lines.append("  OAKWELL — Revenue Intelligence Sales Brief")
    lines.append("=" * 64)
    lines.append("")

    score = deal_results.get("deal_health_score", "N/A")
    lines.append(f"Deal Health Score: {score}/100")

    # Deal Stage & Risk Level
    _stage = deal_results.get("deal_stage")
    _risk = deal_results.get("risk_level")
    _value = deal_results.get("deal_value")
    _reasoning = deal_results.get("score_reasoning")
    if _stage:
        lines.append(f"Deal Stage: {_stage.upper()}")
    if _risk:
        lines.append(f"Risk Level: {_risk.upper()}")
    if _value:
        lines.append(f"Deal Value: ${_value:,.0f}")
    if _reasoning:
        lines.append(f"Score Reasoning: {_reasoning}")

    cached = deal_results.get("cached", False)
    if cached:
        lines.append("(Smart-cached analysis — visual proof reused from prior run)")
    lines.append("")

    # Winning patterns
    _wp = deal_results.get("winning_patterns_summary", {})
    if _wp and _wp.get("total_outcomes", 0) > 0:
        lines.append(f"Historical Win Rate: {_wp.get('win_rate', 0):.0%} ({_wp.get('total_outcomes', 0)} past deals)")
        lines.append(f"Avg Winning Score: {_wp.get('avg_winning_score', 0):.0f}")
        lines.append("")

    # Score history trend
    scores = deal_results.get("score_history", [])
    if scores:
        trend_str = " → ".join(str(s) for s in scores)
        lines.append(f"Score Trend: {trend_str}")
        lines.append("")

    # Talk-track
    lines.append("-" * 64)
    lines.append("ADVERSARIAL TALK-TRACK")
    lines.append("-" * 64)
    talk = deal_results.get("talk_track", "—")
    lines.append(talk.replace("*", "").replace("_", ""))
    lines.append("")

    # Clashes
    clashes = deal_results.get("clashes_detected", [])
    lines.append("-" * 64)
    lines.append(f"CLASHES DETECTED ({len(clashes)})")
    lines.append("-" * 64)
    if clashes:
        for i, c in enumerate(clashes, 1):
            lines.append(f"  {i}. Claim : {c.get('claim', '—')}")
            lines.append(f"     Risk  : {c.get('risk', '—')}")
            conf = c.get("confidence_score")
            if isinstance(conf, (int, float)):
                conf_str = f"{float(conf):.0%}" if conf <= 1.0 else str(conf)
            else:
                conf_str = str(conf) if conf else "—"
            lines.append(f"     Conf  : {conf_str}")
            lines.append("")
    else:
        lines.append("  No clashes — buyer claims aligned with visual proof.")
        lines.append("")

    # Visual proof
    proof = deal_results.get("proof_artifact_path", "")
    all_proofs = deal_results.get("all_proof_filenames", [])
    lines.append("-" * 64)
    lines.append("VISUAL PROOF ARTIFACTS")
    lines.append("-" * 64)
    lines.append(f"  Primary : {proof or '—'}")
    if all_proofs:
        lines.append(f"  All     : {', '.join(all_proofs)}")
    lines.append("")

    # Market drift
    drift = deal_results.get("market_drift")
    if drift and drift.get("drift_detected"):
        lines.append("-" * 64)
        lines.append("MARKET DRIFT ALERTS")
        lines.append("-" * 64)
        for alert in drift.get("alerts", []):
            lines.append(f"  ⚠ {alert}")
        lines.append("")

    # Stage-specific pivot points & actions
    _pivots = deal_results.get("key_pivot_points", [])
    _actions = deal_results.get("stage_specific_actions", [])
    if _pivots or _actions:
        lines.append("-" * 64)
        lines.append("STAGE-ADAPTIVE PLAYBOOK")
        lines.append("-" * 64)
        if _pivots:
            lines.append("  Key Pivot Points:")
            for i, pp in enumerate(_pivots[:5], 1):
                lines.append(f"    {i}. {pp}")
        if _actions:
            lines.append("  Stage-Specific Actions:")
            for i, sa in enumerate(_actions[:5], 1):
                lines.append(f"    {i}. {sa}")
        lines.append("")

    lines.append("=" * 64)
    lines.append("  Generated by Oakwell — Revenue Intelligence Platform")
    lines.append("=" * 64)

    return "\n".join(lines)


def generate_executive_summary(
    deal_results: Dict[str, Any],
    memory_data: Optional[Dict[str, Any]] = None,
) -> str:
    """Generate a boardroom-ready Executive Summary in Markdown.

    Includes:
    - Deal health headline with risk level
    - Trend analysis from score history / timeline
    - Key clashes with strategic interpretation
    - Visual proof references
    - Market drift alerts
    - Strategic verdict with recommended next action
    """
    sections: List[str] = []

    # ── Header ──
    score = deal_results.get("deal_health_score", 0)
    risk = "LOW" if score >= 70 else ("MEDIUM" if score >= 40 else "HIGH")
    sections.append("# Oakwell — Executive Intelligence Brief")
    sections.append("")
    sections.append(f"## Deal Health: {score}/100  —  Risk Level: **{risk}**")
    sections.append("")

    # Deal context (P0 fields)
    _stage = deal_results.get("deal_stage")
    _value = deal_results.get("deal_value")
    _risk_level = deal_results.get("risk_level", "")
    _reasoning = deal_results.get("score_reasoning", "")
    _stage_adj = deal_results.get("stage_adjustment", "")
    _wp = deal_results.get("winning_patterns_summary", {})
    if _stage or _value or _risk_level:
        context_parts: List[str] = []
        if _stage:
            context_parts.append(f"**Stage:** {_stage.upper()}")
        if _value:
            context_parts.append(f"**Value:** ${_value:,.0f}")
        if _risk_level:
            context_parts.append(f"**Risk:** {_risk_level.upper()}")
        sections.append(" | ".join(context_parts))
        sections.append("")
    if _reasoning:
        sections.append(f"> Score reasoning: {_reasoning}")
        sections.append("")
    if _stage_adj:
        sections.append(f"> Stage adjustment: {_stage_adj}")
        sections.append("")
    if _wp and _wp.get("total_outcomes", 0) > 0:
        sections.append(
            f"**Win/Loss Intelligence:** {_wp.get('win_rate', 0):.0%} win rate "
            f"across {_wp.get('total_outcomes', 0)} historical deals "
            f"(avg winning score: {_wp.get('avg_winning_score', 0):.0f})"
        )
        sections.append("")

    cached = deal_results.get("cached", False)
    if cached:
        sections.append("_Smart-cached analysis — visual proof reused from a recent run._")
        sections.append("")

    # ── Trend Analysis ──
    scores = deal_results.get("score_history", [])
    timeline = deal_results.get("timeline", [])
    trend_text = deal_results.get("trend", "")
    if scores or timeline or trend_text:
        sections.append("## Trend Analysis")
        sections.append("")
        if scores:
            trend_arrow = " → ".join(str(s) for s in scores)
            sections.append(f"**Score History:** {trend_arrow}")
            sections.append("")
        if trend_text:
            sections.append(f"> {trend_text}")
            sections.append("")
        if timeline:
            sections.append("| Date | Score | Top Issue |")
            sections.append("|------|-------|-----------|")
            for entry in timeline[-5:]:  # last 5 entries
                ts_raw = entry.get("ts", "")
                ts_display = ts_raw[:16].replace("T", " ") if ts_raw else "—"
                entry_score = entry.get("score", "—")
                clash = entry.get("top_clash", "—") or "—"
                sections.append(f"| {ts_display} | {entry_score} | {clash[:60]} |")
            sections.append("")

    # ── Memory context (prior intelligence) ──
    if memory_data:
        analysis_count = memory_data.get("analysis_count", 0)
        if analysis_count > 1:
            sections.append(f"_This is analysis #{analysis_count} for this competitor. Historical intelligence is reflected above._")
            sections.append("")

    # ── Clashes ──
    clashes = deal_results.get("clashes_detected", [])
    sections.append("## Key Clashes")
    sections.append("")
    if clashes:
        for i, c in enumerate(clashes, 1):
            claim = c.get("claim", "—") if isinstance(c, dict) else str(c)
            risk_text = c.get("risk", "") if isinstance(c, dict) else ""
            conf = c.get("confidence_score", "") if isinstance(c, dict) else ""
            conf_str = ""
            if isinstance(conf, (int, float)):
                conf_str = f" (confidence: {float(conf):.0%})" if conf <= 1.0 else f" (confidence: {conf})"
            sections.append(f"{i}. **{claim}**")
            if risk_text:
                sections.append(f"   - Risk: {risk_text}")
            if conf_str:
                sections.append(f"   - {conf_str}")
        sections.append("")
    else:
        sections.append("No clashes detected — buyer claims aligned with visual proof.")
        sections.append("")

    # ── Visual Proof ──
    proof = deal_results.get("proof_artifact_path", "")
    all_proofs = deal_results.get("all_proof_filenames", [])
    if proof or all_proofs:
        sections.append("## Visual Proof Artifacts")
        sections.append("")
        if proof:
            sections.append(f"- **Primary screenshot:** `{proof}`")
        if all_proofs:
            sections.append(f"- All captures: {', '.join(f'`{p}`' for p in all_proofs)}")
        sections.append("")

    # ── Market Drift ──
    drift = deal_results.get("market_drift")
    if drift and drift.get("drift_detected"):
        sections.append("## ⚠ Market Drift Alerts")
        sections.append("")
        for alert in drift.get("alerts", []):
            sections.append(f"- **{alert}**")
        sections.append("")

    # ── Talk Track (abbreviated) ──
    talk = deal_results.get("talk_track", "")
    if talk:
        sections.append("## Adversarial Talk-Track (Summary)")
        sections.append("")
        # Show first 500 chars as a taste
        preview = talk[:500].replace("*", "").replace("_", "")
        if len(talk) > 500:
            preview += "…"
        sections.append(preview)
        sections.append("")

    # ── Strategic Verdict ──
    sections.append("## Strategic Verdict")
    sections.append("")
    if score >= 70:
        verdict = (
            "The deal is in a **strong position**. Buyer claims are largely consistent with market reality. "
            "Push for close by reinforcing our verified strengths and referencing the visual proof."
        )
    elif score >= 40:
        verdict = (
            "The deal is at **moderate risk**. Several buyer or competitor claims do not match market truth. "
            "Use the attached screenshots to challenge misleading claims and re-anchor the conversation around verified facts."
        )
    else:
        verdict = (
            "**Critical risk.** Multiple clashes detected between competitor claims and market reality. "
            "This is a high-value opportunity: use the visual proof aggressively to reframe the deal. "
            "Recommend an urgent strategy call with the account executive."
        )
    sections.append(verdict)
    sections.append("")

    # Append trend verdict if available
    if trend_text:
        sections.append(f"**Market Pulse:** {trend_text}")
        sections.append("")

    # Stage-specific pivot points & actions
    _pivots = deal_results.get("key_pivot_points", [])
    _actions = deal_results.get("stage_specific_actions", [])
    if _pivots or _actions:
        sections.append("## Stage-Adaptive Playbook")
        sections.append("")
        if _pivots:
            sections.append("**Key Pivot Points:**")
            for i, pp in enumerate(_pivots[:5], 1):
                sections.append(f"{i}. {pp}")
            sections.append("")
        if _actions:
            sections.append("**Stage-Specific Actions:**")
            for i, sa in enumerate(_actions[:5], 1):
                sections.append(f"{i}. {sa}")
            sections.append("")

    sections.append("---")
    sections.append("_Generated by Oakwell — Revenue Intelligence Platform_")

    return "\n".join(sections)


# ---------------------------------------------------------------------------
# Deep Market Search — Reddit, G2, X (Twitter) intelligence gathering
# ---------------------------------------------------------------------------

async def deep_market_search(
    competitor_name: str,
    competitor_url: Optional[str] = None,
    api_key: Optional[str] = None,
) -> Dict[str, Any]:
    """Search Reddit, G2, X, SEC filings, Glassdoor/Blind, and Greenhouse
    for unfiltered competitor weaknesses and build an Executive Threat Matrix.

    Phase 1 — Social Sentiment:
      - Reddit, G2, X/Twitter for complaints, outages, feature frustrations.
    Phase 2 — Enterprise Intelligence:
      - SEC.gov / EDGAR for 10-Q/10-K financial risk signals (margin
        compression, revenue slowdown, restructuring charges).
      - Glassdoor / Blind for employee leaks (tech debt, morale, attrition).
      - Greenhouse / LinkedIn job boards for hiring surges that signal churn.

    Returns dict with original sentiment fields PLUS:
      executive_threat_matrix: {
        sec_financial_risks: [...],
        employee_leaks: [...],
        hiring_signals: [...],
        threat_level: "critical|high|medium|low",
        rep_talk_tracks: [...]
      }
    """
    # Build site-scoped search queries
    domain_hint = ""
    if competitor_url:
        domain_hint = competitor_url.replace("https://", "").replace("http://", "").strip("/")

    # ── Phase 1: Social Sentiment (existing) ──
    search_configs: List[Dict[str, str]] = [
        {
            "label": "Reddit",
            "query": f"site:reddit.com {competitor_name} complaint OR outage OR bug OR issue OR frustration",
            "url": f"https://www.google.com/search?q=site%3Areddit.com+{competitor_name.replace(' ', '+')}+complaint+OR+outage+OR+bug+OR+issue&num=10",
        },
        {
            "label": "G2",
            "query": f"site:g2.com {competitor_name} review cons OR disadvantage OR problem OR limitation",
            "url": f"https://www.google.com/search?q=site%3Ag2.com+{competitor_name.replace(' ', '+')}+review+cons+OR+disadvantage+OR+problem&num=10",
        },
        {
            "label": "X (Twitter)",
            "query": f"site:twitter.com OR site:x.com {competitor_name} down OR broken OR outage OR hate OR worst OR bug",
            "url": f"https://www.google.com/search?q=site%3Atwitter.com+OR+site%3Ax.com+{competitor_name.replace(' ', '+')}+down+OR+broken+OR+outage+OR+bug&num=10",
        },
    ]

    # ── Phase 2: Enterprise Intelligence (new) ──
    enterprise_configs: List[Dict[str, str]] = [
        {
            "label": "SEC Filings (EDGAR)",
            "query": f"site:sec.gov {competitor_name} 10-Q OR 10-K margin compression OR revenue decline OR restructuring OR risk factor",
            "url": (
                f"https://www.google.com/search?q=site%3Asec.gov+"
                f"{competitor_name.replace(' ', '+')}+"
                "10-Q+OR+10-K+margin+compression+OR+revenue+decline+OR+restructuring+OR+risk+factor&num=10"
            ),
        },
        {
            "label": "Glassdoor / Blind (Employee Leaks)",
            "query": f"site:glassdoor.com OR site:teamblind.com {competitor_name} tech debt OR codebase OR engineering OR morale OR layoff OR attrition",
            "url": (
                f"https://www.google.com/search?q="
                f"site%3Aglassdoor.com+OR+site%3Ateamblind.com+"
                f"{competitor_name.replace(' ', '+')}+"
                "tech+debt+OR+codebase+OR+engineering+OR+morale+OR+layoff+OR+attrition&num=10"
            ),
        },
        {
            "label": "Greenhouse / LinkedIn (Hiring Signals)",
            "query": f"site:boards.greenhouse.io OR site:linkedin.com/jobs {competitor_name} customer success OR account manager OR support engineer",
            "url": (
                f"https://www.google.com/search?q="
                f"site%3Aboards.greenhouse.io+OR+site%3Alinkedin.com%2Fjobs+"
                f"{competitor_name.replace(' ', '+')}+"
                "customer+success+OR+account+manager+OR+support+engineer&num=10"
            ),
        },
    ]

    all_configs = search_configs + enterprise_configs

    # Semaphore(1) — serialize Google scrapes so we never fire 3 requests
    # at once. Google and Gemini both return 429 if hit in parallel.
    _deep_search_sem = asyncio.Semaphore(1)

    async def _scrape_search_results(config: Dict[str, str]) -> Dict[str, Any]:
        """Scrape a single Google search results page and return raw text.

        Guarded by _deep_search_sem so only ONE browser hits Google at a time,
        with a random stagger delay between requests to avoid 429.
        """
        async with _deep_search_sem:
            # Stagger: wait 2-4 s between requests to look human
            await asyncio.sleep(random.uniform(2.0, 4.0))
            try:
                async with async_playwright() as p:
                    browser = await p.chromium.launch(headless=True)
                    USER_AGENT = (
                        "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6) "
                        "AppleWebKit/537.36 (KHTML, like Gecko) "
                        "Chrome/119.0.0.0 Safari/537.36"
                    )
                    context = await browser.new_context(
                        user_agent=USER_AGENT,
                        locale="en-US",
                        extra_http_headers={
                            "Accept-Language": "en-US,en;q=0.9",
                            "Referer": "https://www.google.com/",
                        },
                    )
                    page = await context.new_page()
                    await page.add_init_script("""
Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
window.chrome = {runtime: {}};
Object.defineProperty(navigator, 'languages', {get: () => ['en-US', 'en']});
Object.defineProperty(navigator, 'plugins', {get: () => [1, 2, 3, 4, 5]});
""")
                    await page.goto(
                        config["url"],
                        wait_until="domcontentloaded",
                        timeout=30000,
                        referer="https://www.google.com/",
                    )
                    # Small human-like delay after page load
                    await asyncio.sleep(random.uniform(1.5, 3.0))
                    html = await page.content()
                    await context.close()
                    await browser.close()

                # Convert to Markdown for LLM consumption
                text = md(
                    html,
                    heading_style="ATX",
                    strip=["script", "style", "nav", "footer", "noscript"],
                    escape_asterisks=False,
                    escape_underscores=False,
                )
                # Trim to avoid context-window bloat
                text = text[:8000]
                return {"label": config["label"], "status": "success", "text": text}
            except Exception as exc:
                logger.warning("deep_market_search scrape failed for %s: %s", config["label"], exc)
                return {"label": config["label"], "status": "error", "text": str(exc)}

    # ── Scrape ALL sources sequentially through semaphore ──
    logger.info(
        "Deep Market Search: querying %d sources for '%s' (serialised)…",
        len(all_configs), competitor_name,
    )
    raw_results = await asyncio.gather(
        *[_scrape_search_results(cfg) for cfg in all_configs],
        return_exceptions=True,
    )

    # Collect successful scrapes — split Phase 1 vs Phase 2
    phase1_labels = {c["label"] for c in search_configs}
    phase2_labels = {c["label"] for c in enterprise_configs}

    phase1_texts: List[str] = []
    phase2_texts: List[str] = []
    sources_scraped: List[str] = []
    for res in raw_results:
        if isinstance(res, Exception):
            logger.warning("deep_market_search gather exception: %s", res)
            continue
        if res.get("status") == "success" and res.get("text"):
            entry = f"### Source: {res['label']}\n{res['text']}"
            sources_scraped.append(res["label"])
            if res["label"] in phase1_labels:
                phase1_texts.append(entry)
            else:
                phase2_texts.append(entry)

    if not phase1_texts and not phase2_texts:
        # ── FALLBACK: Gemini Grounded Search when all scrapes fail ──
        logger.warning("All %d scrapes failed for '%s' — falling back to Gemini Grounded Search", len(all_configs), competitor_name)
        try:
            from google.genai import types as _gtypes
            _fb_client = create_genai_client(api_key)
            _fb_prompt = (
                f"Search the internet for recent complaints, outages, negative reviews, "
                f"and user frustrations about {competitor_name}. "
                f"Focus on Reddit, G2, Twitter/X, and tech forums from the last 6 months.\n\n"
                f"Return ONLY valid JSON with this schema:\n"
                f'{{"recent_complaints": [{{"source": "...", "summary": "...", "severity": "high|medium|low"}}], '
                f'"outages": [{{"source": "...", "summary": "..."}}], '
                f'"feature_frustrations": [{{"source": "...", "feature": "...", "complaint": "..."}}], '
                f'"overall_sentiment": "positive|mixed|negative", '
                f'"killer_insight": "single most damaging finding"}}'
            )
            _fb_response = None
            for _fb_attempt in range(2):
                try:
                    _fb_response = await _fb_client.aio.models.generate_content(
                        model=FAST_MODEL,
                        contents=_fb_prompt,
                        config=_gtypes.GenerateContentConfig(
                            tools=[_gtypes.Tool(google_search=_gtypes.GoogleSearch())],
                        ),
                    )
                    break
                except Exception as _fb_e:
                    if _fb_attempt == 0:
                        await asyncio.sleep(3)
                        continue
                    raise

            _fb_text = (_fb_response.text or "").strip() if _fb_response else ""
            _fb_s, _fb_e = _fb_text.find("{"), _fb_text.rfind("}")
            if _fb_s != -1 and _fb_e != -1:
                _fb_findings = json.loads(_fb_text[_fb_s : _fb_e + 1])
                logger.info("Gemini Grounded Search fallback succeeded for '%s'", competitor_name)

                ts = datetime.now().strftime("%Y%m%d_%H%M%S")
                report_name = f"deep_search_{competitor_name.replace(' ', '_')}_{ts}_fallback.json"
                report_path = OUTPUTS_DIR / report_name
                report_path.write_text(json.dumps(_fb_findings, indent=2, default=str), encoding="utf-8")

                return {
                    "status": "success",
                    "competitor": competitor_name,
                    "sources_scraped": ["Gemini Grounded Search (fallback)"],
                    "recent_complaints": _fb_findings.get("recent_complaints", []),
                    "outages": _fb_findings.get("outages", []),
                    "feature_frustrations": _fb_findings.get("feature_frustrations", []),
                    "overall_sentiment": _fb_findings.get("overall_sentiment", "unknown"),
                    "killer_insight": _fb_findings.get("killer_insight", ""),
                    "executive_threat_matrix": None,
                    "report_artifact": report_name,
                }
        except Exception as fb_exc:
            logger.error("Gemini Grounded Search fallback also failed: %s", fb_exc)

        return {
            "status": "no_data",
            "competitor": competitor_name,
            "message": "All source scrapes failed — no unfiltered intelligence available.",
            "recent_complaints": [],
            "outages": [],
            "feature_frustrations": [],
            "executive_threat_matrix": None,
        }

    source_texts = phase1_texts  # keep compat with existing prompt below

    # ── Phase 1 LLM extraction: Social Sentiment (Gemini 2.0 Flash) ──
    combined = "\n\n".join(source_texts)[:20000]  # cap total input size

    extraction_prompt = f"""You are a competitive intelligence analyst. Below are raw search results from Reddit, G2 reviews, and X/Twitter about the competitor "{competitor_name}".

Analyze the raw data and extract THREE categories of real, unfiltered market intelligence.

RAW DATA:
---
{combined}
---

Return ONLY valid JSON with this exact schema:
{{
  "recent_complaints": [
    {{"source": "Reddit|G2|X", "summary": "one-sentence description", "severity": "high|medium|low", "date_hint": "approximate date if visible"}}
  ],
  "outages": [
    {{"source": "Reddit|G2|X", "summary": "one-sentence description", "date_hint": "approximate date if visible"}}
  ],
  "feature_frustrations": [
    {{"source": "Reddit|G2|X", "feature": "feature name", "complaint": "what users hate about it", "frequency": "how common this complaint appears"}}
  ],
  "overall_sentiment": "positive|mixed|negative",
  "killer_insight": "The single most damaging finding a sales rep could weaponize"
}}

RULES:
- Only include REAL findings backed by data in the raw text. Do NOT fabricate.
- If a category has no findings, return an empty array for it.
- Keep summaries concise (1-2 sentences max).
- Prioritise RECENT complaints over old ones.
- "killer_insight" should be the strongest competitive ammunition found."""

    try:
        client = create_genai_client(api_key)
        response = None
        for attempt in range(3):
            try:
                response = await client.aio.models.generate_content(
                    model=FAST_MODEL,
                    contents=extraction_prompt,
                )
                break
            except Exception as e:
                err = str(e)
                if ("503" in err or "429" in err) and attempt < 2:
                    wait = min(2 ** (attempt + 1) + 2, 10)
                    logger.warning("deep_market_search LLM retry %d/3 in %ds: %s", attempt + 1, wait, err[:120])
                    await asyncio.sleep(wait)
                    continue
                raise

        text = (response.text or "").strip() if response else ""
        start, end = text.find("{"), text.rfind("}")
        if start != -1 and end != -1:
            findings = json.loads(text[start : end + 1])
        else:
            findings = {
                "recent_complaints": [],
                "outages": [],
                "feature_frustrations": [],
                "overall_sentiment": "unknown",
                "killer_insight": "Could not parse LLM response.",
            }

        # ── Phase 2 LLM extraction: Executive Threat Matrix ──
        threat_matrix: Optional[Dict[str, Any]] = None
        if phase2_texts:
            p2_combined = "\n\n".join(phase2_texts)[:20000]
            threat_prompt = f"""You are a *senior* competitive intelligence analyst producing an Executive Threat Matrix.

Below are raw search results from SEC filings (EDGAR 10-Q/10-K), Glassdoor/Blind employee forums, and Greenhouse/LinkedIn job boards about "{competitor_name}".

RAW DATA:
---
{p2_combined}
---

Return ONLY valid JSON with this exact schema:
{{
  "sec_financial_risks": [
    {{"signal": "one-line finding from the filing", "implication": "what this means for the prospect", "rep_action": "how a sales rep should use this"}}
  ],
  "employee_leaks": [
    {{"source": "Glassdoor|Blind", "signal": "one-line finding", "implication": "what this reveals about the product", "rep_talking_point": "how to reference this in a deal"}}
  ],
  "hiring_signals": [
    {{"signal": "job title or hiring surge", "churn_indicator": "what it implies about customer retention", "rep_action": "how to weaponize this signal"}}
  ],
  "threat_level": "critical|high|medium|low",
  "rep_talk_tracks": [
    "ready-to-use talk track sentence #1",
    "ready-to-use talk track sentence #2",
    "ready-to-use talk track sentence #3"
  ]
}}

RULES:
- Only include REAL findings backed by data in the raw text. Do NOT fabricate.
- If a category has no findings, return an empty array.
- "threat_level" is based on the overall severity: critical = imminent financial/product risk; low = no material signals.
- "rep_talk_tracks" are concise sentences a sales rep can drop into a live call."""

            try:
                p2_response = None
                for attempt in range(3):
                    try:
                        p2_response = await client.aio.models.generate_content(
                            model=FAST_MODEL,
                            contents=threat_prompt,
                        )
                        break
                    except Exception as e:
                        err2 = str(e)
                        if ("503" in err2 or "429" in err2) and attempt < 2:
                            wait2 = min(2 ** (attempt + 1) + 2, 10)
                            logger.warning("Executive Threat Matrix LLM retry %d/3 in %ds: %s", attempt + 1, wait2, err2[:120])
                            await asyncio.sleep(wait2)
                            continue
                        raise

                p2_text = (p2_response.text or "").strip() if p2_response else ""
                s2, e2 = p2_text.find("{"), p2_text.rfind("}")
                if s2 != -1 and e2 != -1:
                    threat_matrix = json.loads(p2_text[s2 : e2 + 1])
                else:
                    threat_matrix = {
                        "sec_financial_risks": [],
                        "employee_leaks": [],
                        "hiring_signals": [],
                        "threat_level": "unknown",
                        "rep_talk_tracks": ["Could not parse threat matrix response."],
                    }
                logger.info("Executive Threat Matrix extracted (threat_level=%s)", threat_matrix.get("threat_level", "?"))
            except Exception as p2_exc:
                logger.error("Executive Threat Matrix extraction failed: %s", p2_exc)
                threat_matrix = None

        # Save raw findings to disk for audit trail
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_name = f"deep_search_{competitor_name.replace(' ', '_')}_{ts}.json"
        report_path = OUTPUTS_DIR / report_name
        full_report = {**findings, "executive_threat_matrix": threat_matrix}
        report_path.write_text(json.dumps(full_report, indent=2, default=str), encoding="utf-8")
        logger.info("Deep Market Search report saved: %s", report_name)

        return {
            "status": "success",
            "competitor": competitor_name,
            "sources_scraped": sources_scraped,
            "recent_complaints": findings.get("recent_complaints", []),
            "outages": findings.get("outages", []),
            "feature_frustrations": findings.get("feature_frustrations", []),
            "overall_sentiment": findings.get("overall_sentiment", "unknown"),
            "killer_insight": findings.get("killer_insight", ""),
            "executive_threat_matrix": threat_matrix,
            "report_artifact": report_name,
        }
    except Exception as exc:
        logger.error("deep_market_search LLM extraction failed: %s", exc)
        return {
            "status": "error",
            "competitor": competitor_name,
            "message": str(exc),
            "recent_complaints": [],
            "outages": [],
            "feature_frustrations": [],
            "executive_threat_matrix": None,
        }


# ---------------------------------------------------------------------------
# Slack Webhook — Oakwell Sentinel Alert
# ---------------------------------------------------------------------------

OAKWELL_LOGO_URL = "https://oakwell.ai/logo.png"


def send_slack_alert(
    message_data: Dict[str, Any],
    webhook_url: str,
) -> Dict[str, Any]:
    """Send a rich Slack alert via incoming webhook using Block Kit.

    Args:
        message_data: Dict containing any of:
            - competitor_name (str): Competitor being analysed.
            - deal_health_score (int): 0-100 score.
            - talk_track (str): Adversarial kill-shot talk-track.
            - proof_artifact_path (str): Filename of the proof screenshot.
            - adversarial_critique (dict): Critic verdict + counter-attacks.
            - deep_sentiment (dict): Reddit/G2/X findings.
            - clashes_detected (list): Disproven buyer claims.
            - killer_insight (str): Single most weaponisable insight.
        webhook_url: Slack incoming webhook URL
            (e.g. https://hooks.slack.com/services/T.../B.../...).

    Returns:
        dict with status, status_code, and optional error.
    """
    import requests as _requests  # local import — avoid module-level dep

    if not webhook_url or not webhook_url.startswith("https://hooks.slack.com/"):
        return {"status": "error", "error": "Invalid or missing Slack webhook URL."}

    # ── Extract fields safely ──
    competitor   = message_data.get("competitor_name") or message_data.get("competitor_url") or "Unknown"
    score        = message_data.get("deal_health_score", "—")
    talk_track   = message_data.get("talk_track") or ""
    proof_file   = message_data.get("proof_artifact_path") or ""
    critique     = message_data.get("adversarial_critique") or {}
    sentiment    = message_data.get("deep_sentiment") or {}
    clashes      = message_data.get("clashes_detected") or []
    killer       = (
        message_data.get("killer_insight")
        or sentiment.get("killer_insight")
        or ""
    )

    # Score colour emoji
    score_emoji = "🟢" if isinstance(score, int) and score > 70 else "🔴" if isinstance(score, int) and score < 40 else "🟡"

    # Adversarial verdict
    verdict      = critique.get("verdict", "")
    verdict_line = ""
    if verdict:
        v_icon = "🚨" if "REJECTED" in verdict.upper() else "⚠️" if "HARDENING" in verdict.upper() else "✅"
        verdict_line = f"{v_icon}  *Adversarial Verdict:* {verdict}"

    # Clashes summary (top 3)
    clash_lines = ""
    if clashes:
        items = []
        for c in clashes[:3]:
            claim = c.get("claim", "—")
            risk  = c.get("risk", "—")
            items.append(f"• _{claim}_ — {risk}")
        clash_lines = "\n".join(items)

    # Deep sentiment one-liner
    sent_overall = sentiment.get("overall_sentiment", "")
    sent_line = f"*Community Sentiment:* {sent_overall}" if sent_overall else ""

    # ── Build Slack Block Kit payload ──
    blocks: List[Dict[str, Any]] = []

    # Header
    blocks.append({
        "type": "header",
        "text": {"type": "plain_text", "text": "🚨 OAKWELL REVENUE SIGNAL", "emoji": True},
    })

    # Competitor + Score
    blocks.append({
        "type": "section",
        "fields": [
            {"type": "mrkdwn", "text": f"*Competitor:*\n{competitor}"},
            {"type": "mrkdwn", "text": f"*Deal Health:*\n{score_emoji} {score}/100"},
        ],
    })

    # Adversarial Verdict (if available)
    if verdict_line:
        blocks.append({"type": "section", "text": {"type": "mrkdwn", "text": verdict_line}})

    # Divider
    blocks.append({"type": "divider"})

    # Kill-Shot Talk Track (truncate to Slack's 3000-char block limit)
    if talk_track:
        truncated = talk_track[:2900] + ("…" if len(talk_track) > 2900 else "")
        blocks.append({
            "type": "section",
            "text": {"type": "mrkdwn", "text": f"*🎯 Kill-Shot Talk Track*\n{truncated}"},
        })

    # Visual Proof
    if proof_file:
        blocks.append({"type": "divider"})
        blocks.append({
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": f"*📸 Visual Proof*\nScreenshot captured: `{proof_file}`\n_Attached to the War Room — open Oakwell dashboard to view._",
            },
        })

    # Clashes
    if clash_lines:
        blocks.append({"type": "divider"})
        blocks.append({
            "type": "section",
            "text": {"type": "mrkdwn", "text": f"*⚡ Disproven Buyer Claims*\n{clash_lines}"},
        })

    # Deep Sentiment
    if sent_line or killer:
        blocks.append({"type": "divider"})
        parts = []
        if sent_line:
            parts.append(sent_line)
        if killer:
            parts.append(f"*💡 Killer Insight:* {killer[:500]}")
        blocks.append({
            "type": "section",
            "text": {"type": "mrkdwn", "text": "*🌐 Unfiltered Market Voice*\n" + "\n".join(parts)},
        })

    # Footer / context
    ts_now = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    blocks.append({
        "type": "context",
        "elements": [
            {"type": "mrkdwn", "text": f"Oakwell Sentinel • {ts_now} • <https://oakwell.ai|Dashboard>"},
        ],
    })

    payload: Dict[str, Any] = {
        "username": "Oakwell Sentinel",
        "icon_url": OAKWELL_LOGO_URL,
        "blocks": blocks,
        # Fallback text for notifications / older clients
        "text": f"🚨 Revenue Signal — {competitor} — Score {score}/100",
    }

    try:
        resp = _requests.post(webhook_url, json=payload, timeout=10)
        if resp.status_code == 200 and resp.text == "ok":
            return {"status": "sent", "status_code": 200}
        return {
            "status": "error",
            "status_code": resp.status_code,
            "error": resp.text[:500],
        }
    except _requests.RequestException as exc:
        return {"status": "error", "error": str(exc)}


# ---------------------------------------------------------------------------
# Live Snippet Processor — real-time meeting intelligence backbone
# ---------------------------------------------------------------------------

async def process_live_snippet(
    snippet: str,
    competitor_url: Optional[str] = None,
    api_key: Optional[str] = None,
) -> Dict[str, Any]:
    """Analyse a short live-transcription snippet for competitor mentions or pricing claims.

    Uses gemini-2.0-flash for sub-second classification.  When an actionable
    claim is detected AND a competitor_url is provided, autonomously fires
    verify_claim_with_vision to capture visual proof in real-time.

    Args:
        snippet: A short text chunk from a live transcription (typically 1-5 sentences).
        competitor_url: Optional competitor page URL for autonomous verification.
        api_key: Optional Gemini API key override.

    Returns:
        dict with: status, detected_claims (list), competitor_mentions (list),
        pricing_claims (list), verification_results (list, if auto-triggered).
    """
    if not snippet or not snippet.strip():
        return {"status": "skipped", "reason": "empty snippet"}

    # ── Step 1: Fast classification via gemini-2.0-flash ──
    classification_prompt = f"""You are a real-time sales call analyst. Analyse this live transcription snippet
and extract two things:

1. **Competitor Mentions** — any named competitor product or company (e.g. "HubSpot",
   "Salesforce", "Gong", "Clari", "ZoomInfo").
2. **Pricing Claims** — any statement about pricing, cost, discounts, packages, tiers,
   or contractual terms (e.g. "they charge $50/seat", "their enterprise plan includes…",
   "they offered us 30% off").

SNIPPET:
\"\"\"{snippet[:3000]}\"\"\"

Respond with ONLY valid JSON (no markdown fences):
{{
  "competitor_mentions": ["CompanyA", "CompanyB"],
  "pricing_claims": [
    {{"claim": "exact quote or paraphrase", "competitor": "CompanyName", "confidence": 0.0}}
  ],
  "has_actionable_claim": true
}}

If nothing is found, return empty arrays and has_actionable_claim: false."""

    try:
        client = create_genai_client(api_key)
        response = client.models.generate_content(
            model=FAST_MODEL,
            contents=classification_prompt,
        )
        text = (response.text or "").strip()
        start, end = text.find("{"), text.rfind("}")
        if start == -1 or end == -1:
            return {
                "status": "error",
                "reason": "Failed to parse classification response",
                "raw": text[:500],
            }
        classification = json.loads(text[start : end + 1])
    except Exception as exc:
        logger.error("process_live_snippet classification failed: %s", exc)
        return {"status": "error", "reason": str(exc)}

    competitor_mentions: List[str] = classification.get("competitor_mentions", [])
    pricing_claims: List[Dict[str, Any]] = classification.get("pricing_claims", [])
    has_actionable = classification.get("has_actionable_claim", False)

    result: Dict[str, Any] = {
        "status": "analysed",
        "snippet_length": len(snippet),
        "competitor_mentions": competitor_mentions,
        "pricing_claims": pricing_claims,
        "has_actionable_claim": has_actionable,
        "verification_results": [],
    }

    # ── Step 2: Autonomous verification if we have claims + a URL ──
    if has_actionable and pricing_claims and competitor_url:
        logger.info(
            "process_live_snippet: %d pricing claims detected — triggering autonomous verification against %s",
            len(pricing_claims),
            competitor_url,
        )
        for pc in pricing_claims[:3]:  # cap at 3 to stay fast
            claim_text = pc.get("claim", "")
            if not claim_text:
                continue
            try:
                vr = await verify_claim_with_vision(
                    url=competitor_url,
                    claim=claim_text,
                    tool_context=None,
                    api_key=api_key,
                )
                result["verification_results"].append({
                    "claim": claim_text,
                    "verification": vr,
                })
            except Exception as vr_exc:
                logger.warning("process_live_snippet: verification failed for '%s': %s", claim_text[:60], vr_exc)
                result["verification_results"].append({
                    "claim": claim_text,
                    "verification": {"status": "error", "error": str(vr_exc)},
                })

    return result
