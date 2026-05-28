import asyncio
from backend.database.models import create_tables

if __name__ == "__main__":
    asyncio.run(create_tables())
    print("Database tables/columns ensured.")
