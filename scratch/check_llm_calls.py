import asyncio
from sqlalchemy import text
from backend.database.models import engine

async def check_llm_calls():
    try:
        async with engine.connect() as conn:
            res = await conn.execute(text("SELECT COUNT(*) FROM llm_call_logs"))
            print(f"Total LLM Calls: {res.scalar()}")
    except Exception as e:
        print(f"Error checking llm_call_logs: {e}")

if __name__ == "__main__":
    asyncio.run(check_llm_calls())
