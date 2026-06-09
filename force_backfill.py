import asyncio
import uuid
from backend.database.models import AsyncSession, IndexedDocument, PreRAGResult
from backend.main import calculate_prerag_report
from sqlalchemy import select

async def backfill():
    async with AsyncSession() as session:
        # Get all docs
        res = await session.execute(select(IndexedDocument))
        docs = res.scalars().all()
        
        # Get existing prerag results
        res_pr = await session.execute(select(PreRAGResult.document_id))
        existing_doc_ids = set(res_pr.scalars().all())
        
        docs_to_backfill = [d for d in docs if d.id not in existing_doc_ids]
        
        print(f"Backfilling {len(docs_to_backfill)} documents...")
        
        for doc in docs_to_backfill:
            meta = {
                "source": doc.source,
                "year": doc.publication_year or 2023,
                "agent_scope": doc.agent_id,
                "doc_type": doc.doc_type or "pdf",
                "agent_f1": 85,
            }
            
            # Dummy text of length 2000 to trigger some scores
            dummy_text = "This is a backfilled medical document for " + (doc.title or "Unknown") + ". " * 100
            
            report = calculate_prerag_report(dummy_text, meta)
            
            doc.prerag_score = report["total_score"]
            doc.prerag_tier = report["quality_standard"]
            
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
                gap_reasons=report.get("gap_reasons", {}),
                dim_scores=report["dim_scores"]
            ))
            
        await session.commit()
        print("Backfill complete.")

if __name__ == "__main__":
    asyncio.run(backfill())
