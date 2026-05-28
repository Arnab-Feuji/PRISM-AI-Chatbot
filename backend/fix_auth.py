import asyncio
from sqlalchemy import select
from backend.database.models import User, get_db
from backend.middleware.auth import hash_password
import uuid

async def fix_auth():
    async for db in get_db():
        # Check if test user exists
        res = await db.execute(select(User).where(User.email == "patient@prism.com"))
        user = res.scalar_one_or_none()
        
        if not user:
            print("Creating test user patient@prism.com...")
            user = User(
                id=str(uuid.uuid4()),
                email="patient@prism.com",
                name="Test Patient",
                hashed_password=hash_password("prism123"),
                subscription="premium",
                subscribed_diseases=["CA", "DM", "CV", "MH", "RS"]
            )
            db.add(user)
        else:
            print("Resetting password for patient@prism.com...")
            user.hashed_password = hash_password("prism123")
            user.subscription = "premium"
            user.subscribed_diseases = ["CA", "DM", "CV", "MH", "RS"]
        
        await db.commit()
        print("Done. You can login with patient@prism.com / prism123")
        break

if __name__ == "__main__":
    import os
    os.environ["PYTHONPATH"] = "."
    asyncio.run(fix_auth())
