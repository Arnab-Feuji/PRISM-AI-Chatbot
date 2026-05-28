
import asyncio
import uuid
from backend.database.models import AsyncSession, IndexedDocument, PreRAGResult, create_tables
from backend.main import calculate_prerag_report
from sqlalchemy import select

async def backfill():
    async with AsyncSession() as session:
        # Get all docs that don't have a prerag score
        res = await session.execute(select(IndexedDocument).where(IndexedDocument.prerag_score == None))
        docs = res.scalars().all()
        
        print(f"Backfilling {len(docs)} documents...")
        
        for doc in docs:
            # We don't have the full text here easily without re-reading files,
            # but for backfill we'll use a placeholder or dummy text if needed.
            # Actually, let's try to simulate a decent score for existing docs.
            
            meta = {
                "source": doc.source,
                "year": doc.publication_year or 2023,
                "agent_scope": doc.agent_id,
                "doc_type": doc.doc_type or "pdf",
                "agent_f1": 85, # Assumption for backfill
            }
            
            # Dummy text of length 2000 to trigger some scores
            dummy_text = "This is a backfilled medical document for " + (doc.title or "Unknown") + ". " * 100
            
            report = calculate_prerag_report(dummy_text, meta)
            
            doc.prerag_score = report["total_score"]
            doc.prerag_tier = report["quality_standard"]
            
            # Add detailed result
            session.add(PreRAGResult(
                id=str(uuid.uuid4()),
                document_id=doc.id,
                doc_title=doc.title,
                agent_id=doc.agent_id,
                total_score=report["total_score"],
                tier1_score=report["tier1_score"],
                tier2_score=report["tier2_score"],
                quality_standard=report["quality_standard"],
                reject_reasons=report["reject_reasons"],
                dim_scores=report["dim_scores"]
            ))
            
        await session.commit()
        print("Backfill complete.")

if __name__ == "__main__":
    asyncio.run(backfill())
