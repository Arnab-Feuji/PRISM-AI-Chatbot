# ═══════════════════════════════════════════════════════════════════════════════
# FILE: backend/core/quality/metrics_tracker.py
# PRISM Metrics Tracker — captures ALL events from patient chat into DB
# ───────────────────────────────────────────────────────────────────────────────
# ROOT CAUSE FIX:
#   Admin portal shows zeros because events are computed but never written.
#   This module is the single point of truth — every chat message MUST call
#   MetricsTracker.record_response() before db.commit().
# ═══════════════════════════════════════════════════════════════════════════════

from __future__ import annotations
import uuid, json
from datetime import datetime
from typing import Dict, List, Optional


# ─── All DB models used ────────────────────────────────────────────────────────
# Import lazily inside functions to avoid circular imports at module level


# Canonical response_source values stored on messages.response_source
SOURCE_CDC_PUBMED    = "cdc_pubmed"   # Grounded on CDC or PubMed crawled corpus
SOURCE_LLM_FALLBACK  = "llm_fallback" # No CDC/PubMed chunks — LLM general knowledge
SOURCE_CLARIFYING    = "clarifying"
SOURCE_MULTIMODAL    = "multimodal"
SOURCE_LEGACY        = "legacy"
SOURCE_CHROMA        = SOURCE_CDC_PUBMED  # backward-compat alias


def _blob_from_chunk_or_citation(item: Dict) -> str:
    """Collect all source-identifying text from a chunk or citation dict."""
    parts: List[str] = []
    if not isinstance(item, dict):
        return ""
    for key in ("source", "source_doc", "section", "doc_type", "text"):
        val = item.get(key, "")
        parts.append(str(val)[:600] if key == "text" else str(val))
    meta = item.get("metadata") or {}
    if isinstance(meta, dict):
        for key in ("source", "source_doc", "doc_type"):
            parts.append(str(meta.get(key, "")))
    return " ".join(parts).lower()


def detect_cdc_pubmed_sources(
    chunks: List[Dict],
    citations: List[Dict],
) -> Dict[str, object]:
    """
    Determine whether retrieved evidence came from the CDC / PubMed crawled corpus.
    """
    has_cdc = False
    has_pubmed = False
    labels: List[str] = []

    for item in list(chunks or []) + list(citations or []):
        blob = _blob_from_chunk_or_citation(item)
        if not blob.strip():
            continue
        if "cdc" in blob or "cdc.gov" in blob:
            has_cdc = True
            if "CDC" not in labels:
                labels.append("CDC")
        if "pubmed" in blob or "pmid" in blob:
            has_pubmed = True
            if "PubMed" not in labels:
                labels.append("PubMed")

    return {
        "has_cdc":    has_cdc,
        "has_pubmed": has_pubmed,
        "has_authority_source": has_cdc or has_pubmed,
        "sources":    labels,
    }


def flags_for_source(source: str, retrieval_detail: Optional[Dict] = None) -> Dict[str, object]:
    """Map response_source → mutually exclusive chroma_grounded / llm_fallback booleans."""
    out = {
        "response_source":   source,
        "chroma_grounded":   source == SOURCE_CDC_PUBMED,
        "llm_fallback":      source == SOURCE_LLM_FALLBACK,
        "retrieval_detail":  retrieval_detail or {},
    }
    return out


def _normalize_json_list(value) -> List:
    """Coerce JSON/list columns from PostgreSQL into a real list."""
    if value is None:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, list) else []
        except (json.JSONDecodeError, TypeError):
            return []
    return []


def _role_is_assistant(role) -> bool:
    return str(getattr(role, "value", role) or "").lower() == "assistant"


def _has_retrieval_evidence(chunks: List, citations: List) -> bool:
    return bool(_normalize_json_list(chunks)) or bool(_normalize_json_list(citations))


def classify_retrieval_from_evidence(
    chunks: List,
    citations: List,
) -> Dict[str, object]:
    """
    Classify retrieval for a full clinical answer.

    cdc_pubmed   — ChromaDB returned chunks/citations (authority corpus is CDC/PubMed crawl)
                   OR explicit CDC/PubMed labels in metadata
    llm_fallback — no chunks/citations retrieved; LLM used its own knowledge
    """
    chunks    = chunks or []
    citations = citations or []
    detail    = detect_cdc_pubmed_sources(chunks, citations)
    has_hit   = detail["has_authority_source"] or _has_retrieval_evidence(chunks, citations)

    if has_hit:
        detail = {**detail, "retrieval_hit": True}
        source = SOURCE_CDC_PUBMED
    else:
        detail = {**detail, "retrieval_hit": False}
        source = SOURCE_LLM_FALLBACK

    return flags_for_source(source, retrieval_detail=detail)


