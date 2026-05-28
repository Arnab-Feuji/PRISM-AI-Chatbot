import asyncio
from httpx import AsyncClient
from backend.main import app
from backend.database.models import create_tables

async def main():
    await create_tables()
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Register
        res = await client.post("/api/auth/register", json={
            "email": "test@example.com",
            "name": "Test User",
            "password": "Password123!"
        })
        print("Register:", res.status_code, res.json())
        
        # Login
        res = await client.post("/api/auth/token", json={
            "email": "test@example.com",
            "password": "Password123!"
        })
        print("Login:", res.status_code)
        if res.status_code == 200:
            print("Token:", res.json()["token"][:20] + "...")
        else:
            print("Error:", res.json())

if __name__ == "__main__":
    asyncio.run(main())
