import asyncio
from backend.main import get_rag_pipeline
from backend.config.disease_config import ALL_COLLECTIONS

async def test_vector_store():
    try:
        pipeline = get_rag_pipeline()
        stats = []
        for col in ALL_COLLECTIONS:
            count = pipeline.store.count(col)
            stats.append({"collection": col, "document_count": count})
        print(f"Vector Store Stats: {len(stats)} collections found.")
        print(stats[:5])
    except Exception as e:
        print(f"Vector Store Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_vector_store())
