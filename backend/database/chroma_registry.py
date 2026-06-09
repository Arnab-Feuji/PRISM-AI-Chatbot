"""
Sync ChromaDB collections into PostgreSQL (chroma_collections).
One row per collection: name, chunk_count, chunk_ids list, embedding_model, timestamps.
"""
from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import datetime
from typing import Dict, List, Optional

from sqlalchemy import select, func

from backend.database.models import AsyncSession, ChromaCollection
from backend.core.rag.pipeline import get_chroma

logger = logging.getLogger(__name__)

EMBEDDING_MODEL = "BAAI/bge-base-en-v1.5"
FETCH_BATCH = 500
_main_event_loop: Optional[asyncio.AbstractEventLoop] = None


def set_main_event_loop(loop: asyncio.AbstractEventLoop) -> None:
    """Store the FastAPI/uvicorn loop for sync callers running in thread pools."""
    global _main_event_loop
    _main_event_loop = loop


def _safe_list(value) -> list:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    try:
        return list(value)
    except TypeError:
        return []


def _fetch_all_chunk_ids(col) -> List[str]:
    total = col.count()
    if total == 0:
        return []
    ids: List[str] = []
    offset = 0
    while offset < total:
        batch = col.get(
            limit=min(FETCH_BATCH, total - offset),
            offset=offset,
            include=[],
        )
        batch_ids = _safe_list(batch.get("ids"))
        if not batch_ids:
            break
        ids.extend(batch_ids)
        offset += len(batch_ids)
    return ids


async def upsert_collection_registry(
    collection_name: str,
    *,
    embedding_model: str = EMBEDDING_MODEL,
) -> ChromaCollection:
    """Read live Chroma collection and upsert one registry row."""
    client = get_chroma()
    now = datetime.utcnow()
    chunk_ids: List[str] = []

    try:
        col = client.get_collection(collection_name)
        chunk_ids = _fetch_all_chunk_ids(col)
    except Exception as exc:
        logger.warning("Could not read Chroma collection %s: %s", collection_name, exc)

    chunk_count = len(chunk_ids)

    async with AsyncSession() as session:
        res = await session.execute(
            select(ChromaCollection).where(
                ChromaCollection.collection_name == collection_name
            )
        )
        row = res.scalar_one_or_none()
        if row:
            row.chunk_count = chunk_count
            row.chunk_ids = chunk_ids
            row.embedding_model = embedding_model
            row.updated_at = now
        else:
            row = ChromaCollection(
                id=str(uuid.uuid4()),
                collection_name=collection_name,
                chunk_count=chunk_count,
                chunk_ids=chunk_ids,
                embedding_model=embedding_model,
                created_at=now,
                updated_at=now,
            )
            session.add(row)
        await session.commit()
        await session.refresh(row)
        return row


async def sync_collection_from_chroma(collection_name: str) -> int:
    row = await upsert_collection_registry(collection_name)
    return row.chunk_count


async def sync_all_collections_from_chroma() -> Dict[str, int]:
    client = get_chroma()
    results: Dict[str, int] = {}
    for col in client.list_collections():
        row = await upsert_collection_registry(col.name)
        results[col.name] = row.chunk_count
    return results


async def count_chroma_vectors() -> int:
    client = get_chroma()
    total = 0
    for col in client.list_collections():
        try:
            total += client.get_collection(col.name).count()
        except Exception:
            pass
    return total


async def count_registry_chunks() -> int:
    async with AsyncSession() as session:
        res = await session.execute(
            select(func.coalesce(func.sum(ChromaCollection.chunk_count), 0))
        )
        return int(res.scalar() or 0)


async def ensure_chroma_registry_synced(force: bool = False) -> Dict[str, int]:
    chroma_total = await count_chroma_vectors()
    registry_total = await count_registry_chunks()

    if chroma_total == 0:
        logger.info("[CHROMA_REGISTRY] Chroma is empty — nothing to sync.")
        return {}

    if not force and registry_total >= chroma_total:
        logger.info(
            "[CHROMA_REGISTRY] Registry up to date (%s >= %s chunks).",
            registry_total, chroma_total,
        )
        return {}

    print(
        f"[CHROMA_REGISTRY] Syncing chroma_collections from Chroma "
        f"(chroma={chroma_total}, registry={registry_total})..."
    )
    results = await sync_all_collections_from_chroma()
    total = sum(results.values())
    print(
        f"[CHROMA_REGISTRY] Sync complete — {len(results)} collections, "
        f"{total} chunks indexed."
    )
    return results


def schedule_collection_sync(collection_name: str) -> None:
    """Refresh registry row after ingest (async when event loop is running)."""
    coro = upsert_collection_registry(collection_name)

    def _log_future_error(future: asyncio.Future) -> None:
        if future.cancelled():
            return
        exc = future.exception()
        if exc:
            logger.error(
                "[CHROMA_REGISTRY] Sync failed for %s: %s", collection_name, exc
            )

    def _log_task_error(task: asyncio.Task) -> None:
        if task.cancelled():
            return
        exc = task.exception()
        if exc:
            logger.error(
                "[CHROMA_REGISTRY] Sync failed for %s: %s", collection_name, exc
            )

    try:
        loop = asyncio.get_running_loop()
        task = loop.create_task(coro)
        task.add_done_callback(_log_task_error)
    except RuntimeError:
        # Called from a worker thread (e.g. crawl ingest via run_in_executor).
        if _main_event_loop and _main_event_loop.is_running():
            future = asyncio.run_coroutine_threadsafe(coro, _main_event_loop)
            future.add_done_callback(_log_future_error)
            return
        # Standalone script / CLI — no shared loop available.
        asyncio.run(coro)
