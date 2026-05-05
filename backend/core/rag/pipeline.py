"""
PRISM — RAG Pipeline
Chunking → Embedding → ChromaDB (mutually exclusive per agent) → Reranking → Retrieval
"""
import re
import hashlib
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
import chromadb
from chromadb.config import Settings as ChromaSettings
from sentence_transformers import SentenceTransformer, CrossEncoder
from config.settings import get_settings

settings = get_settings()

# ── Singletons ────────────────────────────────────────────────────────────
_embedder: Optional[SentenceTransformer] = None
_reranker: Optional[CrossEncoder]        = None
_chroma:   Optional[chromadb.ClientAPI]  = None


def get_embedder() -> SentenceTransformer:
    global _embedder
    if _embedder is None:
        _embedder = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
    return _embedder


def get_reranker() -> CrossEncoder:
    global _reranker
    if _reranker is None:
        _reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
    return _reranker


def get_chroma() -> chromadb.ClientAPI:
    global _chroma
    if _chroma is None:
        _chroma = chromadb.PersistentClient(
            path=settings.chroma_persist_dir,
            settings=ChromaSettings(anonymized_telemetry=False),
        )
    return _chroma


# ── Chunker ────────────────────────────────────────────────────────────────
@dataclass
class Chunk:
    chunk_id:   str
    text:       str
    token_est:  int
    position:   int
    metadata:   Dict


class PRISMChunker:
    """
    Hierarchical chunker:
    1. Split by paragraph boundaries
    2. Merge short paragraphs
    3. Split long chunks at sentence boundaries
    4. Sliding-window overlap for continuity
    """
    def __init__(self, target=900, overlap=150, min_chunk=80):
        self.target  = target
        self.overlap = overlap
        self.min_c   = min_chunk

    def chunk(self, text: str, base_meta: Dict) -> List[Chunk]:
        # Step 1: paragraph split
        paras = [p.strip() for p in re.split(r'\n{2,}', text) if len(p.strip()) > 20]
        # Step 2: merge short paras
        merged, buf = [], ""
        for p in paras:
            if len(buf) + len(p) < self.target:
                buf = (buf + " " + p).strip()
            else:
                if buf: merged.append(buf)
                buf = p
        if buf: merged.append(buf)
        # Step 3: split long chunks at sentence boundaries
        final = []
        for seg in merged:
            if len(seg) <= self.target + 200:
                final.append(seg)
            else:
                sentences = re.split(r'(?<=[.!?])\s+', seg)
                buf2 = ""
                for s in sentences:
                    if len(buf2) + len(s) < self.target:
                        buf2 = (buf2 + " " + s).strip()
                    else:
                        if buf2: final.append(buf2)
                        buf2 = s
                if buf2: final.append(buf2)
        # Step 4: overlap windows
        chunks = []
        for i, seg in enumerate(final):
            prev = final[i-1][-self.overlap:] if i > 0 else ""
            text_with_overlap = (prev + " " + seg).strip() if prev else seg
            cid = hashlib.md5(text_with_overlap[:200].encode()).hexdigest()[:12]
            chunks.append(Chunk(
                chunk_id=cid,
                text=text_with_overlap,
                token_est=int(len(text_with_overlap.split()) * 1.3),
                position=i,
                metadata={**base_meta, "chunk_pos": i, "chunk_total": len(final)},
            ))
        return [c for c in chunks if c.token_est >= self.min_c]


# ── Vector Store ──────────────────────────────────────────────────────────
class PRISMVectorStore:
    """
    One ChromaDB collection per agent scope (mutually exclusive).
    15 primary collections + shared specialist/human collections.
    """
    def __init__(self):
        self.client  = get_chroma()
        self._cols: Dict[str, chromadb.Collection] = {}

    def _get_col(self, name: str) -> chromadb.Collection:
        if name not in self._cols:
            self._cols[name] = self.client.get_or_create_collection(
                name=name,
                metadata={"hnsw:space": "cosine"},
            )
        return self._cols[name]

    def add(self, chunks: List[Chunk], collection: str) -> int:
        col = self._get_col(collection)
        emb = get_embedder()
        texts = [c.text for c in chunks]
        vectors = emb.encode(texts, show_progress_bar=False).tolist()
        existing = set(col.get(ids=[c.chunk_id for c in chunks])["ids"])
        new = [(c, v) for c, v in zip(chunks, vectors) if c.chunk_id not in existing]
        if not new: return 0
        col.add(
            ids=[c.chunk_id for c, _ in new],
            documents=[c.text for c, _ in new],
            embeddings=[v for _, v in new],
            metadatas=[c.metadata for c, _ in new],
        )
        return len(new)

    def query(self, query: str, collection: str, top_k: int = 10) -> List[Dict]:
        col = self._get_col(collection)
        if col.count() == 0:
            return []
        emb = get_embedder()
        q_vec = emb.encode([query], show_progress_bar=False).tolist()
        results = col.query(query_embeddings=q_vec, n_results=min(top_k, col.count()))
        out = []
        for i, doc in enumerate(results["documents"][0]):
            out.append({
                "text":     doc,
                "score":    float(1 - results["distances"][0][i]),
                "metadata": results["metadatas"][0][i] if results["metadatas"] else {},
                "id":       results["ids"][0][i],
            })
        return out

    def count(self, collection: str) -> int:
        try:
            return self._get_col(collection).count()
        except Exception:
            return 0

    def delete_collection(self, collection: str):
        self.client.delete_collection(collection)
        self._cols.pop(collection, None)


# ── Reranker ──────────────────────────────────────────────────────────────
class PRISMReranker:
    def rerank(self, query: str, chunks: List[Dict], top_k: int = 5) -> List[Dict]:
        if not chunks: return []
        reranker = get_reranker()
        pairs  = [(query, c["text"]) for c in chunks]
        scores = reranker.predict(pairs)
        ranked = sorted(zip(scores, chunks), key=lambda x: x[0], reverse=True)
        for score, chunk in ranked:
            chunk["rerank_score"] = float(score)
        return [c for _, c in ranked[:top_k]]


# ── Full RAG Pipeline ────────────────────────────────────────────────────
class PRISMRAGPipeline:
    def __init__(self):
        self.chunker  = PRISMChunker()
        self.store    = PRISMVectorStore()
        self.reranker = PRISMReranker()

    def ingest(self, text: str, metadata: Dict, collection: str) -> Dict:
        chunks = self.chunker.chunk(text, metadata)
        added  = self.store.add(chunks, collection)
        return {"chunks_created": len(chunks), "chunks_added": added, "collection": collection}

    def retrieve(self, query: str, collection: str,
                 top_k_initial: int = 10, top_k_final: int = 5) -> List[Dict]:
        candidates = self.store.query(query, collection, top_k=top_k_initial)
        return self.reranker.rerank(query, candidates, top_k=top_k_final)

    def multi_retrieve(self, query: str, collections: List[str],
                       top_k_final: int = 5) -> List[Dict]:
        """Retrieve across multiple collections and merge-rank."""
        all_chunks = []
        for col in collections:
            all_chunks.extend(self.store.query(query, col, top_k=6))
        return self.reranker.rerank(query, all_chunks, top_k=top_k_final)


# ── Shared singleton ──────────────────────────────────────────────────────
_pipeline: Optional[PRISMRAGPipeline] = None

def get_rag_pipeline() -> PRISMRAGPipeline:
    global _pipeline
    if _pipeline is None:
        _pipeline = PRISMRAGPipeline()
    return _pipeline
