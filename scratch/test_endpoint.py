import requests
import os

url = "http://127.0.0.1:8000/api/voice/transcribe"
# Create a dummy but valid-ish wav file (larger than the previous one)
dummy_wav = b'RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x44\xac\x00\x00\x88\x58\x01\x00\x02\x00\x10\x00data\x00\x00\x00\x00' + b'\x00' * 1000

files = {'file': ('test.wav', dummy_wav, 'audio/wav')}
data = {'agent_id': 'MH1', 'language': 'en'}
headers = {'Authorization': 'Bearer placeholder'} # The endpoint needs a token

# Need a real token. Let's see if I can get one by logging in.
# But I don't know the password.
# However, I can bypass auth check in main.py if I modify it, 
# or I can just see if it returns 401.

try:
    response = requests.post(url, files=files, data=data)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
except Exception as e:
    print(f"Error: {e}")
