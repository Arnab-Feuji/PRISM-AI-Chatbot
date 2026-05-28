
from passlib.context import CryptContext
import bcrypt

# Simulate the exact setup in auth.py
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

password = "demo123"
hashed = "$2b$12$GFizsu.Adr5F7h558GE/r.UPTKdEeHzmAyT28yjER5E.Ut19T7SE2" # From DB

try:
    print(f"Verifying password: {password}")
    res = pwd_ctx.verify(password, hashed)
    print(f"Result: {res}")
except Exception as e:
    import traceback
    print(f"Error during verify: {e}")
    traceback.print_exc()
