import asyncio
from sqlalchemy import select, update
from backend.database.models import User, AsyncSession
from backend.middleware.auth import hash_password
from httpx import AsyncClient
from backend.main import app

async def test_upgrade():
    async with AsyncSession() as db:
        # Reset demo@prism.ai to basic
        await db.execute(
            update(User)
            .where(User.email == "demo@prism.ai")
            .values(
                subscription="basic",
                subscribed_diseases=["CA"],
                hashed_password=hash_password("prism123")
            )
        )
        await db.commit()
        print("Reset demo user")

    async with AsyncClient(app=app, base_url="http://test") as client:
        res = await client.post("/api/auth/token", json={
            "email": "demo@prism.ai",
            "password": "prism123"
        })
        print("Login status:", res.status_code)
        if res.status_code == 200:
            data = res.json()
            print("Subscription after login:", data["user"]["subscription"])
            print("Diseases after login:", data["user"]["subscribed_diseases"])
        else:
            print("Error:", res.text)

if __name__ == "__main__":
    asyncio.run(test_upgrade())
