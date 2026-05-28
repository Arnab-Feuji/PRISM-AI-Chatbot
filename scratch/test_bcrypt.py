
from passlib.context import CryptContext
import bcrypt

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

password = "testpassword"
hashed = pwd_ctx.hash(password)
print(f"Hashed: {hashed}")

verified = pwd_ctx.verify(password, hashed)
print(f"Verified: {verified}")

try:
    # Test direct bcrypt
    b_hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    print(f"Bcrypt Hashed: {b_hashed}")
    b_verified = bcrypt.checkpw(password.encode('utf-8'), b_hashed)
    print(f"Bcrypt Verified: {b_verified}")
except Exception as e:
    print(f"Bcrypt Error: {e}")
