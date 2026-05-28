import asyncio
import uuid
from datetime import datetime
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from backend.config.settings import get_settings
from backend.database.models import RAGASMetric, SystemAlert, LLMCallLog, create_tables
from backend.core.quality.metrics_tracker import MetricsTracker

async def test_persistence():
    settings = get_settings()
    
    # Apply migrations
    print("Applying migrations (create_tables)...")
    await create_tables()
    
    engine = create_async_engine(settings.database_url.replace("postgresql+asyncpg", "postgresql+asyncpg"))
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with AsyncSessionLocal() as db:
        tracker = MetricsTracker(db)
        
        message_id = str(uuid.uuid4())
        conv_id = str(uuid.uuid4())
        
        print(f"Recording test response for message {message_id}...")
        
        await tracker.record_response(
            message_id=message_id,
            conversation_id=conv_id,
            user_id="test_user",
            agent_id="CA1",
            disease_code="CA",
            ragas_scores={
                "faithfulness": 0.85,
                "answer_relevancy": 0.9,
                "overall": 0.87
            },
            confidence=0.88,
            frustration=10,
            processing_ms=1200,
            route_decision="primary",
            escalation_active=False,
            escalation_reason="",
            llm_calls=[{
                "model": "gpt-4o",
                "prompt_tokens": 500,
                "completion_tokens": 200,
                "latency_ms": 1100,
                "success": True
            }]
        )
        
        await db.commit()
        print("Commit successful. Verifying DB record...")
        
        # Verify RAGASMetric
        result = await db.execute(select(RAGASMetric).where(RAGASMetric.message_id == message_id))
        row = result.scalar_one_or_none()
        
        if row:
            print(f"Found RAGASMetric: faith={row.faithfulness}, conf={row.confidence}, frust={row.frustration}, proc={row.processing_ms}")
            if row.confidence == 0.88 and row.frustration == 10 and row.processing_ms == 1200:
                print("✅ RAGASMetric fields correctly persisted!")
            else:
                print("❌ RAGASMetric fields MISMATCH!")
        else:
            print("❌ RAGASMetric NOT FOUND!")

if __name__ == "__main__":
    asyncio.run(test_persistence())
