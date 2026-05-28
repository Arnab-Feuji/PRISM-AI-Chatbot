import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from backend.config.settings import get_settings

async def test_db():
    settings = get_settings()
    print(f"Database URL: {settings.database_url}")
    engine = create_async_engine(settings.database_url)
    try:
        async with engine.connect() as conn:
            res = await conn.execute(text("SELECT count(*) FROM users"))
            print(f"Database Connected. User count: {res.scalar()}")
            
            res = await conn.execute(text("SELECT count(*) FROM patient_feedback"))
            print(f"Feedback count: {res.scalar()}")
            
            res = await conn.execute(text("SELECT count(*) FROM indexed_documents"))
            print(f"Documents count: {res.scalar()}")
            
            res = await conn.execute(text("SELECT count(*) FROM system_alerts"))
            print(f"Alerts count: {res.scalar()}")
            
    except Exception as e:
        print(f"Database Error: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(test_db())
