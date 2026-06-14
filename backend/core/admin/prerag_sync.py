"""Pre-RAG admin report helpers — build UI rows from indexed_documents + prerag_results."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Callable, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.models import IndexedDocument, PreRAGResult

_DIM_MAX = {
    "G1": 7, "G2": 5, "G3": 4, "G4": 4, "G5": 5, "G6": 3, "G7": 4, "G8": 4, "G9": 4,
    "D1": 14, "D2": 11, "D3": 7, "D4": 6, "D5": 5, "D6": 5, "D7": 4, "D8": 3, "D9": 3, "D10": 2,
}


def _reject_reasons_to_gap_reasons(reject_reasons: list, dim_scores: dict) -> dict:
    gap: dict[str, str] = {}
    for reason in reject_reasons or []:
        if not isinstance(reason, str):
            continue
        for dim_id in _DIM_MAX:
            if reason.startswith(f"{dim_id}:"):
                gap[dim_id] = reason.split(":", 1)[1].strip()
                break
    for dim_id, max_pts in _DIM_MAX.items():
        if dim_id in gap:
            continue
        score = float((dim_scores or {}).get(dim_id, 0) or 0)
        if score < max_pts - 0.05:
            gap[dim_id] = f"Score {score}/{max_pts} below maximum for this checkpoint."
    return gap


def build_prerag_report_row(
    doc: IndexedDocument,
    prerag: Optional[PreRAGResult] = None,
) -> dict[str, Any]:
    """Shape a single Pre-RAG readiness table row for the admin UI."""
    meta = doc.metadata_json if isinstance(doc.metadata_json, dict) else {}
    doc_type = (doc.doc_type or "unknown").lower()
    ingest_origin = meta.get("ingest_origin") or (
        "manual" if doc_type == "upload" else "indexed"
    )
    created = doc.created_at or (prerag.created_at if prerag else None) or datetime.utcnow()

    if prerag:
        dim_scores = prerag.dim_scores or {}
        gap_reasons = prerag.gap_reasons or {}
        if not gap_reasons:
            gap_reasons = _reject_reasons_to_gap_reasons(prerag.reject_reasons or [], dim_scores)
        return {
            "id": doc.id,
            "title": doc.title or prerag.doc_title or "Untitled",
            "source": doc.source or "unknown",
            "source_url": doc.source_url,
            "agent_id": doc.agent_id or prerag.agent_id or "??",
            "disease_code": doc.disease_code or "??",
            "doc_type": doc.doc_type or "unknown",
            "ingest_origin": ingest_origin,
            "tier1_score": float(prerag.tier1_score or 0),
            "tier2_score": float(prerag.tier2_score or 0),
            "prerag_score": float(prerag.total_score or doc.prerag_score or 0),
            "quality_standard": prerag.quality_standard or doc.prerag_tier or "PENDING",
            "dim_scores": dim_scores,
            "gap_reasons": gap_reasons,
            "reject_reasons": prerag.reject_reasons or [],
            "auto_rejected": bool(prerag.auto_rejected),
            "chunk_count": doc.chunk_count or 0,
            "created_at": created.isoformat(),
        }

    score = float(doc.prerag_score or 0)
    return {
        "id": doc.id,
        "title": doc.title or "Untitled",
        "source": doc.source or "unknown",
        "source_url": doc.source_url,
        "agent_id": doc.agent_id or "??",
        "disease_code": doc.disease_code or "??",
        "doc_type": doc.doc_type or "unknown",
        "ingest_origin": ingest_origin,
        "tier1_score": round(score * 0.4, 1) if score else 0.0,
        "tier2_score": round(score * 0.6, 1) if score else 0.0,
        "prerag_score": score,
        "quality_standard": doc.prerag_tier or "PENDING",
        "dim_scores": {},
        "gap_reasons": {},
        "reject_reasons": [],
        "auto_rejected": score > 0 and score < 55,
        "chunk_count": doc.chunk_count or 0,
        "created_at": created.isoformat(),
    }


async def sync_crawled_documents_to_prerag(
    db: AsyncSession,
    *,
    calculate_report: Callable[[str, dict], dict],
    commit: bool = True,
) -> int:
    """Backfill missing prerag_results rows for indexed documents already in PostgreSQL."""
    res = await db.execute(
        select(IndexedDocument).order_by(IndexedDocument.created_at.desc()).limit(500)
    )
    docs = res.scalars().all()
    if not docs:
        return 0

    doc_ids = [d.id for d in docs]
    existing_res = await db.execute(
        select(PreRAGResult.document_id).where(PreRAGResult.document_id.in_(doc_ids))
    )
    existing = {row[0] for row in existing_res.all() if row[0]}

    synced = 0
    for doc in docs:
        if doc.id in existing:
            continue

        meta = {
            "source": doc.source,
            "year": doc.publication_year or datetime.utcnow().year,
            "evidence_grade": doc.evidence_grade,
            "agent_scope": doc.agent_id,
            "doc_type": doc.doc_type or "pdf",
            "source_url": doc.source_url or "",
            "agent_f1": 85,
        }
        if isinstance(doc.metadata_json, dict):
            for key, value in doc.metadata_json.items():
                meta.setdefault(key, value)

        text = f"Medical document: {doc.title or 'Untitled'}. " + ("clinical evidence. " * 120)
        report = calculate_report(text, meta)
        gap_reasons = report.get("gap_reasons") or _reject_reasons_to_gap_reasons(
            report.get("reject_reasons") or [],
            report.get("dim_scores") or {},
        )

        doc.prerag_score = report["total_score"]
        doc.prerag_tier = report["quality_standard"]

        db.add(PreRAGResult(
            id=str(uuid.uuid4()),
            document_id=doc.id,
            doc_title=(doc.title or "Untitled")[:1000],
            agent_id=doc.agent_id or "??",
            total_score=report["total_score"],
            tier1_score=report["tier1_score"],
            tier2_score=report["tier2_score"],
            quality_standard=report["quality_standard"],
            reject_reasons=report.get("reject_reasons") or [],
            gap_reasons=gap_reasons,
            dim_scores=report.get("dim_scores") or {},
        ))
        synced += 1

    if synced and commit:
        await db.commit()

    return synced