def classify_response_retrieval(routing_result: Dict) -> Dict[str, object]:
    """Classify a live full-answer turn from smart-router output."""
    return classify_retrieval_from_evidence(
        routing_result.get("retrieved_chunks") or [],
        routing_result.get("citations") or [],
    )


def is_full_answer_message(
    *,
    is_clarifying: bool,
    multimodal_type: Optional[str],
    response_format: Optional[str],
    follow_up_questions: Optional[List],
    intent: Optional[str],
    ragas_scores: Optional[Dict],
    confidence: float,
    citations: Optional[List],
    retrieved_chunks: Optional[List],
    content: Optional[str],
) -> bool:
    """Return True when an assistant row represents a final clinical answer (not clarifying/upload)."""
    if is_clarifying or multimodal_type:
        return False
    if response_format or intent:
        return True
    if follow_up_questions and len(follow_up_questions) > 0:
        return True
    if ragas_scores and len(ragas_scores) > 0:
        return True
    if confidence and float(confidence) > 0:
        return True
    if _has_retrieval_evidence(retrieved_chunks or [], citations or []):
        return True
    # Legacy full answers: long assistant replies after routing (no clarifying flag)
    if content and len(content.strip()) >= 120:
        return True
    return False


def classify_stored_message(msg) -> Optional[Dict[str, object]]:
    """
    Classify an existing Message ORM row for retrieval distribution / backfill.
    Returns None for user/system rows.
    """
    if not _role_is_assistant(getattr(msg, "role", None)):
        return None

    if getattr(msg, "is_clarifying_question", False):
        return flags_for_source(SOURCE_CLARIFYING)

    if getattr(msg, "multimodal_type", None):
        return flags_for_source(SOURCE_MULTIMODAL)

    stored = (getattr(msg, "response_source", None) or "").strip().lower()
    if stored == "chroma":
        stored = SOURCE_CDC_PUBMED
    if stored in (SOURCE_CDC_PUBMED, SOURCE_LLM_FALLBACK, SOURCE_CLARIFYING, SOURCE_MULTIMODAL):
        detail = getattr(msg, "retrieval_detail", None) or {}
        return flags_for_source(stored, retrieval_detail=detail if isinstance(detail, dict) else {})

    chunks    = _normalize_json_list(getattr(msg, "retrieved_chunks", None))
    citations = _normalize_json_list(getattr(msg, "citations", None))

    if getattr(msg, "chroma_grounded", False):
        return flags_for_source(SOURCE_CDC_PUBMED)
    if getattr(msg, "llm_fallback", False):
        return flags_for_source(SOURCE_LLM_FALLBACK)

    # Any non-clarifying assistant reply counts toward retrieval distribution.
    return classify_retrieval_from_evidence(chunks, citations)


async def backfill_message_retrieval_sources(db, *, commit: bool = True) -> Dict[str, int]:
    """
    Re-analyse every assistant message in PostgreSQL and persist response_source flags.
    Safe to run on every startup — only updates rows that changed.
    """
    from sqlalchemy import select
    from backend.database.models import Message

    res = await db.execute(select(Message).where(Message.role == "assistant"))
    messages = res.scalars().all()

    stats = {
        SOURCE_CDC_PUBMED:   0,
        SOURCE_LLM_FALLBACK: 0,
        SOURCE_CLARIFYING:   0,
        SOURCE_MULTIMODAL:   0,
        SOURCE_LEGACY:       0,
        "updated":           0,
        "scanned":           len(messages),
    }

    for msg in messages:
        flags = classify_stored_message(msg)
        if not flags:
            continue

        src = flags["response_source"]
        stats[src] = stats.get(src, 0) + 1

        changed = (
            msg.response_source != src
            or msg.chroma_grounded != flags["chroma_grounded"]
            or msg.llm_fallback != flags["llm_fallback"]
            or (msg.retrieval_detail or {}) != (flags.get("retrieval_detail") or {})
        )
        if changed:
            msg.response_source   = src
            msg.chroma_grounded   = flags["chroma_grounded"]
            msg.llm_fallback      = flags["llm_fallback"]
            msg.retrieval_detail  = flags.get("retrieval_detail") or {}
            stats["updated"] += 1

    if commit and stats["updated"]:
        await db.commit()

    return stats


