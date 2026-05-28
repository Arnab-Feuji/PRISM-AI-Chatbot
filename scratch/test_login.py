
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import select
import os
from dotenv import load_dotenv
import sys

# Correct path for imports
sys.path.append(os.path.join(os.getcwd(), 'backend'))
from database.models import User
from middleware.auth import verify_password

load_dotenv()

async def test_login(email, password):
    db_url = os.getenv("DATABASE_URL")
    engine = create_async_engine(db_url)
    AsyncSession = async_sessionmaker(engine, expire_on_commit=False)
    
    try:
        async with AsyncSession() as session:
            res = await session.execute(select(User).where(User.email == email))
            user = res.scalar_one_or_none()
            if not user:
                print(f"User {email} not found")
                return
            
            print(f"User found: {user.email}")
            print(f"Hashed password in DB: {user.hashed_password}")
            
            is_valid = verify_password(password, user.hashed_password)
            print(f"Password valid: {is_valid}")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    # Test with demo accounts from Login.jsx
    print("--- Testing Patient account ---")
    asyncio.run(test_login("patient@prism.ai", "demo123"))
    print("\n--- Testing Admin account ---")
    asyncio.run(test_login("admin@prism.ai", "admin123"))
