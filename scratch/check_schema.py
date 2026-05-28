
import asyncio
from backend.database.models import engine, PatientFeedback
from sqlalchemy import inspect

async def check_schema():
    async with engine.connect() as conn:
        def get_cols(sync_conn):
            return inspect(sync_conn).get_columns("patient_feedback")
        columns = await conn.run_sync(get_cols)
        print("Columns in patient_feedback:")
        for c in columns:
            print(f"- {c['name']} ({c['type']})")

if __name__ == "__main__":
    asyncio.run(check_schema())
