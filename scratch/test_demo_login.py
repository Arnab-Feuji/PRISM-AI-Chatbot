import asyncio
from httpx import AsyncClient
from backend.main import app

async def main():
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Login with demo@prism.ai
        res = await client.post("/api/auth/token", json={
            "email": "demo@prism.ai",
            "password": "prism123" # Assuming this is the password
        })
        print("Login demo@prism.ai:", res.status_code)
        if res.status_code != 200:
            print("Error:", res.text)

if __name__ == "__main__":
    asyncio.run(main())
