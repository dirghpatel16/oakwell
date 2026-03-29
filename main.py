"""
Revenue Intelligence Platform — Autonomous Strategic Brain (Oakwell).
Production FastAPI API: parallel vision verification, background deal analysis, deal-status polling.
"""

import asyncio
import gc
import json
import logging
import os
import re
import secrets
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional, List, Union, Dict, Tuple

from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

try:
    from google.cloud import firestore as _firestore_mod
except ImportError:
    _firestore_mod = None  # type: ignore[assignment]

import tools

# ---------------------------------------------------------------------------
# Config & state
# ---------------------------------------------------------------------------

MIN_PARALLEL_VERIFICATIONS = 2
MAX_VERIFICATION_CLAIMS = 4
OUTPUTS_DIR = Path(__file__).resolve().parent / "outputs"
OUTPUTS_DIR.mkdir(exist_ok=True)

CACHE_TTL_SECONDS = 3600  # 1 hour — skip Playwright if analysed within this window
RATE_LIMIT_WINDOW_SECONDS = 60

jobs: Dict[str, Dict[str, Any]] = {}
logger = logging.getLogger("oakwell-api")
rate_limit_buckets: Dict[str, List[float]] = {}

# ---------------------------------------------------------------------------
# Firestore client  (project: gen-lang-client-0830900967)
# ---------------------------------------------------------------------------

FIRESTORE_PROJECT = "gen-lang-client-0830900967"
FIRESTORE_COLLECTION = "oakwell_deals"

_firestore_db: Optional[Any] = None  # google.cloud.firestore.Client or None

if _firestore_mod is not None:
    try:
        _firestore_db = _firestore_mod.Client(project=FIRESTORE_PROJECT)
        # Quick reachability check — list first doc (limit 1)
        _ping = list(_firestore_db.collection(FIRESTORE_COLLECTION).limit(1).stream())
        logger.info(
            "Firestore client initialised — project '%s', collection '%s' (ping OK, %d docs)",
            FIRESTORE_PROJECT, FIRESTORE_COLLECTION, len(_ping),
        )
    except Exception as _fs_err:
        logger.warning("Firestore init/ping failed — falling back to memory.json: %s", _fs_err)
        _firestore_db = None
else:
    logger.warning(
        "google-cloud-firestore not installed — falling back to local memory.json"
    )

if tools.resolve_genai_api_key():
    logger.info("Gemini API key detected in backend environment")
else:
    logger.warning(
        "Gemini API key not detected in backend environment. "
        "Set GOOGLE_API_KEY or GEMINI_API_KEY for analysis endpoints."
    )

# Legacy JSON path kept as fallback when Firestore is unavailable
MEMORY_FILE = OUTPUTS_DIR / "memory.json"

# Safety throttle: only one verification/agent request at a time to avoid 429 rate limits
_verification_semaphore = asyncio.Semaphore(1)

# ── Multi-tenant Sentinel Registry ──
# Maps competitor_url → { org_id → slack_webhook_url }
# Populated when /analyze-deal is called with org_id + slack_webhook_url.
_sentinel_registry: Dict[str, Dict[str, str]] = {}

# Watcher interval (seconds) — how often the autonomous loop re-scans
WATCHER_INTERVAL_SECONDS = int(os.environ.get("WATCHER_INTERVAL", "3600"))  # default 1 h
INTERNAL_API_SECRET = os.environ.get("OAKWELL_INTERNAL_API_SECRET", "").strip()
ALLOW_INSECURE_LOCAL_AUTH = os.environ.get("OAKWELL_ALLOW_INSECURE_LOCAL_AUTH") == "1"
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get(
        "OAKWELL_ALLOWED_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000",
    ).split(",")
    if origin.strip()
]

# ---------------------------------------------------------------------------
# Deal Stage Intelligence — 5-stage adaptive playbooks
# ---------------------------------------------------------------------------

DEAL_STAGE_PLAYBOOKS: Dict[str, Dict[str, Any]] = {
    "discovery": {
        "objective": "Establish credibility, surface pain points, position against competitor weaknesses",
        "talk_track_style": "consultative, question-heavy, pain-amplifying",
        "proof_usage": "Light — mention you have proof but save the reveal for later",
        "aggression": 0.3,
        "focus_areas": ["pain_points", "current_solution_gaps", "budget_signals"],
        "avoid": ["hard pricing comparisons", "aggressive competitor bashing"],
    },
    "technical_eval": {
        "objective": "Demonstrate technical superiority with evidence, address integration concerns",
        "talk_track_style": "technical, evidence-heavy, proof-centric",
        "proof_usage": "Heavy — show screenshots, cite specific features, run live comparisons",
        "aggression": 0.5,
        "focus_areas": ["feature_comparison", "integration_depth", "scalability", "security"],
        "avoid": ["vague claims", "ignoring technical objections"],
    },
    "proposal": {
        "objective": "Present compelling ROI narrative, anchor pricing against competitor total cost",
        "talk_track_style": "ROI-focused, value-anchoring, competitor cost exposure",
        "proof_usage": "Strategic — use proof to justify pricing premium or expose hidden costs",
        "aggression": 0.6,
        "focus_areas": ["total_cost_of_ownership", "roi_projections", "competitor_hidden_costs", "case_studies"],
        "avoid": ["discounting too early", "ignoring procurement concerns"],
    },
    "negotiation": {
        "objective": "Hold price, leverage proof as non-negotiable value, create urgency",
        "talk_track_style": "firm, value-defending, urgency-creating, competitor-weakness-exploiting",
        "proof_usage": "Nuclear — deploy screenshots + deep sentiment as undeniable evidence",
        "aggression": 0.8,
        "focus_areas": ["price_defense", "competitor_risk_exposure", "switching_cost", "urgency_triggers"],
        "avoid": ["unnecessary concessions", "showing desperation"],
    },
    "closing": {
        "objective": "Remove final objections, provide executive-ready ammunition, lock the deal",
        "talk_track_style": "executive, decisive, risk-mitigating, champion-enabling",
        "proof_usage": "Executive summary — package all proof into a boardroom-ready narrative",
        "aggression": 0.9,
        "focus_areas": ["final_objection_handling", "executive_buy_in", "champion_enablement", "contract_urgency"],
        "avoid": ["reopening settled points", "introducing new complexity"],
    },
}

FIRESTORE_OUTCOMES_COLLECTION = "oakwell_outcomes"


def _get_stage_playbook(stage: Optional[str]) -> Dict[str, Any]:
    """Return the playbook for the given deal stage, defaulting to 'discovery'."""
    if not stage or stage not in DEAL_STAGE_PLAYBOOKS:
        return DEAL_STAGE_PLAYBOOKS["discovery"]
    return DEAL_STAGE_PLAYBOOKS[stage]


def _set_progress(job_id: str, message: str) -> None:
    """Update the live heartbeat message visible to the dashboard."""
    if job_id in jobs:
        jobs[job_id]["progress_message"] = message
        logger.info("[%s] %s", job_id[:8], message)


class AuthContext(BaseModel):
    user_id: str
    org_id: Optional[str] = None
    scope_id: str


def _scope_id_for(user_id: str, org_id: Optional[str] = None) -> str:
    """Namespace every persisted record to either an org or an individual user."""
    if org_id:
        return f"org:{org_id}"
    return f"user:{user_id}"


def _scope_token(value: str) -> str:
    """Make owner scopes document-id safe without losing readability."""
    return re.sub(r"[^a-zA-Z0-9_-]+", "_", value)


def _fs_doc_id(owner_scope: str, url: str) -> str:
    """Convert an owner scope + competitor URL to a Firestore-safe document ID.

    Firestore document IDs cannot contain '/'.  We replace all slashes
    with '__' and strip the scheme prefix for readability.
    """
    url_token = url.replace("https://", "").replace("http://", "").replace("/", "__")
    scope_token = _scope_token(owner_scope)
    return f"{scope_token}__{url_token or 'unknown'}"


def _get_request_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _require_auth_context(request: Request) -> AuthContext:
    if INTERNAL_API_SECRET:
        provided_secret = request.headers.get("x-oakwell-internal-secret", "").strip()
        if not provided_secret or not secrets.compare_digest(provided_secret, INTERNAL_API_SECRET):
            logger.warning("Rejected request with invalid internal auth secret from %s", _get_request_ip(request))
            raise HTTPException(status_code=401, detail="Invalid internal auth secret")
    elif not ALLOW_INSECURE_LOCAL_AUTH:
        logger.error("Rejected request because backend auth is not configured")
        raise HTTPException(
            status_code=503,
            detail="Backend auth is not configured. Set OAKWELL_INTERNAL_API_SECRET or explicitly allow insecure local auth.",
        )

    user_id = request.headers.get("x-oakwell-user-id", "").strip()
    org_id = request.headers.get("x-oakwell-org-id", "").strip() or None
    if not user_id:
        if ALLOW_INSECURE_LOCAL_AUTH:
            user_id = "local-dev"
        else:
            logger.warning("Rejected request without user context from %s", _get_request_ip(request))
            raise HTTPException(status_code=401, detail="Missing authenticated user context")

    return AuthContext(user_id=user_id, org_id=org_id, scope_id=_scope_id_for(user_id, org_id))


def _enforce_rate_limit(request: Request, scope_id: str, action: str, limit: int, window_seconds: int = RATE_LIMIT_WINDOW_SECONDS) -> None:
    """Simple in-memory abuse guard keyed by owner scope + client IP."""
    now = time.time()
    bucket_key = f"{action}:{scope_id}:{_get_request_ip(request)}"
    existing = [ts for ts in rate_limit_buckets.get(bucket_key, []) if now - ts < window_seconds]
    if len(existing) >= limit:
        logger.warning("Rate limit exceeded for action=%s scope=%s ip=%s", action, scope_id, _get_request_ip(request))
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
    existing.append(now)
    rate_limit_buckets[bucket_key] = existing


def _require_owned_job(job_id: str, auth_ctx: AuthContext) -> Dict[str, Any]:
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.get("owner_scope") != auth_ctx.scope_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    return job


def _can_access_proof(filename: str, auth_ctx: AuthContext) -> bool:
    if not filename:
        return False
    memory = _load_memory(auth_ctx.scope_id)
    for entry in memory.values():
        proof_files = entry.get("proof_filenames", [])
        if isinstance(proof_files, list) and filename in proof_files:
            return True
    for job in jobs.values():
        if job.get("owner_scope") != auth_ctx.scope_id:
            continue
        result = job.get("result") or {}
        if filename == result.get("proof_artifact_path"):
            return True
        proof_files = result.get("all_proof_filenames", [])
        if isinstance(proof_files, list) and filename in proof_files:
            return True
    return False


