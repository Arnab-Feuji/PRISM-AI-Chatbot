import sqlite3
import pandas as pd

try:
    conn = sqlite3.connect('backend/database/prism.db')
    df = pd.read_sql_query("SELECT * FROM patient_feedback", conn)
    print("Columns:", df.columns.tolist())
    print("Data:")
    print(df)
    
except Exception as e:
    print("Error:", e)
finally:
    if 'conn' in locals():
        conn.close()