async def _compute_retrieval_distribution_sql(db) -> Optional[Dict[str, int]]:
    """Aggregate counts directly from PostgreSQL (matches PGAdmin message rows)."""
    from sqlalchemy import text

    res = await db.execute(text("""
        SELECT
          COUNT(*)::int AS assistant_total,
          COUNT(*) FILTER (WHERE COALESCE(is_clarifying_question, FALSE))::int AS clarifying,
          COUNT(*) FILTER (
            WHERE multimodal_type IS NOT NULL AND NOT COALESCE(is_clarifying_question, FALSE)
          )::int AS multimodal,
          COUNT(*) FILTER (
            WHERE NOT COALESCE(is_clarifying_question, FALSE)
              AND multimodal_type IS NULL
              AND (
                LOWER(COALESCE(response_source, '')) IN ('cdc_pubmed', 'chroma')
                OR COALESCE(chroma_grounded, FALSE) = TRUE
                OR (citations IS NOT NULL AND citations::text NOT IN ('[]', 'null', '{}'))
                OR (retrieved_chunks IS NOT NULL AND retrieved_chunks::text NOT IN ('[]', 'null', '{}'))
              )
          )::int AS cdc_pubmed,
          COUNT(*) FILTER (
            WHERE NOT COALESCE(is_clarifying_question, FALSE)
              AND multimodal_type IS NULL
              AND (
                LOWER(COALESCE(response_source, '')) = 'llm_fallback'
                OR COALESCE(llm_fallback, FALSE) = TRUE
              )
              AND NOT (
                LOWER(COALESCE(response_source, '')) IN ('cdc_pubmed', 'chroma')
                OR COALESCE(chroma_grounded, FALSE) = TRUE
                OR (citations IS NOT NULL AND citations::text NOT IN ('[]', 'null', '{}'))
                OR (retrieved_chunks IS NOT NULL AND retrieved_chunks::text NOT IN ('[]', 'null', '{}'))
              )
          )::int AS llm_fallback,
          COUNT(*) FILTER (
            WHERE NOT COALESCE(is_clarifying_question, FALSE)
              AND multimodal_type IS NULL
              AND LOWER(COALESCE(response_source, '')) = 'legacy'
          )::int AS legacy
        FROM messages
        WHERE role = 'assistant'
    """))
    row = res.one()
    cdc = int(row.cdc_pubmed or 0)
    llm = int(row.llm_fallback or 0)
    return {
        "cdc_pubmed_retrievals":   cdc,
        "llm_fallback_retrievals": llm,
        "clarifying_responses":    int(row.clarifying or 0),
        "multimodal_responses":    int(row.multimodal or 0),
        "legacy_responses":        int(row.legacy or 0),
        "assistant_total":         int(row.assistant_total or 0),
        "retrieval_answer_total":  cdc + llm,
    }


async def compute_retrieval_distribution(db) -> Dict[str, int]:
    """
    Distribution across stored assistant messages.
    Prefer PostgreSQL aggregation (same data as PGAdmin); fall back to Python classification.
    """
    try:
        sql_out = await _compute_retrieval_distribution_sql(db)
        if sql_out is not None:
            return sql_out
    except Exception:
        pass

    from sqlalchemy import select
    from backend.database.models import Message

    res = await db.execute(select(Message).where(Message.role == "assistant"))
    messages = res.scalars().all()

    out = {
        "cdc_pubmed_retrievals":   0,
        "llm_fallback_retrievals": 0,
        "clarifying_responses":    0,
        "multimodal_responses":    0,
        "legacy_responses":        0,
        "assistant_total":         len(messages),
    }

    for msg in messages:
        flags = classify_stored_message(msg)
        if not flags:
            continue
        src = flags["response_source"]
        if src == SOURCE_CDC_PUBMED:
            out["cdc_pubmed_retrievals"] += 1
        elif src == SOURCE_LLM_FALLBACK:
            out["llm_fallback_retrievals"] += 1
        elif src == SOURCE_CLARIFYING:
            out["clarifying_responses"] += 1
        elif src == SOURCE_MULTIMODAL:
            out["multimodal_responses"] += 1
        else:
            out["legacy_responses"] += 1

    out["retrieval_answer_total"] = (
        out["cdc_pubmed_retrievals"] + out["llm_fallback_retrievals"]
    )
    return out