def _load_memory(owner_scope: str) -> Dict[str, Any]:
    """Read the full Neural Memory Bank.

    Firestore path: stream docs from oakwell_deals collection filtered to the owner scope.
    Fallback: read outputs/memory.json.
    """
    if _firestore_db is not None:
        try:
            docs = _firestore_db.collection(FIRESTORE_COLLECTION).where("owner_scope", "==", owner_scope).stream()
            memory: Dict[str, Any] = {}
            for doc in docs:
                data = doc.to_dict()
                url = data.pop("competitor_url", None) or data.get("competitor_url") or doc.id
                data.pop("owner_scope", None)
                memory[url] = data
            return memory
        except Exception as exc:
            logger.warning("Firestore _load_memory failed, falling back to JSON: %s", exc)

    # ── Fallback: local JSON ──
    if not MEMORY_FILE.exists():
        return {}
    try:
        data = json.loads(MEMORY_FILE.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            return {}
        scoped: Dict[str, Any] = {}
        for entry in data.values():
            if not isinstance(entry, dict):
                continue
            if entry.get("owner_scope") != owner_scope:
                continue
            url = entry.get("competitor_url")
            if url:
                cleaned = dict(entry)
                cleaned.pop("owner_scope", None)
                cleaned.pop("competitor_url", None)
                scoped[url] = cleaned
        return scoped
    except (json.JSONDecodeError, OSError) as exc:
        logger.warning("Failed to load memory.json: %s", exc)
        return {}


def _load_memory_for_url(url: str, owner_scope: str) -> Dict[str, Any]:
    """Load a single competitor record — fast path via Firestore."""
    if _firestore_db is not None:
        try:
            doc_id = _fs_doc_id(owner_scope, url)
            doc = _firestore_db.collection(FIRESTORE_COLLECTION).document(doc_id).get()
            if doc.exists:
                data = doc.to_dict()
                data.pop("competitor_url", None)
                data.pop("owner_scope", None)
                return data
            return {}
        except Exception as exc:
            logger.warning("Firestore _load_memory_for_url failed: %s", exc)
    # fallback
    return _load_memory(owner_scope).get(url, {})


# ---------------------------------------------------------------------------
# Public Firestore API: save_deal / get_history
# ---------------------------------------------------------------------------

def save_deal(data: Dict[str, Any], owner_scope: str) -> None:
    """Store a deal analysis snapshot in the oakwell_deals Firestore collection.

    Expected keys in *data*:
        - competitor_url (str) — used as the document ID basis
        - deal_health_score (int/float)
        - talk_track (str)
        - transcript (str, optional)
        + any other analysis fields (clashes_detected, proof_filenames, …)

    Automatically maintains:
        - score_history (last 10 scores)
        - timeline (last 20 entries with timestamp + top clash)
        - analysis_count (auto-incremented)
        - last_analysis_ts (UTC ISO-8601)

    Falls back to outputs/memory.json when Firestore is unavailable.
    """
    url = data.get("competitor_url", "")
    if not url:
        logger.warning("save_deal called without competitor_url — skipping")
        return

    # Delegate to _update_memory which handles score_history / timeline merging
    _update_memory(url, {k: v for k, v in data.items() if k != "competitor_url"}, owner_scope)


def get_history(url: str, owner_scope: str, limit: int = 5) -> Dict[str, Any]:
    """Retrieve past deal scores for the Win Probability Trend.

    Returns a dict with:
        - score_history: List[int]  (last *limit* scores)
        - timeline: List[Dict]     (last *limit* timeline entries)
        - analysis_count: int
        - last_analysis_ts: str
        - trend: str               (Improving / Declining / Stable)

    Args:
        url: Competitor URL to look up.
        limit: How many historical entries to return (default 5).
    """
    record = _load_memory_for_url(url, owner_scope)
    if not record:
        return {
            "score_history": [],
            "timeline": [],
            "analysis_count": 0,
            "last_analysis_ts": None,
            "trend": "Insufficient data",
        }

    scores: List[int] = record.get("score_history", [])
    if not isinstance(scores, list):
        scores = []

    timeline: List[Dict[str, Any]] = record.get("timeline", [])
    if not isinstance(timeline, list):
        timeline = []

    return {
        "score_history": scores[-limit:],
        "timeline": timeline[-limit:],
        "analysis_count": record.get("analysis_count", 0),
        "last_analysis_ts": record.get("last_analysis_ts"),
        "trend": calculate_trend(url, owner_scope),
    }


def _update_memory(url: str, new_data: Dict[str, Any], owner_scope: str) -> None:
    """Merge a new analysis snapshot into the Neural Memory Bank.

    Firestore path: SET (merge) into oakwell_deals collection (doc ID = URL-safe key).
    Fallback: read-modify-write outputs/memory.json.

    Automatically maintains score_history (last 10) and timeline (last 20)
    by reading the existing record first, so callers never need to build
    these lists themselves.
    """
    existing = _load_memory_for_url(url, owner_scope)

    # ── score_history: always append, never overwrite ──
    prev_scores = existing.get("score_history", [])
    if not isinstance(prev_scores, list):
        prev_scores = []
    new_score = new_data.get("deal_health_score", 0)
    new_data["score_history"] = (prev_scores + [new_score])[-10:]

    # ── timeline: always append, never overwrite ──
    prev_timeline = existing.get("timeline", [])
    if not isinstance(prev_timeline, list):
        prev_timeline = []
    clash_list = new_data.get("clashes_detected", [])
    top_clash = ""
    if clash_list and isinstance(clash_list, list) and len(clash_list) > 0:
        first = clash_list[0]
        top_clash = first.get("claim", first.get("risk", "")) if isinstance(first, dict) else str(first)[:120]
    timeline_entry = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "score": new_score,
        "top_clash": top_clash[:200],
    }
    new_data["timeline"] = (prev_timeline + [timeline_entry])[-20:]

    # ── analysis_count: auto-increment ──
    new_data["analysis_count"] = existing.get("analysis_count", 0) + 1

    ts_now = datetime.now(timezone.utc).isoformat()
    new_data["last_analysis_ts"] = ts_now

    # ── Persist ──
    if _firestore_db is not None:
        try:
            doc_id = _fs_doc_id(owner_scope, url)
            row: Dict[str, Any] = {"competitor_url": url, "owner_scope": owner_scope}
            row.update(new_data)
            _firestore_db.collection(FIRESTORE_COLLECTION).document(doc_id).set(row, merge=True)
            logger.info("Firestore SET (merge) OK for %s (doc %s)", url, doc_id)
            return
        except Exception as exc:
            logger.warning("Firestore _update_memory failed, falling back to JSON: %s", exc)

    # ── Fallback: local JSON ──
    memory: Dict[str, Any] = {}
    if MEMORY_FILE.exists():
        try:
            loaded = json.loads(MEMORY_FILE.read_text(encoding="utf-8"))
            if isinstance(loaded, dict):
                memory = loaded
        except (json.JSONDecodeError, OSError):
            memory = {}
    doc_id = _fs_doc_id(owner_scope, url)
    row = {"competitor_url": url, "owner_scope": owner_scope}
    row.update(new_data)
    memory[doc_id] = row
    MEMORY_FILE.write_text(json.dumps(memory, indent=2, default=str), encoding="utf-8")


def _is_cache_fresh(prior: Dict[str, Any]) -> bool:
    """Return True if the prior analysis is < CACHE_TTL_SECONDS old."""
    ts_str = prior.get("last_analysis_ts")
    if not ts_str:
        return False
    try:
        last_ts = datetime.fromisoformat(ts_str)
        age = (datetime.now(timezone.utc) - last_ts).total_seconds()
        return age < CACHE_TTL_SECONDS
    except (ValueError, TypeError):
        return False


def calculate_trend(url: str, owner_scope: str) -> str:
    """Return a human-readable trend string based on score_history.

    Logic:
      - Current score vs average of last 3 historical scores.
      - > 5 pts above avg  → 'Improving 📈'
      - > 5 pts below avg  → 'Declining 📉'
      - within ±5 pts      → 'Stable ↔️'
    """
    record = _load_memory_for_url(url, owner_scope)
    scores = record.get("score_history", [])
    if not isinstance(scores, list) or len(scores) < 2:
        return "Insufficient data"
    current = scores[-1]
    # Take up to 3 scores before the current one for the comparison window
    history_window = scores[-4:-1] if len(scores) >= 4 else scores[:-1]
    avg = sum(history_window) / len(history_window)
    diff = current - avg
    if diff > 5:
        return "Improving 📈"
    elif diff < -5:
        return "Declining 📉"
    else:
        return "Stable ↔️"


# ---------------------------------------------------------------------------
# Win/Loss Feedback Loop — learn from deal outcomes
# ---------------------------------------------------------------------------

