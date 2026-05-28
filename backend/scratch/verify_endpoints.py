import requests
import sys

# BASE_URL = "http://127.0.0.1:8000"
# Since I can't easily authenticate without a real user, I'll check if the endpoints exist
# and if they return 401 when unauthenticated (which is correct).

endpoints = [
    "/api/chat/prescription",
    "/api/chat/history/download"
]

for ep in endpoints:
    url = f"http://127.0.0.1:8000{ep}"
    try:
        response = requests.post(url, json={"conversation_id": "test-uuid", "agent_id": "CA1"}, timeout=5)
        print(f"Endpoint {ep}: Status {response.status_code}")
        if response.status_code == 401:
            print(f"  SUCCESS: {ep} requires authentication.")
        else:
            print(f"  INFO: Got status {response.status_code}")
    except requests.exceptions.ConnectionError:
        print(f"  ERROR: Could not connect to {url}. Is the backend running?")
    except Exception as e:
        print(f"  ERROR: {e}")
