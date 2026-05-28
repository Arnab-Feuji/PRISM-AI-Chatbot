import os
import io
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

key = os.getenv("OPENAI_API_KEY")
print(f"Testing key: {key[:10]}...")

client = OpenAI(api_key=key)

try:
    # Create a dummy silent wav file
    dummy_wav = b'RIFF$\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00D\xac\x00\x00\x88X\x01\x00\x02\x00\x10\x00data\x00\x00\x00\x00'
    audio_file = io.BytesIO(dummy_wav)
    audio_file.name = "test.wav"

    print("Sending transcription request...")
    transcript = client.audio.transcriptions.create(
        model="whisper-1",
        file=audio_file
    )
    print(f"Success! Transcript: '{transcript.text}'")
except Exception as e:
    print(f"Error: {e}")
