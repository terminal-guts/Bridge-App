import psycopg2
import os
from pathlib import Path

# Reuse the DB_URL from existing config or env if possible, 
# but for this script we'll use the hardcoded one just like the others.
# Ideally would read from .env.
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
    schema_path = Path(__file__).parent.parent / "sql" / "matches_schema.sql"
    if schema_path.exists():
        apply_sql_file(schema_path)
    else:
        print(f"Could not find matches_schema.sql at {schema_path}")
