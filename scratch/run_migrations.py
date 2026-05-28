import asyncio
from backend.database.models import create_tables

async def main():
    print("Starting migrations...")
    await create_tables()
    print("Migrations complete.")

if __name__ == "__main__":
    asyncio.run(main())
