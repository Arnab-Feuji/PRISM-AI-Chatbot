import asyncio
from sqlalchemy import text
from backend.database.models import engine

async def check_schema():
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'patient_feedback' AND column_name = 'tags'"))
        row = res.fetchone()
        if row:
            print(f"SUCCESS: Column 'tags' exists in 'patient_feedback' table.")
        else:
            print(f"FAILURE: Column 'tags' DOES NOT exist in 'patient_feedback' table.")

if __name__ == "__main__":
    asyncio.run(check_schema())
