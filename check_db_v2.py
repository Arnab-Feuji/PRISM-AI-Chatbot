import asyncio
from sqlalchemy import select
from backend.database.models import AsyncSession, PreRAGResult, IndexedDocument

async def main():
    async with AsyncSession() as s:
        res = await s.execute(select(PreRAGResult))
        pr_results = res.scalars().all()
        print(f"PreRAGResults: {len(pr_results)}")
        
        res2 = await s.execute(select(IndexedDocument))
        docs = res2.scalars().all()
        print(f"IndexedDocuments: {len(docs)}")
        
        for doc in docs:
            print(f"- Doc: {doc.id} | {doc.title} | {doc.agent_id}")
            
        for pr in pr_results:
            print(f"- PR: {pr.id} | {pr.doc_title} | {pr.agent_id}")

asyncio.run(main())
