
import requests
import json

BASE_URL = "http://127.0.0.1:8000/api"

def test_feedback():
    # We need a valid token. Let's try to register/login a test user.
    test_user = {
        "email": "test_feedback@example.com",
        "name": "Test Feedback",
        "password": "password123",
        "language": "en"
    }
    
    print("Registering test user...")
    resp = requests.post(f"{BASE_URL}/auth/register", json=test_user)
    if resp.status_code != 200:
        print(f"Registration failed: {resp.text}")
        print("Trying to login instead...")
        resp = requests.post(f"{BASE_URL}/auth/token", json={"email": test_user["email"], "password": test_user["password"]})
    
    if resp.status_code != 200:
        print(f"Login failed: {resp.text}")
        return
    
    token = resp.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    feedback_payload = {
        "message_id": "test-msg-id",
        "conversation_id": "test-conv-id",
        "rating": 3,
        "helpful": False,
        "accurate": False,
        "comment": "This is a test comment",
        "tags": ["Slow or buggy", "Incorrect or incomplete"],
        "agent_id": "RS_AGENT",
        "disease_code": "RS"
    }
    
    print("Submitting feedback...")
    resp = requests.post(f"{BASE_URL}/feedback", json=feedback_payload, headers=headers)
    print(f"Status: {resp.status_code}")
    print(f"Response: {resp.text}")

if __name__ == "__main__":
    test_feedback()
