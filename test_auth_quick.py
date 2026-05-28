#!/usr/bin/env python3
"""Quick auth test"""
import requests
import json

BASE_URL = "http://localhost:8000"

print("=" * 60)
print("Testing PRISM Authentication")
print("=" * 60)

# Test 1: Register
print("\n1. Testing Registration...")
try:
    resp = requests.post(
        f"{BASE_URL}/api/auth/register",
        json={
            "email": "quicktest@prism.ai",
            "name": "Quick Test",
            "password": "test123",
            "country": "USA"
        },
        timeout=5
    )
    print(f"   Status: {resp.status_code}")
    if resp.status_code == 200:
        data = resp.json()
        print(f"   ✓ Registration successful")
        print(f"   Token: {data.get('token', '')[:20]}...")
        token = data.get('token')
    else:
        print(f"   Error: {resp.text}")
except Exception as e:
    print(f"   ✗ Failed: {e}")

# Test 2: Login
print("\n2. Testing Login...")
try:
    resp = requests.post(
        f"{BASE_URL}/api/auth/token",
        json={
            "email": "quicktest@prism.ai",
            "password": "test123"
        },
        timeout=5
    )
    print(f"   Status: {resp.status_code}")
    if resp.status_code == 200:
        data = resp.json()
        print(f"   ✓ Login successful")
        print(f"   Token: {data.get('token', '')[:20]}...")
        print(f"   User: {data.get('user', {}).get('email')}")
    else:
        print(f"   Error: {resp.text}")
except Exception as e:
    print(f"   ✗ Failed: {e}")

print("\n" + "=" * 60)
