import asyncio
import os
from sqlalchemy import text
from backend.database.models import engine

async def check_tables():
    async with engine.connect() as conn:
        print("Checking tables...")
        for table in ["users", "conversations", "messages", "llm_call_logs", "system_alerts", "ragas_metrics"]:
            try:
                res = await conn.execute(text(f"SELECT COUNT(*) FROM {table} LIMIT 1"))
                print(f"Table '{table}': EXISTS (count: {res.scalar()})")
            except Exception as e:
                print(f"Table '{table}': MISSING or ERROR ({e})")

if __name__ == "__main__":
    os.environ["DATABASE_URL"] = "postgresql+asyncpg://prism_user:prism_pass@127.0.0.1:5432/prism_db"
    asyncio.run(check_tables())