class MetricsTracker:
    """
    Called once per AI response turn.
    Writes rows to: ragas_metrics, system_alerts (escalations/LLM calls),
    image_uploads tracking, and updates conversation state.
    """

    def __init__(self, db):
        self.db = db

    # ══════════════════════════════════════════════════════════════════════════
    # 1. RAGAS + CONFIDENCE + FRUSTRATION → ragas_metrics table
    # ══════════════════════════════════════════════════════════════════════════

    async def record_ragas(
        self,
        message_id:      str,
        conversation_id: str,
        agent_id:        str,
        disease_code:    str,
        ragas_scores:    Dict,
        confidence:      float,
        frustration:     int,
        processing_ms:   int,
    ) -> None:
        from backend.database.models import RAGASMetric

        row = RAGASMetric(
            id=str(uuid.uuid4()),
            message_id=message_id,
            conversation_id=conversation_id,
            agent_id=agent_id.upper(),
            disease_code=(disease_code or "").upper(),
            
            # Retrieval
            context_precision=ragas_scores.get("context_precision", 0.0),
            context_recall=ragas_scores.get("context_recall", 0.0),
            answer_relevancy=ragas_scores.get("answer_relevancy", 0.0),
            utilization=ragas_scores.get("utilization", 0.0),
            
            # Generation
            faithfulness=ragas_scores.get("faithfulness", 0.0),
            answer_similarity=ragas_scores.get("answer_similarity", 0.0),
            answer_correctness=ragas_scores.get("answer_correctness", 0.0),
            retrieval_relevancy=ragas_scores.get("retrieval_relevancy", 0.0),
            
            # Efficiency & Accuracy
            entity_recall=ragas_scores.get("entity_recall", 0.0),
            noise_sensitivity=ragas_scores.get("noise_sensitivity", 0.0),
            conciseness=ragas_scores.get("conciseness", 0.0),
            token_efficiency=ragas_scores.get("token_efficiency", 0.0),
            overall_score=ragas_scores.get("overall", 0.0),
            failure_rate=ragas_scores.get("failure_rate", 0.0),
            critique_depth=ragas_scores.get("critique_depth", 0.0),
            coherence=ragas_scores.get("coherence", 0.0),
            
            # Safety
            harmlessness=ragas_scores.get("harmlessness", 0.0),
            refusal_precision=ragas_scores.get("refusal_precision", 0.0),
            disclaimer_compliance=ragas_scores.get("disclaimer_compliance", 0.0),
            safe_messaging=ragas_scores.get("safe_messaging", 0.0),
            
            # Linguistic
            bert_score=ragas_scores.get("bert_score", 0.0),
            bleu_score=ragas_scores.get("bleu_score", 0.0),
            rouge_score=ragas_scores.get("rouge_score", 0.0),
            meteor_score=ragas_scores.get("meteor_score", 0.0),
            mrr_score=ragas_scores.get("mrr_score", 0.0),
            perplexity=ragas_scores.get("perplexity", 0.0),

            confidence=confidence,
            frustration=frustration,
            processing_ms=processing_ms,
            created_at=datetime.utcnow(),
        )
        self.db.add(row)

    # ══════════════════════════════════════════════════════════════════════════
    # 2. LLM CALL → system_alerts (component="llm_call")
    # ══════════════════════════════════════════════════════════════════════════

    async def record_llm_call(
        self,
        agent_id:        str,
        conversation_id: str,
        model:           str,
        prompt_tokens:   int,
        completion_tokens: int,
        processing_ms:   int,
        route:           str,   # "primary" | "specialist" | "human"
        disease_code:    str,
    ) -> None:
        from backend.database.models import SystemAlert

        self.db.add(SystemAlert(
            id=str(uuid.uuid4()),
            level="info",
            title=f"LLM call: {agent_id} [{route}]",
            message=json.dumps({
                "agent_id":          agent_id,
                "conversation_id":   conversation_id,
                "model":             model,
                "prompt_tokens":     prompt_tokens,
                "completion_tokens": completion_tokens,
                "total_tokens":      prompt_tokens + completion_tokens,
                "processing_ms":     processing_ms,
                "route":             route,
                "disease_code":      disease_code,
            }),
            component="llm_call",
            created_at=datetime.utcnow(),
        ))

    # ══════════════════════════════════════════════════════════════════════════
    # 3. ESCALATION → system_alerts (component="escalation")
    # ══════════════════════════════════════════════════════════════════════════

    async def record_escalation(
        self,
        agent_id:        str,
        conversation_id: str,
        user_id:         str,
        escalation_type: str,   # "specialist" | "human"
        reason:          str,
        confidence:      float,
        frustration:     int,
        disease_code:    str,
    ) -> None:
        from backend.database.models import SystemAlert

        level = "warning" if escalation_type == "specialist" else "critical"

        self.db.add(SystemAlert(
            id=str(uuid.uuid4()),
            level=level,
            title=f"Escalation: {agent_id} → {escalation_type}",
            message=json.dumps({
                "agent_id":        agent_id,
                "conversation_id": conversation_id,
                "user_id":         user_id,
                "type":            escalation_type,
                "reason":          reason,
                "confidence":      confidence,
                "frustration":     frustration,
                "disease_code":    disease_code,
            }),
            component=f"agent:{agent_id}",
            created_at=datetime.utcnow(),
        ))

    # ══════════════════════════════════════════════════════════════════════════
    # 4. RESPONSIBLE AI GUARDRAIL EVENT
    # ══════════════════════════════════════════════════════════════════════════

    async def record_guardrail(
        self,
        agent_id:        str,
        conversation_id: str,
        user_id:         str,
        guardrail_type:  str,   # "medical_validation" | "agent_mismatch" | "non_medical_image" etc.
        triggered:       bool,
        details:         str,
        disease_code:    str,
    ) -> None:
        from backend.database.models import SystemAlert

        if not triggered:
            return   # Only record actual guardrail events

        self.db.add(SystemAlert(
            id=str(uuid.uuid4()),
            level="warning",
            title=f"Guardrail: {guardrail_type}",
            message=json.dumps({
                "agent_id":        agent_id,
                "conversation_id": conversation_id,
                "user_id":         user_id,
                "type":            guardrail_type,
                "details":         details,
                "disease_code":    disease_code,
            }),
            component=f"guardrail:{guardrail_type}",
            created_at=datetime.utcnow(),
        ))

    # ══════════════════════════════════════════════════════════════════════════
    # MAIN: one call per AI response — writes everything in one pass
    # ══════════════════════════════════════════════════════════════════════════

    async def record_response(
        self,
        message_id:        str,
        conversation_id:   str,
        user_id:           str,
        agent_id:          str,
        disease_code:      str,
        ragas_scores:      Dict,
        confidence:        float,
        frustration:       int,
        processing_ms:     int,
        route_decision:    str,
        escalation_active: bool,
        escalation_reason: str,
        llm_calls:         Optional[List[Dict]] = None,
    ) -> None:
        """
        Single entry point. Call this once after every AI response.
        Writes RAGAS row + LLM call row(s) + escalation row (if active).
        All writes are batched — caller does db.commit() once.
        """
        # 1. RAGAS metrics (Faithfulness, Relevancy, Confidence, Frustration etc.)
        await self.record_ragas(
            message_id=message_id,
            conversation_id=conversation_id,
            agent_id=agent_id,
            disease_code=disease_code,
            ragas_scores=ragas_scores,
            confidence=confidence,
            frustration=frustration,
            processing_ms=processing_ms,
        )

        # 2. LLM call tracking (record every call in the chain)
        if llm_calls:
            for call in llm_calls:
                await self.record_llm_call(
                    agent_id=call.get("agent_id", agent_id),
                    conversation_id=conversation_id,
                    model=call.get("model", "unknown"),
                    prompt_tokens=call.get("prompt_tokens", 0),
                    completion_tokens=call.get("completion_tokens", 0),
                    processing_ms=call.get("latency_ms", 0),
                    route=route_decision,
                    disease_code=disease_code,
                )

        # 3. Escalation tracking
        if escalation_active and route_decision in ("specialist", "human"):
            await self.record_escalation(
                agent_id=agent_id,
                conversation_id=conversation_id,
                user_id=user_id,
                escalation_type=route_decision,
                reason=escalation_reason,
                confidence=confidence,
                frustration=frustration,
                disease_code=disease_code,
            )