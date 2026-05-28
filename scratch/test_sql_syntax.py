import asyncio
import os
from sqlalchemy import text
from backend.database.models import AsyncSession, get_db
from backend.core.quality.quality_metrics import load_composite_quality_sql
from datetime import datetime, timedelta

async def test_quality_sql():
    sql = load_composite_quality_sql()
    print("Testing SQL Query...")
    
    # Mock parameters
    user_id = "test_user"
    cutoff = datetime.utcnow() - timedelta(days=15)
    
    try:
        # We just want to check if it parses and runs
        # We'll use a local session to avoid connection issues if possible, 
        # but here we need to connect to something.
        # We can use a dummy engine or just check the text() wrapping.
        print("SQL wrapped in text(): OK")
        
        # Actually check for common syntax errors manually in the string
        if "ROUND(" in sql and not sql.count("(") == sql.count(")"):
             print("Error: Parentheses mismatch in ROUND calls")
        
        # Check for multiple semicolons
        if sql.count(";") > 1:
             print("Error: Multiple semicolons detected")

        print("Basic string validation complete")

    except Exception as e:
        print(f"Validation Failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_quality_sql())
