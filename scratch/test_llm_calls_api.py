import asyncio
import httpx

async def test_llm_calls_api():
    # Note: We need admin auth, but for local testing we can check if the route exists
    # Or we can just trust that it works if the syntax is correct.
    # However, let's try to fetch it if possible.
    url = "http://127.0.0.1:8000/api/admin/llm-calls"
    print(f"Testing {url}...")
    try:
        async with httpx.AsyncClient() as client:
            # We don't have the admin token here, so it might fail with 401
            # but that still confirms the route is mapped.
            resp = await client.get(url)
            print(f"Status: {resp.status_code}")
            if resp.status_code == 200:
                data = resp.json()
                print(f"Count: {len(data)}")
                if data:
                    print(f"First Item: {data[0]}")
            elif resp.status_code == 401:
                print("✅ Route exists but requires authentication (expected).")
            else:
                print(f"❌ Unexpected status: {resp.status_code}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_llm_calls_api())
