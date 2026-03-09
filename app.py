"""
Revenue Intelligence Platform — Streamlit dashboard.
Client for the FastAPI backend at http://localhost:8000.
"""

import json
import os
import sys
import time
from pathlib import Path
from typing import Optional, List, Union, Dict, Any

import requests
import streamlit as st

# Allow importing tools.py from the same directory
sys.path.insert(0, str(Path(__file__).parent))
import tools as oakwell_tools

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

API_BASE = "http://localhost:8000"
POLL_INTERVAL = 2


def _headers(api_key: Optional[str]) -> Dict[str, str]:
    out: Dict[str, str] = {"Content-Type": "application/json"}
    if api_key and api_key.strip():
        out["X-Google-API-Key"] = api_key.strip()
    return out


def _api_online() -> bool:
    """Check API health once per Streamlit render cycle (cached in session_state)."""
    # Avoid calling /health twice per page render — the War Room Pulse
    # /memory call can saturate the server while Firestore warms up.
    if "_api_online_cache" in st.session_state:
        return st.session_state["_api_online_cache"]
    try:
        r = requests.get(f"{API_BASE}/health", timeout=8)
        alive = r.status_code == 200
    except Exception:
        alive = False
    st.session_state["_api_online_cache"] = alive
    return alive


# Clear the one-shot cache at the TOP of every render so the very first
# call to _api_online() always makes a fresh request.
if "_api_online_cache" in st.session_state:
    del st.session_state["_api_online_cache"]

if "job_id" not in st.session_state:
    st.session_state["job_id"] = None
if "analysis_result" not in st.session_state:
    st.session_state["analysis_result"] = None
if "deal_result" not in st.session_state:
    st.session_state["deal_result"] = None
if "email_draft" not in st.session_state:
    st.session_state["email_draft"] = None
if "live_listening" not in st.session_state:
    st.session_state["live_listening"] = False
if "live_flashcards" not in st.session_state:
    st.session_state["live_flashcards"] = []
if "live_feed" not in st.session_state:
    st.session_state["live_feed"] = []


# ---------------------------------------------------------------------------
# Page config: wide mode, dark theme
# ---------------------------------------------------------------------------