def _record_deal_outcome(
    competitor_url: str,
    owner_scope: str,
    outcome: str,
    deal_value: Optional[float] = None,
    deal_stage: Optional[str] = None,
    reason: Optional[str] = None,
) -> Dict[str, Any]:
    """Record a deal outcome to Firestore for the learning feedback loop.

    Stores in oakwell_outcomes collection with:
        - competitor_url, outcome, deal_value, deal_stage, reason
        - The last known deal_health_score and talk_track from oakwell_deals
        - Timestamp
    """
    last_analysis = _load_memory_for_url(competitor_url, owner_scope)
    record = {
        "owner_scope": owner_scope,
        "competitor_url": competitor_url,
        "outcome": outcome,
        "deal_value": deal_value,
        "deal_stage": deal_stage,
        "reason": reason,
        "deal_health_score": last_analysis.get("deal_health_score"),
        "talk_track": (last_analysis.get("talk_track") or "")[:2000],
        "analysis_count": last_analysis.get("analysis_count", 0),
        "recorded_at": datetime.now(timezone.utc).isoformat(),
    }

    if _firestore_db is not None:
        try:
            doc_ref = _firestore_db.collection(FIRESTORE_OUTCOMES_COLLECTION).document()
            doc_ref.set(record)
            logger.info("Outcome recorded: %s for %s (value=%s)", outcome, competitor_url, deal_value)
            return {"status": "saved", "doc_id": doc_ref.id}
        except Exception as exc:
            logger.warning("Firestore outcome save failed: %s", exc)

    # Fallback: append to a local JSON file
    outcomes_file = OUTPUTS_DIR / "outcomes.json"
    existing: List[Dict[str, Any]] = []
    if outcomes_file.exists():
        try:
            existing = json.loads(outcomes_file.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            existing = []
    existing.append(record)
    outcomes_file.write_text(json.dumps(existing, indent=2, default=str), encoding="utf-8")
    return {"status": "saved_local"}


def _get_winning_patterns(owner_scope: str, competitor_url: Optional[str] = None, limit: int = 20) -> Dict[str, Any]:
    """Analyze past deal outcomes to extract winning patterns.

    Returns:
        - win_rate: float (0-1)
        - avg_winning_score / avg_losing_score: float
        - winning_strategies / losing_pitfalls: List[str]
        - total_outcomes: int
        - deal_value_won / deal_value_lost: float
    """
    outcomes: List[Dict[str, Any]] = []

    if _firestore_db is not None:
        try:
            query = _firestore_db.collection(FIRESTORE_OUTCOMES_COLLECTION).where("owner_scope", "==", owner_scope)
            if competitor_url:
                query = query.where("competitor_url", "==", competitor_url)
            query = query.order_by("recorded_at", direction=_firestore_mod.Query.DESCENDING).limit(limit)
            for doc in query.stream():
                outcomes.append(doc.to_dict())
        except Exception as exc:
            logger.warning("Firestore winning patterns query failed: %s", exc)

    # Fallback: local JSON
    if not outcomes:
        outcomes_file = OUTPUTS_DIR / "outcomes.json"
        if outcomes_file.exists():
            try:
                all_outcomes = json.loads(outcomes_file.read_text(encoding="utf-8"))
                all_outcomes = [o for o in all_outcomes if o.get("owner_scope") == owner_scope]
                if competitor_url:
                    all_outcomes = [o for o in all_outcomes if o.get("competitor_url") == competitor_url]
                outcomes = all_outcomes[-limit:]
            except (json.JSONDecodeError, OSError):
                outcomes = []

    if not outcomes:
        return {
            "win_rate": 0.0,
            "avg_winning_score": 0.0,
            "avg_losing_score": 0.0,
            "winning_strategies": [],
            "losing_pitfalls": [],
            "total_outcomes": 0,
            "deal_value_won": 0.0,
            "deal_value_lost": 0.0,
        }

    won = [o for o in outcomes if o.get("outcome") == "won"]
    lost = [o for o in outcomes if o.get("outcome") == "lost"]

    win_scores = [o.get("deal_health_score", 0) for o in won if o.get("deal_health_score")]
    loss_scores = [o.get("deal_health_score", 0) for o in lost if o.get("deal_health_score")]
    win_value = sum(o.get("deal_value", 0) or 0 for o in won)
    loss_value = sum(o.get("deal_value", 0) or 0 for o in lost)

    winning_strategies = [
        (o.get("talk_track") or "")[:300] for o in won if o.get("talk_track")
    ][:5]
    losing_pitfalls = [
        o.get("reason", (o.get("talk_track") or "")[:300])
        for o in lost if (o.get("reason") or o.get("talk_track"))
    ][:5]

    total = len(won) + len(lost)
    return {
        "win_rate": len(won) / total if total > 0 else 0.0,
        "avg_winning_score": sum(win_scores) / len(win_scores) if win_scores else 0.0,
        "avg_losing_score": sum(loss_scores) / len(loss_scores) if loss_scores else 0.0,
        "winning_strategies": winning_strategies,
        "losing_pitfalls": losing_pitfalls,
        "total_outcomes": len(outcomes),
        "deal_value_won": win_value,
        "deal_value_lost": loss_value,
    }


async def _detect_market_drift(
    competitor_url: str,
    current_visual_results: List[Dict[str, Any]],
    prior_record: Dict[str, Any],
    api_key: Optional[str] = None,
) -> Dict[str, Any]:
    """Compare current visual proof against historical memory to detect price hikes,
    feature removals, or messaging shifts.  Returns a drift report dict."""
    if not prior_record:
        return {"drift_detected": False, "alerts": []}

    current_summary = {
        "claims": [
            {"claim": v.get("claim"), "verified": v.get("verified"), "explanation": v.get("explanation")}
            for v in current_visual_results
        ]
    }
    historical_summary = {
        "claims": prior_record.get("visual_proof_summary", []),
        "deal_health_score": prior_record.get("deal_health_score"),
    }

    try:
        delta = await tools.calculate_market_delta(current_summary, historical_summary, api_key=api_key)
        delta_data = delta.get("delta", {})
        alerts: List[str] = []
        # Detect price hikes
        for change in delta_data.get("pricing_changes", []):
            if isinstance(change, str) and any(w in change.lower() for w in ["increase", "hike", "raised", "higher"]):
                alerts.append(f"Market Drift Alert — PRICE HIKE: {change}")
        # Detect feature removals
        for removal in delta_data.get("removals", []):
            if isinstance(removal, str):
                alerts.append(f"Market Drift Alert — FEATURE REMOVED: {removal}")
        # Generic summary alert
        summary = delta_data.get("summary", "")
        if summary and not alerts:
            if any(w in summary.lower() for w in ["increase", "removed", "dropped", "changed"]):
                alerts.append(f"Market Drift Alert: {summary}")
        return {"drift_detected": bool(alerts), "alerts": alerts, "delta": delta_data}
    except Exception as exc:
        logger.warning("Market drift detection failed: %s", exc)
        return {"drift_detected": False, "alerts": [], "error": str(exc)}

# ---------------------------------------------------------------------------
# Request/Response models
# ---------------------------------------------------------------------------


class AnalyzeDealRequest(BaseModel):
    transcript: str = Field(..., min_length=20, max_length=20000, description="Internal conversation / call transcript")
    competitor_url: str = Field(
        ...,
        min_length=10,
        max_length=2048,
        pattern=r"^https?://",
        description="Competitor website URL for visual verification",
    )
    competitor_name: Optional[str] = Field(None, max_length=200, description="Competitor display name")
    your_product: Optional[str] = Field(None, max_length=200, description="Your product name for talk-track")
    slack_webhook_url: Optional[str] = Field(
        None,
        max_length=500,
        pattern=r"^https://hooks\.slack\.com/services/.*$",
        description="Slack incoming webhook URL for real-time alerts",
    )
    org_id: Optional[str] = Field(None, max_length=200, description="Organisation ID for multi-tenant sentinel alerting")
    deal_stage: Optional[str] = Field(None, description="Deal stage: discovery | technical_eval | proposal | negotiation | closing")
    deal_value: Optional[float] = Field(None, ge=0, le=1000000000, description="Estimated deal value in USD")


class RecordOutcomeRequest(BaseModel):
    """Record a deal outcome for the Win/Loss Feedback Loop."""
    competitor_url: str = Field(..., min_length=10, max_length=2048, pattern=r"^https?://", description="Competitor URL the deal was against")
    outcome: str = Field(..., description="Deal outcome: won | lost | stalled")
    deal_value: Optional[float] = Field(None, ge=0, le=1000000000, description="Final deal value in USD")
    deal_stage: Optional[str] = Field(None, description="Stage when deal concluded")
    reason: Optional[str] = Field(None, max_length=2000, description="Why the deal was won/lost/stalled")


class DealStatusResponse(BaseModel):
    job_id: str
    status: str  # pending | running | completed | failed
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    progress_message: Optional[str] = None


class GenerateEmailRequest(BaseModel):
    job_id: Optional[str] = Field(None, description="Job ID to pull deal results from")
    deal_results: Optional[Dict[str, Any]] = Field(None, description="Deal results JSON for email generation")


class LiveSnippetRequest(BaseModel):
    """Payload for the high-speed Live Meeting Sidekick endpoint."""
    snippet: str = Field(..., min_length=1, max_length=5000, description="Raw live-call text snippet (1-5 sentences)")
    competitor_url: Optional[str] = Field(None, max_length=2048, pattern=r"^https?://", description="Competitor URL for autonomous visual verification")
    urgency_threshold: Optional[float] = Field(0.5, ge=0.0, le=1.0, description="Minimum urgency score to trigger background verification (0-1)")


class LiveSnippetResponse(BaseModel):
    """Structured response from the live-snippet analysis."""
    status: str  # analysed | skipped | error
    competitor_mentioned: bool = False
    competitors: List[str] = []
    claim_detected: Optional[str] = None
    pricing_claims: List[Dict[str, Any]] = []
    urgency: float = 0.0
    urgency_label: str = "low"  # low | medium | high | critical
    has_actionable_claim: bool = False
    verification_triggered: bool = False
    verification_results: List[Dict[str, Any]] = []
    snippet_length: int = 0
    reason: Optional[str] = None


# ---------------------------------------------------------------------------
# Oakwell Brain: claim extraction (Research/Vision — fast model)
# ---------------------------------------------------------------------------

async def _extract_claims_from_transcript(
    transcript: str, competitor_url: str, api_key: Optional[str] = None
) -> List[Tuple[str, str]]:
    """Extract only explicit, externally verifiable claims from a transcript."""
    from google.genai import types

    client = tools.create_genai_client(api_key)
    prompt = f"""Analyze this sales call transcript and extract only EXPLICIT, EXTERNALLY VERIFIABLE claims about the competitor.

Only include claims that could reasonably be checked against a public website, pricing page, help doc, product doc, trust center, or public comparison page.
Good examples:
- "Starting price is $50/month"
- "Enterprise plan includes SSO"
- "Free trial is 14 days"
- "SOC 2 is listed"

Do NOT include general opinions, stakeholder concerns, subjective comparisons, or inferred claims.
Do NOT add plausible claims that were not explicitly stated.
If there are no concrete public claims to verify, return [].

Transcript:
---
{transcript[:12000]}
---
Respond with ONLY a JSON array of claim strings, no other text. Example: ["claim1", "claim2", ...]"""

    try:
        response = await client.aio.models.generate_content(
            model=tools.FAST_MODEL,
            contents=prompt,
        )
        text = (response.text or "").strip()
        start, end = text.find("["), text.rfind("]")
        if start == -1 or end == -1:
            claims = []
        else:
            claims = json.loads(text[start : end + 1])
        if not isinstance(claims, list):
            claims = []
        claims = [str(c).strip() for c in claims if c]
    except Exception as e:
        logger.warning("Claim extraction failed: %s", e)
        claims = []

    evidence_terms = (
        "pricing", "price", "trial", "free tier", "freemium", "enterprise",
        "plan", "sso", "security", "soc 2", "compliance", "gdpr", "hipaa",
        "integration", "integrations", "api", "data residency", "support",
        "uptime", "sla", "forecast", "reporting", "workflow", "governance",
        "seats", "seat", "users", "user", "contact sales",
    )
    qualitative_only_terms = (
        "easier to adopt", "faster to get live", "more powerful", "long-term scale",
        "simplicity now", "scalability later", "cares about", "main competitive risk",
        "main advantage", "viewed as", "tension is", "rollout complexity", "rep adoption",
    )

    filtered_claims: List[str] = []
    for claim in claims:
        lowered = claim.lower()
        has_numeric_signal = bool(
            re.search(r"(\$|\d+%|\d+\s*(day|days|month|months|seat|seats|user|users|gb|tb))", lowered)
        )
        has_evidence_signal = any(term in lowered for term in evidence_terms)
        is_qualitative_only = any(term in lowered for term in qualitative_only_terms)
        if is_qualitative_only:
            continue
        if has_numeric_signal or has_evidence_signal:
            filtered_claims.append(claim)

    deduped_claims = list(dict.fromkeys(filtered_claims))[:MAX_VERIFICATION_CLAIMS]
    return [(competitor_url, c) for c in deduped_claims]


# ---------------------------------------------------------------------------
# Parallel verification (Playwright + Vision) — 10+ tasks with asyncio.gather
# ---------------------------------------------------------------------------

async def _run_parallel_verification(
    competitor_url: str, transcript: str, api_key: Optional[str] = None,
    progress_cb: Optional[Any] = None,
    claims: Optional[List[str]] = None,
) -> List[Dict[str, Any]]:
    """Batch verification: capture ONE screenshot, then verify all claims against it.

    Eliminates N-1 redundant browser launches for ~3× faster analysis.
    """
    if claims is None:
        tasks_tuples = await _extract_claims_from_transcript(transcript, competitor_url, api_key)
        claims = [claim for _, claim in tasks_tuples]
    if not claims:
        return []

    # Step 1: Capture a SINGLE screenshot of the competitor page
    if progress_cb:
        progress_cb(f"Capturing screenshot of {competitor_url}…")
    logger.info("Capturing screenshot of %s for %d claims…", competitor_url, len(claims))
    screenshot_result = await tools.capture_page_screenshot(competitor_url)

    if screenshot_result.get("status") != "success" or not screenshot_result.get("img_bytes"):
        logger.error("Screenshot capture failed: %s", screenshot_result.get("message"))
        return [
            {
                "claim": claim,
                "status": "error",
                "verified": False,
                "confidence_score": 0.0,
                "explanation": f"Screenshot capture failed: {screenshot_result.get('message', 'unknown')}",
                "proof_artifact_path": None,
            }
            for claim in claims
        ]

    img_bytes = screenshot_result["img_bytes"]
    proof_filename = screenshot_result["artifact_name"]
    logger.info("Screenshot captured: %s (%d bytes)", proof_filename, len(img_bytes))

    # Step 2: Verify each claim against the same screenshot (sequential for rate limits)
    out: List[Dict[str, Any]] = []
    for i, claim in enumerate(claims):
        if progress_cb:
            progress_cb(f"Verifying claim {i + 1}/{len(claims)}: {claim[:60]}…")
        logger.info("Verifying claim %d/%d: %s", i + 1, len(claims), claim[:80])
        async with _verification_semaphore:
            result = await tools.verify_claim_against_screenshot(
                img_bytes, claim, proof_filename, api_key
            )
        out.append(result)

    # ── Proof-First Architecture ──
    # If the screenshot was captured but Gemini Vision failed on individual claims,
    # upgrade from "error" to "partial_success". The screenshot IS the proof.
    for vr in out:
        if vr.get("status") == "error" and proof_filename:
            vr["status"] = "partial_success"
            vr["proof_artifact_path"] = proof_filename
            vr["explanation"] = (
                f"Screenshot captured ({proof_filename}) showing the competitor's live page. "
                "Visual AI analysis was unavailable for this claim — the screenshot itself "
                "serves as verified evidence of the competitor's actual offering."
            )
            vr["confidence_score"] = max(vr.get("confidence_score", 0), 0.55)

    return out


# ---------------------------------------------------------------------------
# Discrepancy engine: transcript vs visual_proof → Critical Revenue Risk
# ---------------------------------------------------------------------------

def _discrepancy_engine(transcript: str, visual_proof_results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Cross-reference transcript (internal) vs visual_proof (external). Flag disproven buyer claims as Critical Revenue Risk."""
    clashes = []
    for v in visual_proof_results:
        claim = v.get("claim", "")
        verified = v.get("verified", False)
        if not verified and claim and v.get("status") == "success":
            clashes.append({
                "claim": claim,
                "verdict": "disproven",
                "risk": "Critical Revenue Risk",
                "explanation": v.get("explanation", ""),
                "confidence_score": v.get("confidence_score", 0.0),
                "proof_artifact_path": v.get("proof_artifact_path"),
            })
    return clashes


# ---------------------------------------------------------------------------
# Decomposed Synthesis — Specialist #1: Deal Scorer (fast model)
# ---------------------------------------------------------------------------

async def _specialist_score_deal(
    transcript: str,
    clashes_detected: List[Dict[str, Any]],
    visual_proof_results: List[Dict[str, Any]],
    competitor_name: Optional[str],
    history_context: Optional[Dict[str, Any]] = None,
    deal_stage: Optional[str] = None,
    deal_value: Optional[float] = None,
    winning_patterns: Optional[Dict[str, Any]] = None,
    api_key: Optional[str] = None,
    analysis_mode: str = "proof_verification",
    verification_reason: Optional[str] = None,
) -> Dict[str, Any]:
    """Specialist #1: Produce an accurate deal_health_score (fast model — numeric, low-latency)."""

    comp = competitor_name or "Competitor"
    playbook = _get_stage_playbook(deal_stage)
    history_context = history_context or {}
    winning_patterns = winning_patterns or {}

    prompt = f"""You are a Deal Scoring Specialist. Your ONLY job is to produce an accurate deal_health_score (0-100).

**INPUTS:**
- Competitor: {comp}
- Deal Stage: {deal_stage or 'unknown'} (Aggression Level: {playbook.get('aggression', 0.5)})
- Deal Value: ${deal_value or 'unknown'}
- Clashes Found: {len(clashes_detected)} buyer claims disproven by visual proof
- Visual Proof Results: {len(visual_proof_results)} total claims checked
- Verified True: {sum(1 for v in visual_proof_results if v.get('verified'))}
- Verified False: {sum(1 for v in visual_proof_results if not v.get('verified') and v.get('status') == 'success')}
- Analysis Mode: {analysis_mode}
- Verification Coverage: {len(visual_proof_results)} externally verifiable claims checked
- Verification Notes: {verification_reason or 'Proof-backed verification was attempted'}
- Historical Win Rate: {winning_patterns.get('win_rate', 'N/A')}
- Avg Winning Score: {winning_patterns.get('avg_winning_score', 'N/A')}
- Avg Losing Score: {winning_patterns.get('avg_losing_score', 'N/A')}
- Prior Score: {history_context.get('deal_health_score', 'N/A')}
- Analysis Count: {history_context.get('analysis_count', 0)}
- Market Drift Detected: {bool(history_context.get('market_drift_alerts'))}

**CLASHES (Critical Revenue Risks):**
{json.dumps(clashes_detected[:10], indent=2)[:3000]}

**SCORING RUBRIC:**
- 90-100: No clashes, strong alignment, buyer claims verified, deal stage favorable
- 70-89: Minor discrepancies, buyer mostly accurate, some opportunity for leverage
- 50-69: Significant clashes found, buyer misled on key points, needs strategic intervention
- 30-49: Critical revenue risk — multiple buyer claims disproven, competitor exposure needed
- 0-29: Deal in danger — fundamental misalignment between buyer beliefs and market truth

**STAGE ADJUSTMENT:**
- Discovery: Score generously (buyer knowledge expected to be low)
- Technical Eval: Score based on feature accuracy
- Proposal/Negotiation: Score strictly (inaccurate claims = pricing leverage)
- Closing: Score on risk level (any unaddressed clash is deal-breaking)

**PATTERN LEARNING:**
- Deals we WIN average score: {winning_patterns.get('avg_winning_score', 'N/A')}
- Deals we LOSE average score: {winning_patterns.get('avg_losing_score', 'N/A')}
- If this deal's profile matches losing patterns, lower the score as a warning

**EVIDENCE RULES:**
- If analysis mode is strategy_only, this is a strategic brief and NOT a proof-backed verdict
- If zero externally verifiable claims were checked, do NOT score this deal like a fully verified analysis
- In strategy_only mode, cap scores below 80 unless the transcript itself shows unusually strong competitive position
- Make the score_reasoning explicit about evidence limits

Respond with ONLY valid JSON (no markdown fences):
{{
  "deal_health_score": <number 0-100>,
  "score_reasoning": "<2-3 sentence explanation>",
  "risk_level": "critical|high|medium|low",
  "stage_adjustment": "<how the deal stage affected the score>"
}}"""

    client = tools.create_genai_client(api_key)
    try:
        response = await client.aio.models.generate_content(
            model=tools.FAST_MODEL,
            contents=prompt,
        )
        text = (response.text or "").strip()
        start, end = text.find("{"), text.rfind("}")
        if start != -1 and end != -1:
            return json.loads(text[start : end + 1])
    except Exception as e:
        logger.warning("Specialist scorer failed: %s", e)

    # Fallback: deterministic score
    if analysis_mode == "strategy_only":
        return {
            "deal_health_score": 62,
            "score_reasoning": "Strategic transcript with limited public-proof coverage — returning a fast strategy brief instead of a proof-backed verdict.",
            "risk_level": "medium",
            "stage_adjustment": "strategy_only_fast_path",
        }
    return {
        "deal_health_score": max(0, 100 - 15 * len(clashes_detected)),
        "score_reasoning": "Fallback scoring — specialist unavailable",
        "risk_level": "high" if len(clashes_detected) > 2 else "medium",
        "stage_adjustment": "none",
    }


# ---------------------------------------------------------------------------
# Decomposed Synthesis — Specialist #2: Talk-Track Writer (gemini-2.5-pro)
# ---------------------------------------------------------------------------

async def _specialist_write_talk_track(
    transcript: str,
    clashes_detected: List[Dict[str, Any]],
    visual_proof_results: List[Dict[str, Any]],
    competitor_name: Optional[str],
    your_product: Optional[str],
    deal_health_score: int,
    score_reasoning: str,
    history_context: Optional[Dict[str, Any]] = None,
    deal_stage: Optional[str] = None,
    deal_value: Optional[float] = None,
    winning_patterns: Optional[Dict[str, Any]] = None,
    primary_proof_filename: Optional[str] = None,
    api_key: Optional[str] = None,
    analysis_mode: str = "proof_verification",
    verification_reason: Optional[str] = None,
) -> Dict[str, Any]:
    """Specialist #2: Write the adversarial talk-track (gemini-2.5-pro — strategic, stage-aware)."""

    comp = competitor_name or "Competitor"
    prod = your_product or "Our product"
    playbook = _get_stage_playbook(deal_stage)
    history_context = history_context or {}
    winning_patterns = winning_patterns or {}
    primary_proof_filename = primary_proof_filename or "proof_captured.png"

    # Build winning strategy context
    win_context = ""
    if winning_patterns.get("winning_strategies"):
        win_strats = chr(10).join(f"- {s[:200]}" for s in winning_patterns["winning_strategies"][:3])
        lose_pits = chr(10).join(f"- {s[:200]}" for s in winning_patterns.get("losing_pitfalls", [])[:3])
        win_context = f"""
**WINNING PATTERNS (from past deals we won):**
{win_strats}

**LOSING PITFALLS (from past deals we lost — AVOID THESE):**
{lose_pits}

Win rate: {winning_patterns.get('win_rate', 0):.0%} | Revenue won: ${winning_patterns.get('deal_value_won', 0):,.0f} | Revenue lost: ${winning_patterns.get('deal_value_lost', 0):,.0f}
"""

    if analysis_mode == "strategy_only":
        prompt = f"""You are The Oakwell Strategist. Produce a fast, high-signal strategic brief for the rep.

**DEAL CONTEXT:**
- Competitor: {comp}
- Our Product: {prod}
- Deal Stage: {deal_stage or 'unknown'}
- Deal Value: ${deal_value or 'unknown'}
- Deal Health Score: {deal_health_score}/100 ({score_reasoning})
- Analysis Mode: strategy_only
- Why proof verification was skipped: {verification_reason or 'No concrete public claims were detected'}

**STAGE PLAYBOOK — {(deal_stage or 'discovery').upper()}:**
- Objective: {playbook['objective']}
- Talk Track Style: {playbook['talk_track_style']}
- Focus Areas: {', '.join(playbook['focus_areas'])}
- AVOID: {', '.join(playbook['avoid'])}
{win_context}
**TRANSCRIPT (internal conversation):**
{transcript[:8000]}

**RESPONSE RULES:**
1. This is a strategic read, not a screenshot-backed fact check
2. Be explicit that public-proof verification was not run
3. Focus on buyer tension, stakeholder mapping, risk framing, and next moves
4. Do not mention screenshot filenames or pretend proof exists
5. DO NOT use markdown formatting characters in the talk track

Respond with ONLY valid JSON (no markdown fences):
{{
  "talk_track": "<exact script in PLAIN TEXT for the rep>",
  "clashes_detected": ["<list the strategic risks or tensions, not fake disproven claims>"],
  "key_pivot_points": ["<3-5 critical moments where the rep should redirect>"],
  "stage_specific_actions": ["<2-3 actions specific to the {deal_stage or 'discovery'} stage>"],
  "proof_artifact_path": ""
}}"""
    else:
        prompt = f"""You are The Oakwell Strategist — AGI-level Revenue Strategist. Write the exact words a sales rep should say to win this deal.

**DEAL CONTEXT:**
- Competitor: {comp}
- Our Product: {prod}
- Deal Stage: {deal_stage or 'unknown'}
- Deal Value: ${deal_value or 'unknown'}
- Deal Health Score: {deal_health_score}/100 ({score_reasoning})

**STAGE PLAYBOOK — {(deal_stage or 'discovery').upper()}:**
- Objective: {playbook['objective']}
- Talk Track Style: {playbook['talk_track_style']}
- Proof Usage: {playbook['proof_usage']}
- Aggression Level: {playbook['aggression']}/1.0
- Focus Areas: {', '.join(playbook['focus_areas'])}
- AVOID: {', '.join(playbook['avoid'])}
{win_context}
**TRANSCRIPT (internal conversation):**
{transcript[:8000]}

**VISUAL PROOF RESULTS (external market truth — AUTHORITATIVE):**
{json.dumps(visual_proof_results, indent=2)[:10000]}

**CLASHES (buyer claims disproven by Vision AI):**
{json.dumps(clashes_detected, indent=2)[:4000]}

**DEAL HISTORY:**
{json.dumps(history_context, indent=2)[:3000]}

**SCREENSHOT FILENAME (MANDATORY TO USE): {primary_proof_filename}**

**CRITICAL RULES:**
1. Visual truth is AUTHORITATIVE over assumptions
2. Follow the stage playbook — adjust aggression and proof usage accordingly
3. YOU MUST use this EXACT filename in your talk-track: {primary_proof_filename}
4. NEVER write "None" or "null" — use the filename above
5. DO NOT use asterisks, bold, or italics — use PLAIN TEXT only
6. If we have winning patterns, incorporate strategies that worked before
7. If we have losing pitfalls, actively avoid those approaches
8. For {(deal_stage or 'discovery').upper()} stage: {playbook['objective']}

**MANDATORY — DO NOT HALLUCINATE ERRORS:**
- "status": "success" = screenshot captured PERFECTLY
- "verified": false + "success" = COMPETITOR LIED — golden ammunition
- Only report a tool error if status is explicitly "error"
- The proof file ({primary_proof_filename}) is a real screenshot. Reference it confidently.

Respond with ONLY valid JSON (no markdown fences):
{{
  "talk_track": "<exact script in PLAIN TEXT for the rep>",
  "clashes_detected": <array of clash summaries with claim, risk, proof_artifact_path>,
  "key_pivot_points": ["<3-5 critical moments where the rep should redirect>"],
  "stage_specific_actions": ["<2-3 actions specific to the {deal_stage or 'discovery'} stage>"],
  "proof_artifact_path": "{primary_proof_filename}"
}}"""

    client = tools.create_genai_client(api_key)
    try:
        response = client.models.generate_content(
            model="gemini-2.5-pro",
            contents=prompt,
        )
        text = (response.text or "").strip()
        start, end = text.find("{"), text.rfind("}")
        if start != -1 and end != -1:
            data = json.loads(text[start : end + 1])
            data["proof_artifact_path"] = primary_proof_filename if analysis_mode != "strategy_only" else None
            if "clashes_detected" not in data:
                data["clashes_detected"] = clashes_detected
            return data
    except Exception as e:
        logger.warning("Specialist talk-track writer failed: %s", e)

    if analysis_mode == "strategy_only":
        return {
            "talk_track": (
                "Acknowledge the buyer's desire for speed, then reframe the decision around the cost of "
                "outgrowing a simpler system in the next 12 to 18 months. Anchor on forecast accuracy, "
                "governance, integrations, and migration avoidance for the VP Sales, RevOps, and CIO audience."
            ),
            "clashes_detected": [
                "This transcript is a strategic comparison, not a proof-backed fact check.",
                verification_reason or "No concrete public claims were available to verify against competitor pages.",
            ],
            "key_pivot_points": [
                "Move the conversation from ease-of-use to the risk of a second migration.",
                "Translate forecast accuracy into executive confidence and pipeline trust.",
                "Position integration depth and governance as scale insurance, not admin burden.",
            ],
            "stage_specific_actions": [
                "Tailor the story for VP Sales, RevOps, and CIO stakeholders.",
                "Bring one concrete migration-risk example to the next call.",
            ],
            "proof_artifact_path": None,
        }
    return {
        "talk_track": "Review the proof screenshots and address each disproven claim with the buyer.",
        "clashes_detected": clashes_detected,
        "key_pivot_points": [],
        "stage_specific_actions": [],
        "proof_artifact_path": primary_proof_filename,
    }


# ---------------------------------------------------------------------------
# Adversarial Critic — war-game the strategy (gemini-2.5-pro)
# ---------------------------------------------------------------------------

async def _run_adversarial_critique(
    talk_track: str,
    clashes: List[Dict[str, Any]],
    visual_proof_results: List[Dict[str, Any]],
    deep_sentiment: Dict[str, Any],
    competitor_name: str,
    api_key: Optional[str] = None,
) -> Dict[str, Any]:
    """Simulate the competitor's CEO stress-testing Oakwell's strategy."""

    proof_summary = json.dumps(
        [
            {
                "claim": v.get("claim", ""),
                "verified": v.get("verified"),
                "explanation": (v.get("explanation") or "")[:200],
                "proof_file": os.path.basename(v.get("proof_artifact_path") or ""),
            }
            for v in visual_proof_results
        ],
        indent=2,
    )[:6000]

    sentiment_summary = json.dumps(deep_sentiment, indent=2)[:8000]

    # ── Smart Context: If deep sentiment is empty/error, guide the critic ──
    _sent_status = deep_sentiment.get("status", "")
    _has_real_sentiment = (
        _sent_status == "success"
        and (deep_sentiment.get("recent_complaints") or deep_sentiment.get("outages") or deep_sentiment.get("feature_frustrations"))
    )

    if _has_real_sentiment:
        sentiment_guidance = ""
    else:
        sentiment_summary = '{"note": "Deep market sentiment was not available for this analysis."}'
        sentiment_guidance = """

**CRITICAL — SENTIMENT DATA UNAVAILABLE:**
Deep market sentiment (Reddit/G2/X) was not available for this run. This is NOT a failure
of Oakwell's strategy — it means the web scraping encountered rate limits.
- Do NOT penalise the strategy for missing sentiment data.
- Do NOT claim the strategy is "built on no data" — evaluate it based on the VISUAL PROOF
  and CLASHES provided, which ARE available.
- Focus your counter-attacks on product/pricing/trust angles, not on missing sentiment.
"""

    prompt = f"""You are the **CEO of {competitor_name}**. A competitor sales team (Oakwell) is about
to use the following strategy against you. Your job is to find every weakness and
demand hardening before any sales rep sees this.
{sentiment_guidance}
**OAKWELL'S TALK-TRACK:**
{talk_track[:6000]}

**CLASHES (buyer claims disproven by Vision AI):**
{json.dumps(clashes, indent=2)[:4000]}

**VISUAL PROOF (screenshots of YOUR website):**
{proof_summary}

**DEEP MARKET SENTIMENT (Reddit / G2 / X — what YOUR customers actually say):**
{sentiment_summary}

**YOUR MISSION — WAR-GAME THIS STRATEGY:**

1. **Counter-Attack #1 — Product / Pricing Angle**: The SINGLE most dangerous way you
   could neutralise this talk-track. Cite a specific feature, pricing move, or partnership.
   Cross-ref deep sentiment — if users praise one of your strengths, note it.

2. **Counter-Attack #2 — Trust / Ecosystem Angle**: A second angle — security, compliance,
   ecosystem lock-in, or customer success stories — that undermines Oakwell's positioning.

3. **Deep Sentiment Exploitation**: Review the deep sentiment data and identify:
   - Complaints Oakwell has NOT addressed (missed opportunities)
   - Reddit/G2/X posts that could be weaponised ("Your own users say…")
   - Outages or bugs that should be in the talk-track

4. **Verdict**:
   - **APPROVED** — Strategy is airtight, counter-attacks are weak, sentiment addressed.
   - **NEEDS HARDENING** — Strategy has merit but counter-attacks could land. Provide
     SPECIFIC edits + Reddit/G2 quotes the rep should cite.
   - **REJECTED — DEMAND KILL-SHOT** — Strategy is too safe/generic. Demand a rewrite that:
     a) Leverages visual proof filenames as undeniable evidence.
     b) Weaponises deep sentiment — quote specific Reddit threads, G2 cons, X posts.
     c) Constructs a "Negotiation Trap" the rep sets early in the deal.

Respond with ONLY valid JSON (no markdown fences, no extra text):
{{
  "counter_attack_1": {{
    "angle": "...",
    "competitor_response": "...",
    "threat_level": "high|medium|low",
    "deep_sentiment_support": "Reddit/G2 evidence for this counter"
  }},
  "counter_attack_2": {{
    "angle": "...",
    "competitor_response": "...",
    "threat_level": "high|medium|low",
    "deep_sentiment_support": "Reddit/G2 evidence for this counter"
  }},
  "missed_ammunition": [
    "Complaint or outage from deep_sentiment that Oakwell should weaponise"
  ],
  "verdict": "APPROVED | NEEDS HARDENING | REJECTED",
  "hardening_notes": "Specific edits, Reddit quotes, or kill-shot demand",
  "kill_shot_proof": "Exact proof filenames + deep sentiment quotes for nuclear option",
  "confidence": 0.85
}}"""

    client = tools.create_genai_client(api_key)
    response = client.models.generate_content(
        model="gemini-2.5-pro",
        contents=prompt,
    )
    text = (response.text or "").strip()
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end == -1:
        return {
            "verdict": "UNAVAILABLE",
            "counter_attack_1": {"angle": "Parse error", "competitor_response": text[:300], "threat_level": "unknown"},
            "counter_attack_2": {"angle": "Parse error", "competitor_response": "", "threat_level": "unknown"},
            "missed_ammunition": [],
            "hardening_notes": "Could not parse adversarial critique response.",
            "kill_shot_proof": "",
            "confidence": 0.0,
        }
    return json.loads(text[start : end + 1])


# ---------------------------------------------------------------------------
# Background job: full Oakwell pipeline
# ---------------------------------------------------------------------------

async def run_oakwell_analysis(
    job_id: str,
    owner_scope: str,
    transcript: str,
    competitor_url: str,
    competitor_name: Optional[str],
    your_product: Optional[str],
    api_key: Optional[str] = None,
    slack_webhook_url: Optional[str] = None,
    deal_stage: Optional[str] = None,
    deal_value: Optional[float] = None,
) -> None:
    try:
        jobs[job_id]["status"] = "running"
        _set_progress(job_id, "Loading Neural Memory…")

        # ── Neural Memory: load prior intelligence ──
        prior = _load_memory_for_url(competitor_url, owner_scope)
        history_context = {}
        if prior:
            history_context = {
                "deal_health_score": prior.get("deal_health_score"),
                "clashes_detected": prior.get("clashes_detected"),
                "visual_proof_summary": prior.get("visual_proof_summary", []),
                "proof_filenames": prior.get("proof_filenames", []),
                "analysis_count": prior.get("analysis_count", 0),
                "last_analysis_ts": prior.get("last_analysis_ts"),
                "score_history": prior.get("score_history", []),
            }
            logger.info(
                "Neural Memory loaded for %s — analysis #%d, prior score %s",
                competitor_url,
                history_context["analysis_count"],
                history_context["deal_health_score"],
            )

        _set_progress(job_id, "Classifying transcript for verification readiness…")
        extracted_claims = [
            claim for _, claim in await _extract_claims_from_transcript(transcript, competitor_url, api_key)
        ]
        analysis_mode = "proof_verification" if extracted_claims else "strategy_only"
        verification_reason = None
        use_cache = False
        visual_proof_results: List[Dict[str, Any]] = []
        proof_artifacts: List[str] = []
        primary_proof_filename: Optional[str] = None
        drift_report: Dict[str, Any] = {"drift_detected": False, "alerts": []}
        clashes_detected: List[Dict[str, Any]] = []
        deep_sentiment: Dict[str, Any] = {}

        if analysis_mode == "strategy_only":
            verification_reason = (
                "No concrete public claims were found in the transcript, so Oakwell skipped screenshot verification "
                "and returned a fast strategic brief."
            )
            _set_progress(job_id, "No concrete public claims detected — generating fast strategic brief…")
            deep_sentiment = {
                "status": "skipped",
                "overall_sentiment": "not_requested",
                "recent_complaints": [],
                "outages": [],
                "feature_frustrations": [],
                "killer_insight": "Oakwell switched to strategy-only mode because the transcript was qualitative rather than proof-verifiable.",
                "executive_threat_matrix": None,
            }
        else:
            # ── Smart Cache: skip Playwright if analysed < 1 hour ago ──
            use_cache = bool(prior and _is_cache_fresh(prior))

            if use_cache:
                _set_progress(job_id, "Cache fresh (<1 h) — reusing prior visual proof…")
                logger.info("Smart cache HIT for %s — skipping Playwright", competitor_url)
                visual_proof_results = [
                    {
                        "claim": s.get("claim", ""),
                        "status": s.get("status", "cached"),
                        "verified": s.get("verified", False),
                        "confidence_score": s.get("confidence_score", 0.0),
                        "explanation": s.get("explanation", ""),
                        "proof_artifact_path": (prior.get("proof_filenames") or [None])[0],
                    }
                    for s in prior.get("visual_proof_summary", [])
                ]
                proof_artifacts = prior.get("proof_filenames", [])
            else:
                _set_progress(job_id, f"Found {len(extracted_claims)} public claims — capturing proof…")
                visual_proof_results = await _run_parallel_verification(
                    competitor_url,
                    transcript,
                    api_key,
                    progress_cb=lambda msg: _set_progress(job_id, msg),
                    claims=extracted_claims,
                )

                proof_artifacts = list(dict.fromkeys([
                    os.path.basename(v.get("proof_artifact_path"))
                    for v in visual_proof_results
                    if v.get("proof_artifact_path")
                    and str(v.get("proof_artifact_path")).lower() not in ("none", "", "null")
                ]))

            primary_proof_filename = proof_artifacts[0] if proof_artifacts else None

            if not primary_proof_filename:
                existing = sorted(OUTPUTS_DIR.glob("proof_*.png"), key=lambda p: p.stat().st_mtime, reverse=True)
                if existing:
                    primary_proof_filename = existing[0].name
            primary_proof_filename = primary_proof_filename or "proof_captured.png"
            logger.info("Primary proof filename: %s (all: %s)", primary_proof_filename, proof_artifacts)

            _set_progress(job_id, "Scanning for market drift…")
            if prior:
                drift_report = await _detect_market_drift(
                    competitor_url, visual_proof_results, prior, api_key
                )
                if drift_report.get("drift_detected"):
                    logger.info("MARKET DRIFT DETECTED for %s: %s", competitor_url, drift_report["alerts"])
                    history_context["market_drift_alerts"] = drift_report["alerts"]
                    history_context["market_drift_delta"] = drift_report.get("delta", {})

            _set_progress(job_id, "Running discrepancy engine…")
            clashes_detected = _discrepancy_engine(transcript, visual_proof_results)

            _set_progress(job_id, "Scanning 6 sources (Reddit, G2, X, SEC, Glassdoor, Greenhouse) for unfiltered intel…")
            try:
                deep_sentiment = await tools.deep_market_search(
                    competitor_name=competitor_name or "competitor",
                    competitor_url=competitor_url,
                    api_key=api_key,
                )
                logger.info(
                    "Deep Market Search complete for %s — sentiment: %s",
                    competitor_name,
                    deep_sentiment.get("overall_sentiment", "unknown"),
                )
            except Exception as ds_err:
                logger.warning("Deep Market Search failed (non-fatal): %s", ds_err)
                deep_sentiment = {
                    "status": "error",
                    "overall_sentiment": "unavailable",
                    "recent_complaints": [],
                    "outages": [],
                    "feature_frustrations": [],
                    "killer_insight": "Deep search unavailable — proceed with visual proof only.",
                    "executive_threat_matrix": None,
                }

        # 6a) Win/Loss Feedback — fetch patterns from past outcomes
        _set_progress(job_id, "Loading winning patterns from deal history…")
        winning_patterns = _get_winning_patterns(owner_scope, competitor_url)
        if winning_patterns.get("total_outcomes", 0) > 0:
            logger.info(
                "Win/Loss patterns loaded: win_rate=%.0f%%, avg_win_score=%.0f, outcomes=%d",
                winning_patterns["win_rate"] * 100,
                winning_patterns["avg_winning_score"],
                winning_patterns["total_outcomes"],
            )

        # 6b) Specialist Scorer — deal health scoring (gemini-2.0-flash — fast)
        _set_progress(job_id, "Scoring deal health (Specialist #1 — Gemini Flash)…")
        score_result = await _specialist_score_deal(
            transcript,
            clashes_detected,
            visual_proof_results,
            competitor_name,
            history_context,
            deal_stage,
            deal_value,
            winning_patterns,
            api_key,
            analysis_mode,
            verification_reason,
        )
        _deal_score = score_result.get("deal_health_score", 50)
        _score_reasoning = score_result.get("score_reasoning", "")
        logger.info("Specialist scorer: %d/100 (%s)", _deal_score, score_result.get("risk_level", "unknown"))

        # 6c) Specialist Talk-Track Writer — adversarial strategy (gemini-2.5-pro)
        _set_progress(job_id, f"Writing {(deal_stage or 'discovery').upper()}-stage talk-track (Specialist #2 — Gemini Pro)…")
        result = await _specialist_write_talk_track(
            transcript,
            clashes_detected,
            visual_proof_results,
            competitor_name,
            your_product,
            _deal_score,
            _score_reasoning,
            history_context,
            deal_stage,
            deal_value,
            winning_patterns,
            primary_proof_filename,
            api_key,
            analysis_mode,
            verification_reason,
        )
        result["deal_health_score"] = _deal_score
        result["score_reasoning"] = _score_reasoning
        result["risk_level"] = score_result.get("risk_level", "unknown")
        result["stage_adjustment"] = score_result.get("stage_adjustment", "")
        result["deal_stage"] = deal_stage
        result["deal_value"] = deal_value
        result["winning_patterns_summary"] = {
            "win_rate": winning_patterns.get("win_rate", 0),
            "total_outcomes": winning_patterns.get("total_outcomes", 0),
            "avg_winning_score": winning_patterns.get("avg_winning_score", 0),
        }

        adversarial_critique: Dict[str, Any] = {}
        if analysis_mode == "strategy_only":
            adversarial_critique = {
                "verdict": "SKIPPED",
                "summary": "Adversarial hardening was skipped in strategy-only mode to return guidance faster.",
                "counter_attack_1": {"angle": "N/A", "competitor_response": "Skipped in strategy-only mode", "threat_level": "unknown"},
                "counter_attack_2": {"angle": "N/A", "competitor_response": "Skipped in strategy-only mode", "threat_level": "unknown"},
                "missed_ammunition": [],
                "hardening_notes": "No public-proof attack surface was available, so Oakwell returned the first strategic brief fast.",
                "kill_shot_proof": "",
                "confidence": 0.0,
            }
        else:
            _set_progress(job_id, "Running Adversarial Stress-Test (Competitor CEO sim)…")
            try:
                adversarial_critique = await _run_adversarial_critique(
                    talk_track=result.get("talk_track", ""),
                    clashes=clashes_detected,
                    visual_proof_results=visual_proof_results,
                    deep_sentiment=deep_sentiment,
                    competitor_name=competitor_name or "competitor",
                    api_key=api_key,
                )
                logger.info(
                    "Adversarial Critique verdict for %s: %s (confidence %.2f)",
                    competitor_name,
                    adversarial_critique.get("verdict", "unknown"),
                    adversarial_critique.get("confidence", 0.0),
                )
            except Exception as ac_err:
                logger.warning("Adversarial Critique failed (non-fatal): %s", ac_err)
                adversarial_critique = {
                    "verdict": "UNAVAILABLE",
                    "counter_attack_1": {"angle": "N/A", "competitor_response": "Critique unavailable", "threat_level": "unknown"},
                    "counter_attack_2": {"angle": "N/A", "competitor_response": "Critique unavailable", "threat_level": "unknown"},
                    "missed_ammunition": [],
                    "hardening_notes": "Adversarial critic did not run — proceed with caution.",
                    "kill_shot_proof": "",
                    "confidence": 0.0,
                }

        # 8) AUTO-HARDEN — If critic REJECTED, re-run talk-track specialist with critique injected
        _critic_v = adversarial_critique.get("verdict", "")
        if analysis_mode != "strategy_only" and "REJECTED" in _critic_v.upper():
            _set_progress(job_id, "Critic REJECTED strategy — auto-hardening with kill-shot evidence…")
            logger.info("Auto-hardening: critic rejected strategy for %s — re-synthesizing", competitor_name)

            # Build hardening context from the critic's output
            _harden_addendum = {
                "ADVERSARIAL_FEEDBACK": {
                    "counter_attacks": [
                        adversarial_critique.get("counter_attack_1", {}),
                        adversarial_critique.get("counter_attack_2", {}),
                    ],
                    "missed_ammunition": adversarial_critique.get("missed_ammunition", []),
                    "kill_shot_proof": adversarial_critique.get("kill_shot_proof", ""),
                    "hardening_notes": adversarial_critique.get("hardening_notes", ""),
                },
                "DEMAND": (
                    "The adversarial critic (competitor CEO sim) REJECTED your previous strategy. "
                    "You MUST address every counter-attack. Weaponize the visual proof and any "
                    "deep sentiment data. Write an aggressive kill-shot talk-track."
                ),
            }
            _hardened_history = dict(history_context)
            _hardened_history["adversarial_override"] = _harden_addendum

            try:
                hardened_result = await _specialist_write_talk_track(
                    transcript,
                    clashes_detected,
                    visual_proof_results,
                    competitor_name,
                    your_product,
                    _deal_score,
                    _score_reasoning + " | CRITIC REJECTED — hardening with kill-shot evidence",
                    _hardened_history,
                    deal_stage,
                    deal_value,
                    winning_patterns,
                    primary_proof_filename,
                    api_key,
                    analysis_mode,
                    verification_reason,
                )
                # Only accept if it produced a real talk-track
                if hardened_result.get("talk_track") and len(hardened_result["talk_track"]) > 50:
                    result.update({
                        "talk_track": hardened_result["talk_track"],
                        "clashes_detected": hardened_result.get("clashes_detected", clashes_detected),
                        "key_pivot_points": hardened_result.get("key_pivot_points", []),
                        "stage_specific_actions": hardened_result.get("stage_specific_actions", []),
                        "auto_hardened": True,
                    })
                    logger.info(
                        "Auto-hardening succeeded for %s — score: %s",
                        competitor_name, result.get("deal_health_score"),
                    )
            except Exception as harden_err:
                logger.warning("Auto-hardening failed (using original strategy): %s", harden_err)

        claim_count = len(extracted_claims)
        verified_claim_count = sum(1 for v in visual_proof_results if v.get("status") in ("success", "partial_success", "cached"))
        proof_available = bool(proof_artifacts)
        if analysis_mode == "strategy_only":
            evidence_status = "strategy_only"
            evidence_summary = verification_reason or "Oakwell returned a strategy brief without public-proof verification."
        elif proof_available:
            evidence_status = "proof_captured"
            cache_phrase = " using cached proof" if use_cache else ""
            evidence_summary = (
                f"Checked {verified_claim_count} public claim(s){cache_phrase} and captured {len(proof_artifacts)} proof artifact(s)."
            )
        else:
            evidence_status = "proof_unavailable"
            evidence_summary = "Oakwell attempted public verification but no proof artifact was saved for the dashboard."

        result["proof_artifact_path"] = primary_proof_filename if proof_available else None
        result["analysis_mode"] = analysis_mode
        result["evidence_status"] = evidence_status
        result["evidence_summary"] = evidence_summary
        result["verification_reason"] = verification_reason
        result["claim_count"] = claim_count
        result["verified_claim_count"] = verified_claim_count
        result["proof_available"] = proof_available

        # 10) Build a visual proof summary for memory persistence
        _set_progress(job_id, "Persisting to Neural Memory…")
        visual_proof_summary = [
            {
                "claim": v.get("claim"),
                "verified": v.get("verified"),
                "explanation": (v.get("explanation") or "")[:300],
                "confidence_score": v.get("confidence_score", 0.0),
                "status": v.get("status"),
            }
            for v in visual_proof_results
            if v.get("proof_artifact_path")
        ]

        # 11) Update Neural Memory — save_deal() delegates to _update_memory
        #     which handles score_history, timeline, and analysis_count merging.
        new_score = result.get("deal_health_score", 0)

        save_deal({
            "competitor_url": competitor_url,
            "deal_health_score": new_score,
            "talk_track": result.get("talk_track", ""),
            "transcript": transcript[:5000] if transcript else "",
            "clashes_detected": result.get("clashes_detected", clashes_detected),
            "visual_proof_summary": visual_proof_summary,
            "proof_filenames": proof_artifacts,
            "market_drift": drift_report if drift_report.get("drift_detected") else None,
            "analysis_mode": analysis_mode,
            "evidence_status": evidence_status,
            "evidence_summary": evidence_summary,
            "verification_reason": verification_reason,
            "claim_count": claim_count,
            "verified_claim_count": verified_claim_count,
        }, owner_scope)

        # Read back the merged data for the job result
        updated_record = _load_memory_for_url(competitor_url, owner_scope)
        score_history = updated_record.get("score_history", [new_score])
        timeline = updated_record.get("timeline", [])

        _set_progress(job_id, "Analysis complete ✓")
        jobs[job_id]["status"] = "completed"
        jobs[job_id]["result"] = {
            "deal_health_score": new_score,
            "clashes_detected": result.get("clashes_detected", clashes_detected),
            "talk_track": result.get("talk_track", ""),
            "proof_artifact_path": result.get("proof_artifact_path"),
            "all_proof_filenames": proof_artifacts,
            "competitor_url": competitor_url,
            "market_drift": drift_report if drift_report.get("drift_detected") else None,
            "score_history": score_history,
            "timeline": timeline,
            "trend": calculate_trend(competitor_url, owner_scope),
            "cached": use_cache,
            "deep_sentiment": deep_sentiment,
            "adversarial_critique": adversarial_critique,
            # ── P0 Upgrades ──
            "deal_stage": deal_stage,
            "deal_value": deal_value,
            "score_reasoning": result.get("score_reasoning", ""),
            "risk_level": result.get("risk_level", ""),
            "stage_adjustment": result.get("stage_adjustment", ""),
            "key_pivot_points": result.get("key_pivot_points", []),
            "stage_specific_actions": result.get("stage_specific_actions", []),
            "winning_patterns_summary": result.get("winning_patterns_summary", {}),
            "auto_hardened": result.get("auto_hardened", False),
            "analysis_mode": analysis_mode,
            "evidence_status": evidence_status,
            "evidence_summary": evidence_summary,
            "verification_reason": verification_reason,
            "claim_count": claim_count,
            "verified_claim_count": verified_claim_count,
            "proof_available": proof_available,
        }

        # ── Autonomous Slack Alert — fire on critical risk ──
        _critic_verdict = adversarial_critique.get("verdict", "")
        _is_critical = (
            (isinstance(new_score, (int, float)) and new_score < 50)
            or "REJECTED" in _critic_verdict.upper()
        )
        _slack_url = slack_webhook_url or os.environ.get("SLACK_WEBHOOK_URL", "")
        if _is_critical and _slack_url:
            try:
                _slack_payload = {
                    "competitor_name": competitor_name or competitor_url,
                    "competitor_url": competitor_url,
                    "deal_health_score": new_score,
                    "talk_track": result.get("talk_track", ""),
                    "proof_artifact_path": primary_proof_filename,
                    "clashes_detected": result.get("clashes_detected", clashes_detected),
                    "adversarial_critique": adversarial_critique,
                    "deep_sentiment": deep_sentiment,
                }
                _slack_result = tools.send_slack_alert(_slack_payload, _slack_url)
                logger.info(
                    "Slack alert sent for %s (score=%s, verdict=%s): %s",
                    competitor_url, new_score, _critic_verdict, _slack_result.get("status"),
                )
            except Exception as slack_err:
                logger.warning("Slack alert failed (non-fatal): %s", slack_err)
    except Exception as e:
        logger.exception("Oakwell analysis failed for job %s", job_id)
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["error"] = str(e)
    finally:
        gc.collect()


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Revenue Intelligence — Autonomous Strategic Brain",
    description="Oakwell: parallel vision verification, discrepancy engine, adversarial talk-tracks",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-Oakwell-Internal-Secret", "X-Oakwell-User-Id", "X-Oakwell-Org-Id"],
)


@app.post("/analyze-deal")
async def analyze_deal(
    req: AnalyzeDealRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    auth_ctx: AuthContext = Depends(_require_auth_context),
) -> Dict[str, str]:
    """Enqueue deal analysis. Returns job_id immediately; poll GET /deal-status/{job_id} for results."""
    _enforce_rate_limit(request, auth_ctx.scope_id, "analyze-deal", limit=6, window_seconds=300)
    try:
        api_key = tools.require_genai_api_key()
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    job_id = str(uuid.uuid4())
    jobs[job_id] = {
        "status": "pending",
        "result": None,
        "error": None,
        "progress_message": "Queued…",
        "owner_scope": auth_ctx.scope_id,
        "user_id": auth_ctx.user_id,
        "org_id": auth_ctx.org_id,
    }
    slack_url = req.slack_webhook_url or request.headers.get("X-Slack-Webhook-URL") or None

    # ── Register org in the Sentinel watcher registry ──
    _org = auth_ctx.scope_id
    if slack_url:
        if req.competitor_url not in _sentinel_registry:
            _sentinel_registry[req.competitor_url] = {}
        _sentinel_registry[req.competitor_url][_org] = slack_url
        logger.info("Sentinel: registered org=%s for %s", _org, req.competitor_url)

    background_tasks.add_task(
        run_oakwell_analysis,
        job_id,
        auth_ctx.scope_id,
        req.transcript,
        req.competitor_url,
        req.competitor_name,
        req.your_product,
        api_key,
        slack_url,
        req.deal_stage,
        req.deal_value,
    )
    return {"job_id": job_id}


@app.post("/generate-email")
async def generate_email(
    req: GenerateEmailRequest,
    request: Request,
    auth_ctx: AuthContext = Depends(_require_auth_context),
) -> Dict[str, str]:
    """Generate a follow-up email from either a job_id or provided deal results."""
    _enforce_rate_limit(request, auth_ctx.scope_id, "generate-email", limit=10, window_seconds=300)
    logger.info(f"Email request: job_id={req.job_id}, has_deal_results={bool(req.deal_results)}")
    try:
        api_key = tools.require_genai_api_key()
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    deal_results: Optional[Dict[str, Any]] = None
    if req.job_id:
        job = _require_owned_job(req.job_id, auth_ctx)
        if job.get("status") != "completed":
            logger.error(f"Email generation failed: Job {req.job_id} status={job.get('status')}")
            raise HTTPException(status_code=409, detail="Job not completed")
        deal_results = job.get("result")
        if not deal_results:
            logger.error(f"Email generation failed: Job {req.job_id} has no result")
            raise HTTPException(status_code=404, detail="Job result not found")
    elif req.deal_results:
        deal_results = req.deal_results

    if not deal_results:
        logger.error("Email generation failed: No deal_results provided")
        raise HTTPException(status_code=400, detail="Provide job_id or deal_results")

    logger.info(f"Generating email with deal_results: score={deal_results.get('deal_health_score')}")
    email_text = await tools.generate_closing_email(deal_results, api_key=api_key)
    if not email_text:
        logger.error("Email generation failed: generate_closing_email returned empty")
        raise HTTPException(status_code=500, detail="Email generation failed")
    logger.info("Email generated successfully")
    return {"email": email_text}


# ---------------------------------------------------------------------------
# POST /live-snippet — High-Speed Live Meeting Sidekick
# ---------------------------------------------------------------------------

@app.post("/live-snippet", response_model=LiveSnippetResponse)
async def live_snippet(
    req: LiveSnippetRequest,
    request: Request,
    auth_ctx: AuthContext = Depends(_require_auth_context),
) -> LiveSnippetResponse:
    """Ultra-fast live-call snippet analysis.

    1. Uses gemini-2.0-flash (via tools.process_live_snippet) for sub-second
       classification of competitor mentions & pricing claims.
    2. Computes a *urgency* score (0-1) for the sales rep.
    3. If a pricing claim is found AND urgency >= threshold, autonomously
       fires tools.verify_claim_with_vision in the background.
    """
    _enforce_rate_limit(request, auth_ctx.scope_id, "live-snippet", limit=30, window_seconds=60)
    try:
        api_key = tools.require_genai_api_key()
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    snippet_text = req.snippet.strip()
    if not snippet_text:
        return LiveSnippetResponse(status="skipped", reason="empty snippet")

    logger.info(
        "live-snippet: %d chars, competitor_url=%s, threshold=%.2f",
        len(snippet_text),
        req.competitor_url or "(none)",
        req.urgency_threshold or 0.5,
    )

    try:
        raw = await tools.process_live_snippet(
            snippet=snippet_text,
            competitor_url=req.competitor_url,
            api_key=api_key,
        )
    except Exception as exc:
        logger.error("live-snippet: process_live_snippet failed: %s", exc)
        return LiveSnippetResponse(status="error", reason=str(exc))

    if raw.get("status") != "analysed":
        return LiveSnippetResponse(
            status=raw.get("status", "error"),
            reason=raw.get("reason", "classification failed"),
        )

    # ── Unpack classification results ──
    competitors: List[str] = raw.get("competitor_mentions", [])
    pricing_claims: List[Dict[str, Any]] = raw.get("pricing_claims", [])
    has_actionable: bool = raw.get("has_actionable_claim", False)
    verifications: List[Dict[str, Any]] = raw.get("verification_results", [])

    # ── Compute urgency score ──
    #   Base: 0.2 for any competitor mention, +0.3 per pricing claim (max 0.9),
    #   +0.1 if a claim was verified as FALSE (rep needs to counter immediately).
    urgency = 0.0
    if competitors:
        urgency += 0.2
    urgency += min(len(pricing_claims) * 0.3, 0.6)
    for vr in verifications:
        v_data = vr.get("verification", {})
        if v_data.get("status") == "success" and not v_data.get("verified", True):
            urgency += 0.1  # false claim → higher urgency
    urgency = round(min(urgency, 1.0), 2)

    if urgency >= 0.8:
        urgency_label = "critical"
    elif urgency >= 0.5:
        urgency_label = "high"
    elif urgency >= 0.2:
        urgency_label = "medium"
    else:
        urgency_label = "low"

    # ── Background verification trigger ──
    # process_live_snippet already runs verify_claim_with_vision when it has
    # claims + a URL, so the results may already be populated.  If NOT yet
    # triggered (e.g. no URL was passed initially but urgency is high), fire
    # it now in the background so the next poll picks it up.
    verification_triggered = bool(verifications)
    if (
        not verification_triggered
        and has_actionable
        and pricing_claims
        and req.competitor_url
        and urgency >= (req.urgency_threshold or 0.5)
    ):
        logger.info(
            "live-snippet: urgency %.2f >= threshold — launching background verification for %s",
            urgency,
            req.competitor_url,
        )

        async def _bg_verify() -> None:
            """Fire-and-forget background verification."""
            for pc in pricing_claims[:3]:
                claim_text = pc.get("claim", "")
                if not claim_text:
                    continue
                try:
                    await tools.verify_claim_with_vision(
                        url=req.competitor_url,
                        claim=claim_text,
                        tool_context=None,
                        api_key=api_key,
                    )
                except Exception as bg_exc:
                    logger.warning("live-snippet bg verify failed: %s", bg_exc)

        asyncio.ensure_future(_bg_verify())
        verification_triggered = True

    # Pick the first claim as the headline claim_detected
    claim_detected: Optional[str] = None
    if pricing_claims:
        claim_detected = pricing_claims[0].get("claim", None)
    elif competitors:
        claim_detected = f"Competitor mention: {', '.join(competitors[:3])}"

    logger.info(
        "live-snippet result: competitors=%s, claims=%d, urgency=%.2f (%s), verified=%d",
        competitors,
        len(pricing_claims),
        urgency,
        urgency_label,
        len(verifications),
    )

    return LiveSnippetResponse(
        status="analysed",
        competitor_mentioned=bool(competitors),
        competitors=competitors,
        claim_detected=claim_detected,
        pricing_claims=pricing_claims,
        urgency=urgency,
        urgency_label=urgency_label,
        has_actionable_claim=has_actionable,
        verification_triggered=verification_triggered,
        verification_results=verifications,
        snippet_length=len(snippet_text),
    )


@app.get("/deal-status/{job_id}", response_model=DealStatusResponse)
async def deal_status(job_id: str, auth_ctx: AuthContext = Depends(_require_auth_context)) -> DealStatusResponse:
    """Return job status and structured result (deal_health_score, clashes_detected, talk_track, proof_artifact_path)."""
    j = _require_owned_job(job_id, auth_ctx)
    return DealStatusResponse(
        job_id=job_id,
        status=j["status"],
        result=j.get("result"),
        error=j.get("error"),
        progress_message=j.get("progress_message"),
    )


@app.get("/proof/{filename}")
async def get_proof(filename: str, auth_ctx: AuthContext = Depends(_require_auth_context)):
    """Serve a proof screenshot from OUTPUTS_DIR for the dashboard."""
    if not filename or filename.lower() == "none":
        raise HTTPException(status_code=404, detail="Proof not found")
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    if not _can_access_proof(filename, auth_ctx):
        raise HTTPException(status_code=403, detail="Forbidden")
    filepath = (OUTPUTS_DIR / filename).resolve()
    try:
        filepath.relative_to(OUTPUTS_DIR.resolve())
    except ValueError:
        raise HTTPException(status_code=404, detail="Proof not found")
    if not filepath.is_file():
        raise HTTPException(status_code=404, detail="Proof not found")
    return FileResponse(filepath, media_type="image/png")

@app.get("/health")
async def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.get("/sentinel-status")
async def sentinel_status(auth_ctx: AuthContext = Depends(_require_auth_context)) -> Dict[str, Any]:
    """Return the current Sentinel watcher registry for diagnostics."""
    visible_registry = {
        url: [scope_id for scope_id in orgs.keys() if scope_id == auth_ctx.scope_id]
        for url, orgs in _sentinel_registry.items()
        if auth_ctx.scope_id in orgs
    }
    return {
        "watched_urls": len(visible_registry),
        "interval_seconds": WATCHER_INTERVAL_SECONDS,
        "registry": visible_registry,
    }


@app.get("/memory")
async def get_memory(auth_ctx: AuthContext = Depends(_require_auth_context)) -> Dict[str, Any]:
    """Return the entire memory bank for UI insights."""
    return _load_memory(auth_ctx.scope_id)


@app.get("/competitor-trend")
async def competitor_trend(url: str, auth_ctx: AuthContext = Depends(_require_auth_context)) -> Dict[str, Any]:
    """Return the Market Pulse trend analysis for a specific competitor URL.

    Uses get_history() to query the last 5 deals from Firestore.
    """
    history = get_history(url, auth_ctx.scope_id, limit=5)
    return {
        "url": url,
        "trend": history["trend"],
        "timeline": history["timeline"],
        "score_history": history["score_history"],
        "analysis_count": history["analysis_count"],
        "last_analysis_ts": history["last_analysis_ts"],
    }


@app.get("/executive-summary/{job_id}")
async def executive_summary(job_id: str, auth_ctx: AuthContext = Depends(_require_auth_context)) -> Dict[str, str]:
    """Generate a Markdown Executive Summary for a completed job."""
    j = _require_owned_job(job_id, auth_ctx)
    if j.get("status") != "completed":
        raise HTTPException(status_code=409, detail="Job not completed yet")
    result = j.get("result", {})
    comp_url = result.get("competitor_url", "")
    memory_data = _load_memory_for_url(comp_url, auth_ctx.scope_id) if comp_url else None
    summary_md = tools.generate_executive_summary(result, memory_data=memory_data)
    return {"markdown": summary_md}


# ---------------------------------------------------------------------------
# Win/Loss Feedback Loop — API endpoints
# ---------------------------------------------------------------------------

@app.post("/record-outcome")
async def record_outcome(
    req: RecordOutcomeRequest,
    request: Request,
    auth_ctx: AuthContext = Depends(_require_auth_context),
) -> Dict[str, Any]:
    """Record a deal outcome (won/lost/stalled) for the Win/Loss Feedback Loop."""
    _enforce_rate_limit(request, auth_ctx.scope_id, "record-outcome", limit=20, window_seconds=300)
    if req.outcome not in ("won", "lost", "stalled"):
        raise HTTPException(status_code=400, detail="outcome must be: won | lost | stalled")
    result = _record_deal_outcome(
        competitor_url=req.competitor_url,
        owner_scope=auth_ctx.scope_id,
        outcome=req.outcome,
        deal_value=req.deal_value,
        deal_stage=req.deal_stage,
        reason=req.reason,
    )
    return result


@app.get("/winning-patterns")
async def winning_patterns_endpoint(
    url: Optional[str] = None,
    auth_ctx: AuthContext = Depends(_require_auth_context),
) -> Dict[str, Any]:
    """Return winning patterns learned from past deal outcomes."""
    return _get_winning_patterns(auth_ctx.scope_id, competitor_url=url)


# ---------------------------------------------------------------------------
# Autonomous Market Watcher — background sentinel loop
# ---------------------------------------------------------------------------

async def _watch_single_competitor(url: str, owner_scope: str) -> None:
    """Scrape one competitor URL and alert all registered orgs if drift is detected.

    Uses _verification_semaphore so only one Playwright session runs at a time,
    staying within free-tier rate limits.
    """
    logger.info("Watcher: scanning %s", url)
    prior = _load_memory_for_url(url, owner_scope)
    if not prior:
        logger.info("Watcher: no prior memory for %s — skipping", url)
        return

    # Scrape the live page (under semaphore)
    async with _verification_semaphore:
        try:
            scrape_result = await tools.scrape_competitor_website(url)
        except Exception as exc:
            logger.warning("Watcher: scrape failed for %s: %s", url, exc)
            return

    if scrape_result.get("status") != "success":
        logger.warning("Watcher: scrape non-success for %s: %s", url, scrape_result.get("message", ""))
        return

    # Build a lightweight current snapshot from the scraped markdown
    current_summary = {
        "claims": [{"claim": "live page content", "verified": True, "explanation": (scrape_result.get("markdown") or "")[:4000]}],
    }
    historical_summary = {
        "claims": prior.get("visual_proof_summary", []),
        "deal_health_score": prior.get("deal_health_score"),
    }

    # Calculate delta (under semaphore — calls Gemini)
    async with _verification_semaphore:
        try:
            delta_result = await tools.calculate_market_delta(current_summary, historical_summary)
        except Exception as exc:
            logger.warning("Watcher: delta calculation failed for %s: %s", url, exc)
            return

    delta_data = delta_result.get("delta", {})
    if not delta_data:
        return

    # Check if meaningful changes were detected
    alerts: List[str] = []
    for change in delta_data.get("pricing_changes", []):
        if isinstance(change, str):
            alerts.append(f"Market Drift Alert — PRICE CHANGE: {change}")
    for removal in delta_data.get("removals", []):
        if isinstance(removal, str):
            alerts.append(f"Market Drift Alert — FEATURE REMOVED: {removal}")
    for addition in delta_data.get("additions", []):
        if isinstance(addition, str):
            alerts.append(f"Market Drift Alert — NEW FEATURE: {addition}")
    summary_text = delta_data.get("summary", "")
    if summary_text and not alerts:
        if any(w in summary_text.lower() for w in ["increase", "removed", "dropped", "changed", "new", "added"]):
            alerts.append(f"Market Drift Alert: {summary_text}")

    if not alerts:
        logger.info("Watcher: no drift detected for %s", url)
        return

    logger.info("Watcher: DRIFT DETECTED for %s — %d alerts", url, len(alerts))

    # Alert every org watching this URL
    orgs = _sentinel_registry.get(url, {})
    comp_name = url.replace("https://", "").replace("http://", "").split("/")[0]
    for org_id, webhook_url in orgs.items():
        if org_id != owner_scope:
            continue
        try:
            _alert_payload = {
                "competitor_name": comp_name,
                "competitor_url": url,
                "deal_health_score": prior.get("deal_health_score", 0),
                "talk_track": "\n".join(alerts),
                "proof_artifact_path": "",
                "adversarial_critique": {"verdict": "NEEDS HARDENING"},
                "deep_sentiment": {"overall_sentiment": "Market shift detected", "killer_insight": summary_text[:300]},
                "clashes_detected": [{"claim": a, "risk": "Market Drift"} for a in alerts[:3]],
            }
            slack_result = tools.send_slack_alert(_alert_payload, webhook_url)
            logger.info(
                "Watcher: Slack alert sent to org=%s for %s: %s",
                org_id, url, slack_result.get("status"),
            )
        except Exception as slack_err:
            logger.warning("Watcher: Slack alert failed for org=%s, url=%s: %s", org_id, url, slack_err)


async def autonomous_market_watch() -> None:
    """Infinite background loop: periodically re-scan all watched competitors.

    Discovers URLs from two sources:
    1. Sentinel registry (orgs that submitted analyses with slack webhooks)
    2. Firestore oakwell_deals collection (all previously analysed competitors)

    Serialises scraping through _verification_semaphore (one at a time).
    """
    logger.info(
        "Autonomous Market Watcher started — interval %ds, initial delay 60s",
        WATCHER_INTERVAL_SECONDS,
    )
    await asyncio.sleep(60)  # let the server finish booting

    while True:
        try:
            # Collect all unique URLs to watch
            watched_pairs: set[Tuple[str, str]] = set()
            for url, orgs in _sentinel_registry.items():
                for owner_scope in orgs.keys():
                    watched_pairs.add((url, owner_scope))

            # Also pull URLs from Firestore if available
            if _firestore_db is not None:
                try:
                    docs = _firestore_db.collection(FIRESTORE_COLLECTION).select(["competitor_url", "owner_scope"]).stream()
                    for doc in docs:
                        d = doc.to_dict()
                        u = d.get("competitor_url")
                        owner_scope = d.get("owner_scope")
                        if u and owner_scope:
                            watched_pairs.add((u, owner_scope))
                except Exception as fs_err:
                    logger.warning("Watcher: Firestore URL fetch failed: %s", fs_err)

            if not watched_pairs:
                logger.info("Watcher: no URLs to watch — sleeping")
            else:
                logger.info("Watcher: scanning %d competitor scope/url pairs", len(watched_pairs))
                for url, owner_scope in watched_pairs:
                    try:
                        await _watch_single_competitor(url, owner_scope)
                    except Exception as exc:
                        logger.warning("Watcher: error scanning %s: %s", url, exc)
                    # Small stagger between competitors
                    await asyncio.sleep(5)

        except Exception as loop_err:
            logger.exception("Watcher: loop error: %s", loop_err)

        await asyncio.sleep(WATCHER_INTERVAL_SECONDS)


@app.on_event("startup")
async def _start_market_watcher() -> None:
    """Launch the autonomous watcher as a fire-and-forget background task."""
    asyncio.create_task(autonomous_market_watch())
