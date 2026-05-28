import asyncio
from backend.database.models import engine, text

async def fix():
    async with engine.begin() as conn:
        print("Creating pg_trgm extension...")
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm"))
        print("Extension created or already exists.")

if __name__ == "__main__":
    asyncio.run(fix())
