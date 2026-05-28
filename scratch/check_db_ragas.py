import asyncio
from sqlalchemy import text
from backend.database.models import engine

async def check_db():
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT COUNT(*) FROM ragas_metrics"))
        count = res.scalar()
        print(f"Total Metrics Rows: {count}")
        
        if count > 0:
            res = await conn.execute(text("SELECT faithfulness, answer_relevancy, context_precision, overall_score FROM ragas_metrics ORDER BY created_at DESC LIMIT 5"))
            rows = res.fetchall()
            for r in rows:
                print(f"Row: faith={r[0]}, rel={r[1]}, prec={r[2]}, overall={r[3]}")
        else:
            print("Database table 'ragas_metrics' is EMPTY.")

if __name__ == "__main__":
    asyncio.run(check_db())
