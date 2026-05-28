import asyncio
from backend.database.models import engine, text

async def check():
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public'"))
        cols = res.fetchall()
        for r in cols:
            print(f"{r[0]}.{r[1]}")
        
        # Check if 'cqs' is in any of these
        cqs_cols = [f"{r[0]}.{r[1]}" for r in cols if 'cqs' in r[1].lower()]
        print("\nColumns containing 'cqs':", cqs_cols)

if __name__ == "__main__":
    asyncio.run(check())
