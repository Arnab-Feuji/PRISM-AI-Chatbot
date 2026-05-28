import uvicorn
from backend.main import app
import multiprocessing
import time
import httpx
import asyncio

def run_server():
    uvicorn.run(app, host="127.0.0.1", port=8005, log_level="debug")

async def test_login():
    async with httpx.AsyncClient() as client:
        try:
            # Login with patient@prism.com (should be there if fix_auth was run)
            res = await client.post("http://127.0.0.1:8005/api/auth/token", json={
                "email": "patient@prism.com",
                "password": "prism123"
            })
            print(f"Status: {res.status_code}")
            print(f"Body: {res.text}")
        except Exception as e:
            print(f"Request failed: {e}")

if __name__ == "__main__":
    p = multiprocessing.Process(target=run_server)
    p.start()
    time.sleep(5) # Wait for server to start
    asyncio.run(test_login())
    p.terminate()
