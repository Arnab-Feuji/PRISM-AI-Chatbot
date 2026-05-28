import asyncio
from sqlalchemy import select
from backend.database.models import AsyncSessionFactory, PreRAGResult, IndexedDocument

async def main():
    async with AsyncSessionFactory() as s:
        res = await s.execute(select(PreRAGResult))
        print(f"PreRAGResults: {len(res.scalars().all())}")
        
        res2 = await s.execute(select(IndexedDocument))
        docs = res2.scalars().all()
        print(f"IndexedDocuments: {len(docs)}")
        
        for doc in docs:
            print(f"- {doc.id} | {doc.title} | {doc.agent_id} | score: {doc.prerag_score} | tier: {doc.prerag_tier}")

asyncio.run(main())
