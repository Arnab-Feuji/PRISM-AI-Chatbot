import asyncio
import sys

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

async def test_db():
    from database.models import engine
    from sqlalchemy import text
    async with engine.connect() as conn:
        try:
            res = await conn.execute(text("SELECT * FROM patient_feedback LIMIT 1"))
            print("Table patient_feedback exists!")
            rows = res.fetchall()
            print("Data:", rows)
        except Exception as e:
            print("Error querying patient_feedback:", e)

asyncio.run(test_db())
