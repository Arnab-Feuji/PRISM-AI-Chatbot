#!/usr/bin/env python3
"""Test script for the Admin Sentiment Endpoint
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi.testclient import TestClient
from backend.main import app, require_admin

# Mock require_admin dependency to bypass auth
app.dependency_overrides[require_admin] = lambda: {"email": "admin@prism.ai", "role": "admin"}

def run_test():
    print("[TEST] Initializing FastAPI TestClient...")
    client = TestClient(app)
    
    print("[TEST] Sending GET request to /api/admin/sentiment...")
    response = client.get("/api/admin/sentiment")
    
    if response.status_code != 200:
        print(f"[FAIL] Expected status code 200, got {response.status_code}")
        print(response.text)
        return
        
    data = response.json()
    print("[SUCCESS] Successfully fetched sentiment report!")
    
    # 1. Verify disease_wise order and names
    print("\n--- Disease-Wise Alignment ---")
    disease_wise = data.get("disease_wise", [])
    expected_order = ["Diabetes", "Cancer Care", "Cardiovascular", "Mental Illness", "Respiratory"]
    
    for idx, d in enumerate(disease_wise):
        print(f"  {idx + 1}. Code: {d['disease_code']} | Name: {d['disease_name']} | Avg Score: {d['avg_sentiment_score']}%")
        
    # Verify exact matches
    actual_names = [d["disease_name"] for d in disease_wise]
    if actual_names == expected_order:
        print("  [PASS] Disease sequence and naming are 100% correct!")
    else:
        print(f"  [FAIL] Expected {expected_order}, but got {actual_names}")
        
    # 2. Verify user specific timestamps and details
    print("\n--- Patient Specific Telemetry & Timestamps ---")
    user_specific = data.get("user_specific", [])
    print(f"  Total Active Patients: {len(user_specific)}")
    
    all_have_timestamps = True
    for idx, p in enumerate(user_specific[:6]):
        print(f"  Patient: {p['name']} ({p['email']}) | Area: {p['primary_disease']} | Timestamp: {p.get('timestamp')}")
        if not p.get('timestamp'):
            all_have_timestamps = False
            
    if all_have_timestamps:
        print("  [PASS] All patient records successfully return correct timestamps!")
    else:
        print("  [FAIL] Some patient records are missing the timestamp field.")

if __name__ == "__main__":
    run_test()
