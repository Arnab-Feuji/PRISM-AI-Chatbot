import asyncio
from fastapi.testclient import TestClient
from backend.main import app
from backend.database.models import Base, engine, create_tables

async def init():
    await create_tables()

asyncio.run(init())

client = TestClient(app)

res = client.post("/api/auth/register", json={
    "email": "test4@test.com",
    "name": "Test",
    "password": "Password123!"
})
print("Register:", res.json())

res = client.post("/api/auth/token", json={
    "email": "test4@test.com",
    "password": "Password123!"
})
print("Login Status:", res.status_code)
if res.status_code == 200:
    print("Token Length:", len(res.json()["token"]))
else:
    print("Login response:", res.json())