st.set_page_config(
    page_title="Revenue Intelligence — Oakwell",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Note: removed custom CSS to avoid letter-spacing / word-wrap issues.

# ---------------------------------------------------------------------------
# Sidebar: Google API Key
# ---------------------------------------------------------------------------

with st.sidebar:
    st.header("⚙️ Settings")
    api_key = st.text_input(
        "Google API Key",
        type="password",
        placeholder="Paste key (sent to backend)",
        help="Optional. Passed to the backend for Gemini/Playwright.",
    )
    if st.button("🗑️ Clear War Room", use_container_width=True):
        st.session_state.clear()
        st.rerun()
    st.divider()
    st.info("💡 **Oakwell Demo Tip**: Testing against HubSpot is recommended to demonstrate real-time stealth verification.")
    st.divider()

    # ── 🔔 Slack Sentinel Setup ──
    st.subheader("🔔 Slack Sentinel")
    slack_url = st.text_input(
        "Slack Webhook URL",
        value=st.session_state.get("slack_webhook_url", ""),
        type="password",
        placeholder="https://hooks.slack.com/services/T…/B…/…",
        help="Incoming webhook URL for the channel Oakwell should guard.",
    )
    if slack_url != st.session_state.get("slack_webhook_url", ""):
        st.session_state["slack_webhook_url"] = slack_url

    if st.button("🔔 Test Sentinel", use_container_width=True, key="test_slack"):
        _test_url = st.session_state.get("slack_webhook_url", "")
        if not _test_url:
            st.warning("Paste a Slack webhook URL first.")
        else:
            _test_payload = {
                "competitor_name": "HubSpot (Test Alert)",
                "deal_health_score": 32,
                "talk_track": "This is a test alert from Oakwell Sentinel. If you see this in Slack, Oakwell is connected and guarding your deals.",
                "proof_artifact_path": "proof_test_sentinel.png",
                "adversarial_critique": {"verdict": "NEEDS HARDENING"},
                "deep_sentiment": {"overall_sentiment": "Mixed", "killer_insight": "Sentinel connectivity verified."},
                "clashes_detected": [{"claim": "Test claim", "risk": "Market Drift Simulation"}],
            }
            _test_result = oakwell_tools.send_slack_alert(_test_payload, _test_url)
            if _test_result.get("status") == "sent":
                st.success("✅ Sentinel connected — check your Slack channel!")
            else:
                st.error(f"Slack error: {_test_result.get('error', 'Unknown')}")

    if st.session_state.get("slack_webhook_url"):
        st.caption("🟢 Sentinel active — critical alerts auto-fire to Slack")
    else:
        st.caption("🔴 No webhook — alerts go to dashboard only")

    st.divider()
    if _api_online():
        st.success("Backend online")
    else:
        st.error("System offline — start the API with: uvicorn main:app --reload")

    # ------------------------------------------------------------------
    # Live War Room Pulse — Bloomberg-style ticker from Firestore deals
    # ------------------------------------------------------------------
    st.divider()
    st.markdown(
        '<p style="color:#00ff88; font-family:monospace; font-size:0.75rem; '
        'letter-spacing:0.08em; margin-bottom:2px;">▸ LIVE WAR ROOM PULSE</p>',
        unsafe_allow_html=True,
    )

    # ── Real-time reasoning ticker — shows what Oakwell is doing NOW ──
    _active_job = st.session_state.get("job_id")
    if _active_job:
        try:
            _status_resp = requests.get(f"{API_BASE}/deal-status/{_active_job}", timeout=5)
            if _status_resp.status_code == 200:
                _status_data = _status_resp.json()
                _progress_msg = _status_data.get("progress_message", "")
                _job_status = _status_data.get("status", "")
                if _job_status == "running" and _progress_msg:
                    # Map progress messages to more dramatic ticker lines
                    _ticker_map = {
                        "Extracting claims": "🔍 Oakwell is extracting claims from the sales transcript…",
                        "Scanning Reddit": "🌐 Oakwell is scanning Reddit, G2, and X for unfiltered competitor intel…",
                        "Running discrepancy": "⚡ Oakwell is cross-referencing buyer claims with visual proof…",
                        "Synthesizing adversarial": "🧠 Oakwell is war-gaming the strategy with Gemini 2.5-pro…",
                        "Running Adversarial": "🥊 Oakwell is stress-testing the talk-track as the Competitor CEO…",
                        "Persisting to Neural": "💾 Oakwell is persisting intelligence to Neural Memory…",
                        "Scanning for market drift": "📉 Oakwell is comparing visual proof with prior records…",
                        "Cache fresh": "⚡ Smart cache hit — skipping Playwright, refreshing strategy…",
                        "Capturing screenshot": "📸 Oakwell is capturing stealth screenshots of the competitor…",
                        "Verifying claim": "🔬 Oakwell is cross-referencing Reddit bugs with official claims…",
                    }
                    _display_msg = _progress_msg
                    for _key, _fancy in _ticker_map.items():
                        if _key.lower() in _progress_msg.lower():
                            _display_msg = _fancy
                            break
                    st.markdown(
                        f'<div style="background:#0f1923; border:1px solid #00ff88; border-radius:6px; '
                        f'padding:8px 12px; font-family:monospace; font-size:0.78rem; color:#00ff88; '
                        f'margin-bottom:8px; animation: pulse 2s infinite;">'
                        f'🧠 <b>LIVE</b> — {_display_msg}</div>',
                        unsafe_allow_html=True,
                    )
        except Exception:
            pass  # ticker is best-effort
    _pulse_events: List[Dict[str, Any]] = []
    try:
        _pulse_resp = requests.get(f"{API_BASE}/memory", timeout=12)
        if _pulse_resp.status_code == 200:
            _pulse_mem = _pulse_resp.json()
            # Flatten all timeline entries across competitors, tag with URL
            for _p_url, _p_details in _pulse_mem.items():
                _p_name = _p_url.replace("https://", "").replace("http://", "").split("/")[0]
                _p_score = _p_details.get("deal_health_score", 0)
                _p_timeline = _p_details.get("timeline", [])
                _p_drift = _p_details.get("market_drift")
                _p_proofs = _p_details.get("proof_filenames") or _p_details.get("all_proof_filenames") or []
                # Latest timeline entries → pulse items
                for _t_entry in (_p_timeline or [])[-3:]:
                    _pulse_events.append({
                        "ts": _t_entry.get("ts", ""),
                        "name": _p_name,
                        "score": _t_entry.get("score", _p_score),
                        "clash": _t_entry.get("top_clash", ""),
                    })
                # Drift alerts → pulse items
                if _p_drift and _p_drift.get("drift_detected"):
                    for _d_alert in _p_drift.get("alerts", [])[-2:]:
                        _pulse_events.append({
                            "ts": _p_details.get("last_analysis_ts", ""),
                            "name": _p_name,
                            "score": None,
                            "clash": None,
                            "drift_alert": _d_alert,
                        })
                # Visual proof captures
                if _p_proofs:
                    _latest_proof = _p_proofs[-1] if isinstance(_p_proofs, list) else _p_proofs
                    if _latest_proof and str(_latest_proof).lower() not in ("none", "", "null"):
                        _pulse_events.append({
                            "ts": _p_details.get("last_analysis_ts", ""),
                            "name": _p_name,
                            "score": _p_score,
                            "clash": None,
                            "proof": str(_latest_proof),
                        })
    except Exception:
        pass  # pulse is best-effort; never block the UI

    # Sort newest-first, take last 8
    _pulse_events.sort(key=lambda e: e.get("ts", ""), reverse=True)
    _pulse_events = _pulse_events[:8]

    if _pulse_events:
        _pulse_css = (
            '<div style="background:#0a0e17; border:1px solid #1a2744; border-radius:6px; '
            'padding:8px 10px; font-family:monospace; font-size:0.72rem; line-height:1.6; '
            'max-height:320px; overflow-y:auto;">'
        )
        for _ev in _pulse_events:
            _ts_short = _ev.get("ts", "")[:16].replace("T", " ") if _ev.get("ts") else "—"
            if _ev.get("drift_alert"):
                _pulse_css += (
                    f'<div style="color:#ff4444;">'
                    f'<span style="opacity:0.5;">{_ts_short}</span> '
                    f'🚨 <b>{_ev["name"]}</b> — {_ev["drift_alert"][:80]}</div>'
                )
            elif _ev.get("proof"):
                _pulse_css += (
                    f'<div style="color:#00ff88;">'
                    f'<span style="opacity:0.5;">{_ts_short}</span> '
                    f'✅ Visual proof captured for <b>{_ev["name"]}</b> — '
                    f'{_ev["proof"]}</div>'
                )
            elif _ev.get("clash"):
                _color = "#ff8800" if _ev.get("score", 100) < 50 else "#22aaff"
                _pulse_css += (
                    f'<div style="color:{_color};">'
                    f'<span style="opacity:0.5;">{_ts_short}</span> '
                    f'⚡ <b>{_ev["name"]}</b> score {_ev.get("score", "—")} — '
                    f'{_ev["clash"][:70]}</div>'
                )
            else:
                _pulse_css += (
                    f'<div style="color:#6688aa;">'
                    f'<span style="opacity:0.5;">{_ts_short}</span> '
                    f'📡 Scan complete for <b>{_ev["name"]}</b> — '
                    f'Score {_ev.get("score", "—")}/100</div>'
                )
        _pulse_css += '</div>'
        st.markdown(_pulse_css, unsafe_allow_html=True)
    else:
        st.markdown(
            '<div style="background:#0a0e17; border:1px solid #1a2744; border-radius:6px; '
            'padding:12px; font-family:monospace; font-size:0.72rem; color:#334455; '
            'text-align:center;">NO SIGNALS — run an analysis to activate the Sentinel</div>',
            unsafe_allow_html=True,
        )

# ---------------------------------------------------------------------------
# Main: inputs and workflow
# ---------------------------------------------------------------------------

st.title("📊 Revenue Intelligence — Oakwell")
st.caption("Autonomous Strategic Brain · Deal analysis with vision verification")

if not _api_online():
    st.error("**System Offline** — The FastAPI backend is not running. Start it with `uvicorn main:app --reload` in the project directory, then refresh.")
    st.stop()
tab_analysis, tab_sentinel, tab_live = st.tabs([
    "War Room: Deal Analysis",
    "Market Sentinel: Competitor Drift",
    "🎙️ Live Meeting Sidekick",
])

with tab_analysis:
    transcript = st.text_area(
        "Call transcript",
        height=200,
        placeholder="Paste the sales call transcript (internal conversation) here...",
        help="The internal conversation to cross-reference against visual proof.",
    )
    competitor_url = st.text_input(
        "Competitor URL",
        value="https://www.hubspot.com/pricing/sales",
        placeholder="https://competitor.com/pricing",
        help="Competitor page to verify claims against (Playwright + Vision).",
    )

    # ── Enterprise Deal Context ──
    with st.expander("🎯 Enterprise Deal Context", expanded=False):
        st.caption("Optional — providing deal stage and value unlocks stage-adaptive playbooks and smarter scoring.")
        ctx_col1, ctx_col2 = st.columns(2)
        with ctx_col1:
            deal_stage = st.selectbox(
                "Deal Stage",
                options=[None, "discovery", "technical_eval", "proposal", "negotiation", "closing"],
                format_func=lambda x: {
                    None: "— Auto-detect",
                    "discovery": "🔍 Discovery",
                    "technical_eval": "🔧 Technical Evaluation",
                    "proposal": "📊 Proposal",
                    "negotiation": "🤝 Negotiation",
                    "closing": "🏆 Closing",
                }.get(x, x),
                help="Oakwell adapts aggression, proof usage, and talk-track style per stage.",
            )
            competitor_name = st.text_input(
                "Competitor Name",
                placeholder="e.g. HubSpot",
                help="Display name for the competitor.",
            )
        with ctx_col2:
            deal_value = st.number_input(
                "Deal Value (USD)",
                min_value=0,
                value=0,
                step=1000,
                help="Estimated deal size — affects scoring sensitivity.",
            )
            your_product = st.text_input(
                "Your Product Name",
                placeholder="e.g. Oakwell",
                help="Your product name for personalised talk-tracks.",
            )

    col_btn, _ = st.columns([1, 4])
    analyze_clicked = col_btn.button("Analyze Deal", type="primary", use_container_width=True)

    if analyze_clicked:
        if not transcript.strip() or not competitor_url.strip():
            st.warning("Please provide both transcript and competitor URL.")
        else:
            with st.status("Submitting deal for analysis…", expanded=True) as status:
                try:
                    _req_payload = {
                        "transcript": transcript.strip(),
                        "competitor_url": competitor_url.strip(),
                    }
                    # Enterprise Deal Context
                    if deal_stage:
                        _req_payload["deal_stage"] = deal_stage
                    if deal_value and deal_value > 0:
                        _req_payload["deal_value"] = float(deal_value)
                    if competitor_name and competitor_name.strip():
                        _req_payload["competitor_name"] = competitor_name.strip()
                    if your_product and your_product.strip():
                        _req_payload["your_product"] = your_product.strip()
                    _sw = st.session_state.get("slack_webhook_url", "")
                    if _sw:
                        _req_payload["slack_webhook_url"] = _sw
                        _req_payload["org_id"] = "dashboard-user"
                    r = requests.post(
                        f"{API_BASE}/analyze-deal",
                        json=_req_payload,
                        headers=_headers(api_key),
                        timeout=120,
                    )
                    r.raise_for_status()
                    job_id = r.json()["job_id"]
                    st.session_state["job_id"] = job_id
                    status.update(label=f"Job {job_id[:8]}… — polling for results", state="running")
                except requests.RequestException as e:
                    status.update(label="Request failed", state="error")
                    st.error(f"Failed to start analysis: {e}")
                    st.stop()

            # Poll every 2 seconds inside a status container — live progress feed
            result = None
            progress_placeholder = st.empty()
            with st.status("Waiting for Oakwell to finish analysis…", expanded=True) as poll_status:
                while True:
                    try:
                        r = requests.get(
                            f"{API_BASE}/deal-status/{st.session_state['job_id']}",
                            headers=_headers(api_key),
                            timeout=120,
                        )
                        r.raise_for_status()
                        data = r.json()
                        progress_msg = data.get("progress_message", data["status"])
                        poll_status.update(label=f"🧠 {progress_msg}", state="running")
                        progress_placeholder.info(f"🧠 Oakwell: {progress_msg}")
                        if data["status"] == "completed":
                            result = data.get("result")
                            poll_status.update(label="Analysis complete ✓", state="complete")
                            progress_placeholder.success("✅ Analysis complete — scroll down for results")
                            break
                        if data["status"] == "failed":
                            poll_status.update(label="Analysis failed", state="error")
                            progress_placeholder.error(data.get("error", "Unknown error"))
                            st.stop()
                    except requests.exceptions.ReadTimeout:
                        continue
                    except requests.RequestException as e:
                        poll_status.update(label="Poll failed", state="error")
                        st.error(f"Polling failed: {e}")
                        st.stop()
                    time.sleep(POLL_INTERVAL)

            if result:
                st.session_state["analysis_result"] = result
                st.session_state["deal_result"] = result

    if st.session_state["deal_result"] is not None:
        result = st.session_state["deal_result"]
        st.balloons()
        # Deal Health Score: Green if >70, Red if <40
        score = result.get("deal_health_score", 0)
        score_color = "#22c55e" if score > 70 else "#ef4444" if score < 40 else "#fafafa"
        st.metric("Deal Health Score", f"{score}/100")

        # ── 🎯 Stage-Adaptive Intelligence ──
        _result_stage = result.get("deal_stage")
        _result_value = result.get("deal_value")
        _score_reasoning = result.get("score_reasoning", "")
        _risk_level = result.get("risk_level", "")
        _stage_adj = result.get("stage_adjustment", "")
        _pivot_points = result.get("key_pivot_points", [])
        _stage_actions = result.get("stage_specific_actions", [])
        _win_patterns = result.get("winning_patterns_summary", {})
        _auto_hardened = result.get("auto_hardened", False)

        if _result_stage or _score_reasoning:
            _stage_cols = st.columns(4)
            with _stage_cols[0]:
                _stage_display = {
                    "discovery": "🔍 Discovery",
                    "technical_eval": "🔧 Tech Eval",
                    "proposal": "📊 Proposal",
                    "negotiation": "🤝 Negotiation",
                    "closing": "🏆 Closing",
                }.get(_result_stage, "— Auto")
                st.metric("Deal Stage", _stage_display)
            with _stage_cols[1]:
                _risk_icon = {
                    "critical": "🔴", "high": "🟠",
                    "medium": "🟡", "low": "🟢",
                }.get(_risk_level, "⚪")
                st.metric("Risk Level", f"{_risk_icon} {_risk_level.upper()}" if _risk_level else "—")
            with _stage_cols[2]:
                if _result_value and _result_value > 0:
                    st.metric("Deal Value", f"${_result_value:,.0f}")
                else:
                    st.metric("Deal Value", "—")
            with _stage_cols[3]:
                _wr = _win_patterns.get("win_rate", 0)
                _to = _win_patterns.get("total_outcomes", 0)
                if _to > 0:
                    st.metric("Historical Win Rate", f"{_wr:.0%}", delta=f"{_to} past deals")
                else:
                    st.metric("Historical Win Rate", "— No history")

            if _score_reasoning:
                st.caption(f"🧠 Score reasoning: {_score_reasoning}")
            if _stage_adj:
                st.caption(f"🎯 Stage adjustment: {_stage_adj}")
            if _auto_hardened:
                st.warning("🛡️ Strategy was auto-hardened after adversarial rejection")

        # ── 🥊 Strategic Stress Test (Adversarial Critique) ──
        critique = result.get("adversarial_critique") or {}
        verdict = critique.get("verdict", "")
        if critique and verdict:
            st.divider()
            st.subheader("🥊 Strategic Stress Test")
            # Verdict banner
            if "REJECTED" in verdict.upper():
                st.error(f"🚨 **VERDICT: {verdict}** — The Competitor CEO simulator rejects this strategy. A kill-shot rewrite is demanded.")
            elif "HARDENING" in verdict.upper():
                st.warning(f"⚠️ **VERDICT: {verdict}** — Counter-attacks could land. Hardening required.")
            elif "APPROVED" in verdict.upper():
                st.success(f"✅ **VERDICT: {verdict}** — Strategy is airtight. Counter-attacks are weak.")
            else:
                st.info(f"📊 **VERDICT: {verdict}**")

            # Counter-attacks in two columns
            ca1 = critique.get("counter_attack_1") or {}
            ca2 = critique.get("counter_attack_2") or {}
            col_ca1, col_ca2 = st.columns(2)
            with col_ca1:
                threat_1 = ca1.get("threat_level", "unknown")
                threat_icon_1 = "🔴" if threat_1 == "high" else "🟡" if threat_1 == "medium" else "🟢"
                st.markdown(f"**Counter-Attack #1** {threat_icon_1} `{threat_1}`")
                st.markdown(f"**Angle:** {ca1.get('angle', 'N/A')}")
                st.markdown(f"**Their Response:** {ca1.get('competitor_response', 'N/A')}")
                ds1 = ca1.get("deep_sentiment_support", "")
                if ds1:
                    st.caption(f"🌐 Sentiment support: {ds1}")
            with col_ca2:
                threat_2 = ca2.get("threat_level", "unknown")
                threat_icon_2 = "🔴" if threat_2 == "high" else "🟡" if threat_2 == "medium" else "🟢"
                st.markdown(f"**Counter-Attack #2** {threat_icon_2} `{threat_2}`")
                st.markdown(f"**Angle:** {ca2.get('angle', 'N/A')}")
                st.markdown(f"**Their Response:** {ca2.get('competitor_response', 'N/A')}")
                ds2 = ca2.get("deep_sentiment_support", "")
                if ds2:
                    st.caption(f"🌐 Sentiment support: {ds2}")

            # Missed ammunition
            missed = critique.get("missed_ammunition") or []
            if missed:
                with st.expander("💣 Missed Ammunition (not yet in talk-track)", expanded=False):
                    for item in missed:
                        st.markdown(f"- {item}")

            # Hardening notes / kill-shot demand
            hardening = critique.get("hardening_notes", "")
            if hardening:
                with st.expander("🛠️ Hardening Notes / Kill-Shot Demand", expanded="REJECTED" in verdict.upper()):
                    st.markdown(hardening)

            # Confidence
            conf = critique.get("confidence", 0.0)
            if isinstance(conf, (int, float)):
                st.progress(min(1.0, max(0.0, float(conf))), text=f"Critic confidence: {conf:.0%}")

        # Cached indicator
        if result.get("cached"):
            st.caption("⚡ Smart-cached — Playwright skipped (analysed < 1 h ago). Strategist re-ran fresh.")

        st.markdown(
            f'<p style="color:{score_color}; font-size:1.1rem;">{"✓ Strong" if score > 70 else "⚠ At risk" if score < 40 else "○ Neutral"}</p>',
            unsafe_allow_html=True,
        )

        # Memory Insights: Show analysis count for this competitor
        competitor_url = result.get("competitor_url", "")
        if competitor_url:
            try:
                memory_response = requests.get(f"{API_BASE}/memory", timeout=120)
                if memory_response.status_code == 200:
                    memory_data = memory_response.json()
                    competitor_memory = memory_data.get(competitor_url)
                    if competitor_memory:
                        analysis_count = competitor_memory.get("analysis_count", 1)
                        st.info(f"🧠 **Oakwell Memory**: This is analysis #{analysis_count} for this competitor.")
            except Exception:
                pass  # silently skip if memory API unavailable

        # Extract kill-shot sentence for highlighting
        talk = result.get("talk_track") or "—"
        kill_shot_sentence = None
        if "Show them this screenshot" in talk or "proof_artifact_path" in talk or "Visual Truth" in talk:
            sentences = talk.split(". ")
            for sentence in sentences:
                if any(keyword in sentence for keyword in ["Show them", "screenshot", "Visual Truth", "proof", "contradicts"]):
                    kill_shot_sentence = sentence.strip()
                    break
        
        # Two-column: Left = Talk track, Right = Visual evidence
        col_talk, col_evidence = st.columns(2)
        with col_talk:
            st.subheader("Adversarial Talk-Track")
            # Strip markdown formatting to prevent mashed text
            talk_clean = talk.replace("*", "").replace("_", "").replace("★", "")
            # Use st.text_area for clean, properly spaced display
            st.text_area(
                label="Talk Track",
                value=talk_clean,
                height=300,
                disabled=True,
                label_visibility="collapsed"
            )
            if kill_shot_sentence:
                st.info(f"🎯 **Kill-Shot**: {kill_shot_sentence}")
        
        with col_evidence:
            st.subheader("Visual Evidence")
            proof_path = result.get("proof_artifact_path")
            all_proofs = result.get("all_proof_filenames", [])
            outputs_dir = Path(__file__).parent / "outputs"

            # Resolve the proof image to an actual file on disk
            resolved_image_path = None

            # Try 1: primary proof_artifact_path
            if proof_path and str(proof_path).lower() not in ("none", "", "null"):
                candidate = outputs_dir / os.path.basename(proof_path)
                if candidate.is_file() and candidate.stat().st_size > 0:
                    resolved_image_path = candidate

            # Try 2: scan all_proof_filenames list
            if not resolved_image_path and all_proofs:
                for pf in all_proofs:
                    if pf and str(pf).lower() not in ("none", "", "null"):
                        candidate = outputs_dir / os.path.basename(pf)
                        if candidate.is_file() and candidate.stat().st_size > 0:
                            resolved_image_path = candidate
                            break

            # Try 3: fallback — find most recent proof_*.png in outputs/
            if not resolved_image_path:
                proof_files = sorted(
                    outputs_dir.glob("proof_*.png"),
                    key=lambda p: p.stat().st_mtime,
                    reverse=True,
                )
                if proof_files and proof_files[0].stat().st_size > 0:
                    resolved_image_path = proof_files[0]

            if resolved_image_path:
                try:
                    st.image(str(resolved_image_path), use_container_width=True)
                    st.success(f"✅ Verified by AGI Vision — {resolved_image_path.name}")
                except Exception as e:
                    st.warning(f"Screenshot found ({resolved_image_path.name}) but could not display: {e}")
            else:
                st.info("No visual proof captured for this analysis.")

        # ── 🌐 Unfiltered Market Voice (Deep Sentiment) ──
        deep_sent = result.get("deep_sentiment") or {}
        if deep_sent and deep_sent.get("status") != "error":
            st.divider()
            st.subheader("🌐 Unfiltered Market Voice")
            st.caption("Real complaints from Reddit, G2, and X/Twitter — not curated by the competitor's marketing team.")

            overall = deep_sent.get("overall_sentiment", "unknown")
            sent_color = (
                "🔴 Negative" if "negative" in str(overall).lower()
                else "🟢 Positive" if "positive" in str(overall).lower()
                else "🟡 Mixed"
            )
            st.markdown(f"**Overall Sentiment:** {sent_color}")

            col_reddit, col_g2, col_x = st.columns(3)

            complaints = deep_sent.get("recent_complaints") or []
            frustrations = deep_sent.get("feature_frustrations") or []
            outages = deep_sent.get("outages") or []

            with col_reddit:
                st.markdown("🟠 **Recent Complaints**")
                if complaints:
                    for c in (complaints if isinstance(complaints, list) else [complaints])[:8]:
                        if isinstance(c, dict):
                            src = c.get("source", "")
                            sev = c.get("severity", "")
                            txt = c.get("text", c.get("complaint", str(c)))
                            st.markdown(f"- {txt}")
                            if src or sev:
                                st.caption(f"   Source: {src}  |  Severity: {sev}")
                        else:
                            st.markdown(f"- {c}")
                else:
                    st.caption("No complaints found.")

            with col_g2:
                st.markdown("🔧 **Feature Frustrations**")
                if frustrations:
                    for f in (frustrations if isinstance(frustrations, list) else [frustrations])[:8]:
                        if isinstance(f, dict):
                            st.markdown(f"- {f.get('feature', f.get('text', str(f)))}")
                        else:
                            st.markdown(f"- {f}")
                else:
                    st.caption("No frustrations found.")

            with col_x:
                st.markdown("⚡ **Outages / Downtime**")
                if outages:
                    for o in (outages if isinstance(outages, list) else [outages])[:8]:
                        if isinstance(o, dict):
                            st.markdown(f"- {o.get('date', '')} {o.get('text', o.get('description', str(o)))}")
                        else:
                            st.markdown(f"- {o}")
                else:
                    st.caption("No outages found.")

            # Killer insight
            killer = deep_sent.get("killer_insight", "")
            if killer:
                st.info(f"💡 **Killer Insight:** {killer}")

        # ── 🎯 Executive Threat Matrix (Phase 2 Intelligence) ──
        threat_matrix = (deep_sent.get("executive_threat_matrix") or {}) if deep_sent else {}
        if threat_matrix:
            st.divider()
            st.subheader("🎯 Executive Threat Matrix")
            st.caption(
                "Enterprise intelligence from SEC filings, Glassdoor/Blind employee leaks, "
                "and Greenhouse/LinkedIn hiring signals — the intelligence layer your competitor can't see."
            )

            # Threat level badge
            threat_level = threat_matrix.get("threat_level", "unknown").lower()
            _tl_colors = {
                "critical": ("🔴", "red"),
                "high": ("🟠", "orange"),
                "medium": ("🟡", "yellow"),
                "low": ("🟢", "green"),
            }
            tl_emoji, tl_color = _tl_colors.get(threat_level, ("⚪", "gray"))
            st.markdown(
                f"**Threat Level:** {tl_emoji} **{threat_level.upper()}**"
            )

            # 3-column layout: SEC | Employee Leaks | Hiring Signals
            col_sec, col_emp, col_hire = st.columns(3)

            sec_risks = threat_matrix.get("sec_financial_risks") or []
            emp_leaks = threat_matrix.get("employee_leaks") or []
            hire_sigs = threat_matrix.get("hiring_signals") or []

            with col_sec:
                st.markdown("📊 **SEC Financial Risks**")
                if sec_risks:
                    for sr in (sec_risks if isinstance(sec_risks, list) else [sec_risks])[:6]:
                        if isinstance(sr, dict):
                            st.markdown(f"- **{sr.get('signal', '—')}**")
                            st.caption(f"  → {sr.get('implication', '')}")
                            rep_act = sr.get("rep_action", "")
                            if rep_act:
                                st.caption(f"  🎯 Rep: {rep_act}")
                        else:
                            st.markdown(f"- {sr}")
                else:
                    st.caption("No SEC financial risk signals found.")

            with col_emp:
                st.markdown("🕵️ **Employee Leaks**")
                if emp_leaks:
                    for el in (emp_leaks if isinstance(emp_leaks, list) else [emp_leaks])[:6]:
                        if isinstance(el, dict):
                            src = el.get("source", "")
                            st.markdown(f"- **{el.get('signal', '—')}**")
                            if src:
                                st.caption(f"  Source: {src}")
                            st.caption(f"  → {el.get('implication', '')}")
                            tp = el.get("rep_talking_point", "")
                            if tp:
                                st.caption(f"  🎯 Talk point: {tp}")
                        else:
                            st.markdown(f"- {el}")
                else:
                    st.caption("No employee leak signals found.")

            with col_hire:
                st.markdown("📈 **Hiring / Churn Signals**")
                if hire_sigs:
                    for hs in (hire_sigs if isinstance(hire_sigs, list) else [hire_sigs])[:6]:
                        if isinstance(hs, dict):
                            st.markdown(f"- **{hs.get('signal', '—')}**")
                            st.caption(f"  Churn indicator: {hs.get('churn_indicator', '')}")
                            ra = hs.get("rep_action", "")
                            if ra:
                                st.caption(f"  🎯 Rep: {ra}")
                        else:
                            st.markdown(f"- {hs}")
                else:
                    st.caption("No hiring/churn signals found.")

            # Rep Talk Tracks
            talk_tracks = threat_matrix.get("rep_talk_tracks") or []
            if talk_tracks:
                st.markdown("---")
                st.markdown("🗣️ **Ready-to-Use Talk Tracks**")
                for i, tt in enumerate(talk_tracks[:5], 1):
                    st.success(f"**{i}.** {tt}")

        # ── 💣 Kill-Shot Toggle — visual proof + Reddit quote side-by-side ──
        _has_kill_shot_data = (
            critique.get("kill_shot_proof")
            or ("REJECTED" in verdict.upper())
            or (deep_sent.get("killer_insight"))
        )
        if _has_kill_shot_data and resolved_image_path:
            st.divider()
            if st.button("💣 Show Kill-Shot Evidence", use_container_width=True, type="secondary", key="kill_shot_btn"):
                st.session_state["_show_kill_shot"] = not st.session_state.get("_show_kill_shot", False)

            if st.session_state.get("_show_kill_shot", False):
                st.markdown("---")
                st.subheader("💣 Kill-Shot Evidence — Visual Proof × Community Voice")
                ks_col_proof, ks_col_quote = st.columns(2)
                with ks_col_proof:
                    st.markdown("**📸 Visual Proof (Competitor's Own Website)**")
                    try:
                        st.image(str(resolved_image_path), use_container_width=True)
                        st.caption(f"Screenshot: {resolved_image_path.name}")
                    except Exception:
                        st.warning("Could not display proof image.")

                with ks_col_quote:
                    st.markdown("**🌐 Community Evidence (Reddit / G2 / X)**")
                    ks_proof_text = critique.get("kill_shot_proof", "")
                    if ks_proof_text:
                        st.error(ks_proof_text)
                    ks_killer = deep_sent.get("killer_insight", "")
                    if ks_killer:
                        st.warning(f"💡 **Killer Insight:** {ks_killer}")
                    # Show top complaints as quotable ammunition
                    ks_complaints = deep_sent.get("recent_complaints") or []
                    if ks_complaints:
                        st.markdown("**Quotable ammunition for the rep:**")
                        for kc in (ks_complaints if isinstance(ks_complaints, list) else [ks_complaints])[:5]:
                            if isinstance(kc, dict):
                                st.markdown(f'> "{kc.get("text", kc.get("complaint", str(kc)))}"')
                            else:
                                st.markdown(f'> "{kc}"')
                        st.caption('Use: "Your own users on Reddit are saying…"')
                    ks_missed = critique.get("missed_ammunition") or []
                    if ks_missed:
                        st.markdown("**Missed by current strategy:**")
                        for km in ks_missed[:5]:
                            st.markdown(f"- ⚠️ {km}")

        # Market Drift Alert (if detected)
        drift = result.get("market_drift")
        if drift and drift.get("drift_detected"):
            st.subheader("🚨 Market Drift Detected")
            for alert in drift.get("alerts", []):
                st.error(alert)

        # Clash table: Buyer claims disproven by Vision AI
        st.subheader("Clashes — Buyer claims disproven by Vision AI")
        clashes = result.get("clashes_detected") or []
        if clashes:
            # Build a Markdown table string to avoid pyarrow/st.table dependency
            def _escape_pipe(s: Any) -> str:
                if s is None:
                    return ""
                return str(s).replace("|", "\\|")

            md_lines = ["| Buyer claim | Risk | Explanation | Confidence |", "|---|---|---|---|"]
            for c in clashes:
                conf = c.get("confidence_score")
                if isinstance(conf, (int, float)):
                    conf_str = f"{float(conf):.0%}" if conf <= 1.0 else str(conf)
                else:
                    conf_str = str(conf) if conf is not None and conf != "" else "—"
                claim = _escape_pipe(c.get("claim", ""))
                risk = _escape_pipe(c.get("risk", ""))
                explanation = _escape_pipe(c.get("explanation", ""))
                md_lines.append(f"| {claim} | {risk} | {explanation} | {conf_str} |")

            md_table = "\n".join(md_lines)
            st.markdown(md_table)
        else:
            st.info("No clashes detected — buyer claims aligned with visual proof.")

        st.divider()

        # Action buttons row: Email + Download Sales Brief + Executive Summary
        col_email, col_download, col_exec = st.columns(3)
        with col_email:
            email_clicked = st.button("🚀 Generate AGI Follow-up Email", use_container_width=True, key="gen_email")
        with col_download:
            # Generate sales brief text for download
            brief_text = oakwell_tools.generate_pdf_report_content(result)
            st.download_button(
                label="📥 Download Sales Brief",
                data=brief_text,
                file_name="oakwell_sales_brief.txt",
                mime="text/plain",
                use_container_width=True,
            )
        with col_exec:
            exec_summary_md = oakwell_tools.generate_executive_summary(result)
            st.download_button(
                label="📋 Executive Summary",
                data=exec_summary_md,
                file_name="oakwell_executive_summary.md",
                mime="text/markdown",
                use_container_width=True,
            )

        if email_clicked:
            with st.status("Generating follow-up email…", expanded=False) as email_status:
                try:
                    deal_result = st.session_state.get("analysis_result")
                    if not deal_result:
                        raise ValueError("Missing deal result for email generation")
                    email_payload = {"deal_results": deal_result}
                    email_response = requests.post(
                        f"{API_BASE}/generate-email",
                        json=email_payload,
                        headers=_headers(api_key),
                        timeout=120,
                    )
                    if email_response.status_code == 200:
                        email_data = email_response.json()
                        email_text = email_data.get("email", "")
                        if email_text:
                            if "Subject:" not in email_text:
                                email_text = "Subject: Follow-up on verified findings\n\nBody:\n" + email_text
                            st.session_state["email_draft"] = email_text
                            email_status.update(label="Email ready", state="complete")
                        else:
                            email_status.update(label="Email generation failed", state="error")
                            st.error("Email generation failed.")
                    else:
                        email_status.update(label="Email generation failed", state="error")
                        st.error(f"Email API error: {email_response.status_code}")
                except Exception as e:
                    email_status.update(label="Email generation failed", state="error")
                    st.error(f"Email generation error: {e}")

        if st.session_state["email_draft"]:
            st.subheader("Autonomous Follow-up Email")
            st.code(st.session_state["email_draft"], language="markdown")
            st.caption(
                "Oakwell has cross-referenced the Visual Proof artifacts in this draft."
            )

        # ── 🎯 Stage-Specific Pivot Points & Actions ──
        _pivot_points = result.get("key_pivot_points", [])
        _stage_actions = result.get("stage_specific_actions", [])
        if _pivot_points or _stage_actions:
            st.divider()
            st.subheader("🎯 Stage-Adaptive Playbook")
            _pa_col1, _pa_col2 = st.columns(2)
            with _pa_col1:
                if _pivot_points:
                    st.markdown("**🔄 Key Pivot Points**")
                    for i, pp in enumerate(_pivot_points[:5], 1):
                        st.markdown(f"{i}. {pp}")
                else:
                    st.caption("No pivot points identified.")
            with _pa_col2:
                if _stage_actions:
                    st.markdown("**⚡ Stage-Specific Actions**")
                    for i, sa in enumerate(_stage_actions[:5], 1):
                        st.success(f"**{i}.** {sa}")
                else:
                    st.caption("No stage-specific actions identified.")

        # ── 📊 Win/Loss Feedback — Record Deal Outcome ──
        st.divider()
        with st.expander("📊 Record Deal Outcome (Win/Loss Feedback Loop)", expanded=False):
            st.caption(
                "Record the outcome of this deal so Oakwell learns from wins and losses. "
                "Future analyses will adapt strategy based on historical patterns."
            )
            _outcome_col1, _outcome_col2, _outcome_col3 = st.columns(3)
            with _outcome_col1:
                _rec_outcome = st.selectbox(
                    "Outcome",
                    options=["won", "lost", "stalled"],
                    format_func=lambda x: {"won": "✅ Won", "lost": "❌ Lost", "stalled": "⏸️ Stalled"}.get(x, x),
                    key="rec_outcome_select",
                )
            with _outcome_col2:
                _rec_value = st.number_input(
                    "Final Deal Value (USD)",
                    min_value=0,
                    value=int(result.get("deal_value") or 0),
                    step=1000,
                    key="rec_value_input",
                )
            with _outcome_col3:
                _rec_reason = st.text_input(
                    "Reason (optional)",
                    placeholder="e.g. Lost on price, Won on integrations",
                    key="rec_reason_input",
                )

            if st.button("📊 Record Outcome", use_container_width=True, key="record_outcome_btn"):
                _comp_url = result.get("competitor_url", "")
                if _comp_url:
                    try:
                        _outcome_resp = requests.post(
                            f"{API_BASE}/record-outcome",
                            json={
                                "competitor_url": _comp_url,
                                "outcome": _rec_outcome,
                                "deal_value": float(_rec_value) if _rec_value > 0 else None,
                                "deal_stage": result.get("deal_stage"),
                                "reason": _rec_reason if _rec_reason else None,
                            },
                            headers=_headers(api_key),
                            timeout=30,
                        )
                        if _outcome_resp.status_code == 200:
                            st.success(f"✅ Outcome recorded: {_rec_outcome.upper()} — Oakwell will learn from this.")
                        else:
                            st.error(f"Failed to record outcome: {_outcome_resp.text}")
                    except Exception as _rec_err:
                        st.error(f"Error recording outcome: {_rec_err}")
                else:
                    st.warning("No competitor URL — cannot record outcome.")

with tab_sentinel:
    st.subheader("Market Sentinel: Competitor Drift")
    # Fetch memory from API (Firestore-backed) instead of reading local JSON
    try:
        _mem_resp = requests.get(f"{API_BASE}/memory", timeout=12)
        memory_data = _mem_resp.json() if _mem_resp.status_code == 200 else {}
    except Exception as _mem_err:
        st.error(f"Failed to fetch memory from API: {_mem_err}")
        memory_data = {}

    if not memory_data:
        st.info("No memory timeline available yet. Run a deal analysis to populate it.")
    else:
        for competitor, details in memory_data.items():
            st.markdown(f"### {competitor}")

            # Win Probability Trend — avg-of-last-3 comparison
            score_history = details.get("score_history", [])
            current_score = details.get("deal_health_score", 0)
            analysis_count = details.get("analysis_count", 0)

            # Calculate trend: current vs average of last 3 historical scores
            trend_label = "Insufficient data"
            trend_delta = None
            if len(score_history) >= 2:
                current = score_history[-1]
                history_window = score_history[-4:-1] if len(score_history) >= 4 else score_history[:-1]
                avg = sum(history_window) / len(history_window)
                diff = current - avg
                if diff > 5:
                    trend_label = "Improving \U0001f4c8"
                    trend_delta = round(diff, 1)
                elif diff < -5:
                    trend_label = "Declining \U0001f4c9"
                    trend_delta = round(diff, 1)
                else:
                    trend_label = "Stable \u2194\ufe0f"
                    trend_delta = round(diff, 1) if abs(diff) > 0.5 else None

            col_score, col_count, col_trend = st.columns(3)
            with col_score:
                # Show delta from prior run for Deal Health
                if len(score_history) >= 2:
                    run_delta = score_history[-1] - score_history[-2]
                    st.metric(
                        "Deal Health",
                        f"{current_score}/100",
                        delta=f"{run_delta:+d}" if run_delta != 0 else "0",
                        delta_color="normal",
                    )
                else:
                    st.metric("Deal Health", f"{current_score}/100")
            with col_count:
                st.metric("Analyses Run", str(analysis_count))
            with col_trend:
                if trend_label.startswith("Improving"):
                    st.metric(
                        "Win Probability Trend",
                        trend_label,
                        delta=f"+{trend_delta}" if trend_delta else None,
                        delta_color="normal",
                    )
                elif trend_label.startswith("Declining"):
                    st.metric(
                        "Win Probability Trend",
                        trend_label,
                        delta=str(trend_delta) if trend_delta else None,
                        delta_color="inverse",
                    )
                elif trend_label.startswith("Stable"):
                    st.metric(
                        "Win Probability Trend",
                        trend_label,
                        delta=str(trend_delta) if trend_delta else None,
                    )
                else:
                    st.metric("Win Probability Trend", "— Insufficient data")

            # Score history sparkline
            if len(score_history) >= 2:
                st.caption(f"Score history: {' → '.join(str(s) for s in score_history)}")

            # Market Pulse Timeline
            timeline = details.get("timeline", [])
            if timeline:
                with st.expander("📈 Market Pulse Timeline", expanded=False):
                    for entry in reversed(timeline[-10:]):
                        ts_display = entry.get("ts", "")[:16].replace("T", " ") if entry.get("ts") else "—"
                        entry_score = entry.get("score", "—")
                        clash = entry.get("top_clash", "—") or "—"
                        st.write(f"**{ts_display}** — Score: {entry_score}/100 — Top issue: {clash[:80]}")

            # Last analysis timestamp
            last_ts = details.get("last_analysis_ts")
            if last_ts:
                st.caption(f"Last analysed: {last_ts}")

            # Clashes summary
            clashes = details.get("clashes_detected") or []
            if clashes:
                with st.expander(f"Detected clashes ({len(clashes)})", expanded=False):
                    for clash in clashes:
                        claim = clash.get("claim", "—")
                        risk = clash.get("risk", "—")
                        st.write(f"- **{claim}** — {risk}")
            else:
                st.write("No recorded market changes.")

            # Market drift alerts
            drift = details.get("market_drift")
            if drift and drift.get("drift_detected"):
                for alert in drift.get("alerts", []):
                    st.error(alert)

            st.divider()

with tab_live:
    st.subheader("🎙️ Live Meeting Sidekick")
    st.caption("Feed live snippets from your call — Oakwell detects competitor mentions and pricing claims in real-time.")

    # ── Controls row ──
    ctrl_col1, ctrl_col2, ctrl_col3 = st.columns([2, 2, 1])
    with ctrl_col1:
        live_comp_url = st.text_input(
            "Competitor URL (for auto-verification)",
            value="https://www.hubspot.com/pricing/sales",
            key="live_comp_url",
            help="Oakwell will verify pricing claims against this page.",
        )
    with ctrl_col2:
        listening = st.toggle(
            "🟢 Listening",
            value=st.session_state["live_listening"],
            key="_live_toggle",
            help="Turn on to activate real-time analysis of snippets.",
        )
        if listening != st.session_state["live_listening"]:
            st.session_state["live_listening"] = listening
    with ctrl_col3:
        if st.button("🗑️ Clear Cards", use_container_width=True, key="clear_live"):
            st.session_state["live_flashcards"] = []
            st.session_state["live_feed"] = []
            st.rerun()

    if st.session_state["live_listening"]:
        st.markdown(
            '<div style="background:#0f1923; border:1px solid #00ff88; border-radius:6px; '
            'padding:6px 12px; font-family:monospace; font-size:0.75rem; color:#00ff88; '
            'text-align:center; margin-bottom:12px;">'
            '🟢 LISTENING — Paste or type a live snippet below</div>',
            unsafe_allow_html=True,
        )

        snippet_input = st.chat_input("Paste a live call snippet…", key="live_snippet_input")

        if snippet_input:
            import asyncio as _aio

            # Add to live feed
            _ts_now = time.strftime("%H:%M:%S")
            st.session_state["live_feed"].append({"ts": _ts_now, "text": snippet_input})

            with st.status("🧠 Oakwell is analysing the snippet…", expanded=True) as _live_status:
                try:
                    _live_result = _aio.get_event_loop().run_until_complete(
                        oakwell_tools.process_live_snippet(
                            snippet=snippet_input,
                            competitor_url=live_comp_url.strip() if live_comp_url else None,
                            api_key=api_key if api_key else None,
                        )
                    )
                except RuntimeError:
                    # If there's already a running loop (Streamlit), create a new one
                    _loop = _aio.new_event_loop()
                    try:
                        _live_result = _loop.run_until_complete(
                            oakwell_tools.process_live_snippet(
                                snippet=snippet_input,
                                competitor_url=live_comp_url.strip() if live_comp_url else None,
                                api_key=api_key if api_key else None,
                            )
                        )
                    finally:
                        _loop.close()
                except Exception as _live_err:
                    _live_status.update(label="Analysis failed", state="error")
                    st.error(f"Snippet analysis failed: {_live_err}")
                    _live_result = None

                if _live_result and _live_result.get("status") == "analysed":
                    _comp_mentions = _live_result.get("competitor_mentions", [])
                    _pricing_claims = _live_result.get("pricing_claims", [])
                    _verifications = _live_result.get("verification_results", [])
                    _has_actionable = _live_result.get("has_actionable_claim", False)

                    if _has_actionable or _comp_mentions:
                        # Build flashcard
                        _card: Dict[str, Any] = {
                            "ts": _ts_now,
                            "snippet": snippet_input[:200],
                            "competitors": _comp_mentions,
                            "pricing_claims": _pricing_claims,
                            "is_false_claim": False,
                            "proof_path": None,
                            "pivot_line": "",
                        }

                        # Check verifications for false claims + proof
                        for vr in _verifications:
                            v_data = vr.get("verification", {})
                            if v_data.get("status") == "success" and not v_data.get("verified", True):
                                _card["is_false_claim"] = True
                                _card["pivot_line"] = (
                                    f"Their own website contradicts that claim — show them the proof: "
                                    f"{v_data.get('explanation', '')[:150]}"
                                )
                            proof = v_data.get("proof_artifact_path")
                            if proof and str(proof).lower() not in ("none", "", "null"):
                                _card["proof_path"] = proof

                        # If no pivot from verification, build one from the mention
                        if not _card["pivot_line"] and _comp_mentions:
                            _card["pivot_line"] = (
                                f"Competitor mention detected: {', '.join(_comp_mentions[:3])}. "
                                "Redirect the conversation to your differentiated value."
                            )

                        # Enrich from Firestore memory if available
                        if live_comp_url:
                            try:
                                _mem_resp = requests.get(f"{API_BASE}/memory", timeout=5)
                                if _mem_resp.status_code == 200:
                                    _mem_all = _mem_resp.json()
                                    _mem_rec = _mem_all.get(live_comp_url.strip(), {})
                                    if _mem_rec:
                                        _card["memory_score"] = _mem_rec.get("deal_health_score")
                                        _card["memory_count"] = _mem_rec.get("analysis_count")
                            except Exception:
                                pass

                        st.session_state["live_flashcards"].insert(0, _card)
                        _live_status.update(label="⚡ Flashcard generated!", state="complete")
                    else:
                        _live_status.update(label="No actionable intel in this snippet", state="complete")
                elif _live_result:
                    _live_status.update(label=f"Snippet: {_live_result.get('reason', 'skipped')}", state="complete")

    else:
        st.info("🔴 Sidekick is paused — toggle **Listening** to start analysing live snippets.")

    # ── Two-column layout: Live Feed | Battle Flashcards ──
    col_feed, col_cards = st.columns([1, 2])

    with col_feed:
        st.markdown("**📝 Live Feed**")
        _feed = st.session_state.get("live_feed", [])
        if _feed:
            _feed_container = st.container(height=500)
            with _feed_container:
                for _f in reversed(_feed[-20:]):
                    st.markdown(
                        f'<div style="border-left:3px solid #22aaff; padding:4px 8px; margin:4px 0; '
                        f'font-size:0.82rem;"><span style="opacity:0.5;">{_f["ts"]}</span> '
                        f'{_f["text"][:200]}</div>',
                        unsafe_allow_html=True,
                    )
        else:
            st.caption("No snippets yet — paste a live call excerpt above.")

    with col_cards:
        st.markdown("**⚡ Battle Flashcards**")
        _cards = st.session_state.get("live_flashcards", [])
        if _cards:
            for _idx, _fc in enumerate(_cards[:10]):
                _is_false = _fc.get("is_false_claim", False)
                # Pulsing red border for false pricing claims
                _border_color = "#ff2222" if _is_false else "#00ff88"
                _bg_color = "#1a0505" if _is_false else "#0a1a0f"
                _pulse_anim = (
                    "animation: pulse-red 1.5s infinite;"
                    if _is_false else ""
                )
                _comp_tags = ", ".join(_fc.get("competitors", [])[:3]) or "—"

                _card_html = (
                    f'<div style="border:2px solid {_border_color}; background:{_bg_color}; '
                    f'border-radius:8px; padding:12px; margin-bottom:10px; {_pulse_anim}">'
                    f'<div style="display:flex; justify-content:space-between; align-items:center;">'
                    f'<span style="color:{_border_color}; font-weight:bold; font-size:0.9rem;">'
                    f'{"🚨 FALSE CLAIM DETECTED" if _is_false else "⚡ Battle Flashcard"}</span>'
                    f'<span style="opacity:0.5; font-size:0.7rem;">{_fc.get("ts", "")}</span></div>'
                    f'<div style="color:#aabbcc; font-size:0.78rem; margin:6px 0;">'
                    f'Competitors: <b>{_comp_tags}</b></div>'
                )

                # Pricing claims
                _pcs = _fc.get("pricing_claims", [])
                if _pcs:
                    _card_html += '<div style="margin:4px 0;">'
                    for _pc in _pcs[:2]:
                        _pc_text = _pc.get("claim", "") if isinstance(_pc, dict) else str(_pc)
                        _conf = _pc.get("confidence", 0) if isinstance(_pc, dict) else 0
                        _card_html += (
                            f'<div style="color:#ffaa00; font-size:0.78rem;">'
                            f'💰 "{_pc_text[:100]}" '
                            f'<span style="opacity:0.5;">({_conf:.0%})</span></div>'
                        )
                    _card_html += '</div>'

                # Pivot line
                _pivot = _fc.get("pivot_line", "")
                if _pivot:
                    _card_html += (
                        f'<div style="color:#00ff88; font-size:0.82rem; margin-top:6px; '
                        f'font-weight:bold;">🎯 {_pivot[:200]}</div>'
                    )

                # Memory enrichment
                _ms = _fc.get("memory_score")
                _mc = _fc.get("memory_count")
                if _ms is not None:
                    _card_html += (
                        f'<div style="opacity:0.5; font-size:0.7rem; margin-top:4px;">'
                        f'🧠 Memory: Score {_ms}/100 · Analysis #{_mc or "?"}</div>'
                    )

                _card_html += '</div>'

                st.markdown(_card_html, unsafe_allow_html=True)

                # Show proof image if available
                _proof = _fc.get("proof_path")
                if _proof:
                    _proof_file = Path(__file__).parent / "outputs" / os.path.basename(_proof)
                    if _proof_file.is_file() and _proof_file.stat().st_size > 0:
                        with st.expander(f"📸 Visual Proof — {_proof_file.name}", expanded=_is_false):
                            st.image(str(_proof_file), use_container_width=True)
                            if _is_false:
                                st.error("⚠️ This screenshot DISPROVES the buyer's pricing claim.")
        else:
            st.caption("No flashcards yet — snippets with competitor mentions will generate cards here.")

    # Inject CSS for pulsing red animation
    st.markdown(
        """
        <style>
        @keyframes pulse-red {
            0%   { box-shadow: 0 0 5px #ff2222; }
            50%  { box-shadow: 0 0 20px #ff2222, 0 0 40px #ff000044; }
            100% { box-shadow: 0 0 5px #ff2222; }
        }
        </style>
        """,
        unsafe_allow_html=True,
    )
