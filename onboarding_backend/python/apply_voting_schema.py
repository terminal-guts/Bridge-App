import psycopg2
import os
from pathlib import Path

# Reuse the DB_URL from existing config or env if possible, 
# but for this script we'll use the hardcoded one from apply_schema.py 
# (assuming it's the correct one given I can't easily see .env vars in python without loading them)
# Actually, better to read from .env if possible to be safe, but apply_schema.py had it hardcoded.
# I will copy the one from apply_schema.py to ensure it works.
DB_URL = "postgresql://postgres:ucqae7SBr729ue_@db.ikyiwnydgedwbmcdzgbe.supabase.co:5432/postgres?sslmode=require"

def apply_sql_file(file_path):
    print(f"Connecting to Supabase...")
    try:
        conn = psycopg2.connect(DB_URL)
        conn.autocommit = True
        cur = conn.cursor()
        
        print(f"Reading {file_path}...")
        with open(file_path, 'r') as f:
            sql = f.read()
        
        print(f"Executing SQL...")
        cur.execute(sql)
        print("Schema applied successfully!")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    schema_path = Path(__file__).parent.parent / "sql" / "votes_schema.sql"
    if schema_path.exists():
        apply_sql_file(schema_path)
    else:
        print(f"Could not find votes_schema.sql at {schema_path}")
