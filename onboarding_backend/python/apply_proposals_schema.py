"""
Apply the proposals schema to Supabase.
Run this script to create the proposals, proposal_votes, and pool_vote_assignments tables.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load env
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)
load_dotenv()

from utils.supabase_client import get_supabase_client

def apply_schema():
    supabase = get_supabase_client()

    sql_path = Path(__file__).parent.parent / "sql" / "proposals_schema.sql"

    if not sql_path.exists():
        print(f"Schema file not found: {sql_path}")
        return

    sql = sql_path.read_text()

    print("Applying proposals schema...")
    print(f"SQL file: {sql_path}")

    try:
        # Execute via Supabase RPC or direct SQL
        # Note: Supabase Python client doesn't support raw SQL directly.
        # You need to run this SQL in the Supabase SQL Editor or via psql.
        print("\n" + "=" * 60)
        print("IMPORTANT: Run the following SQL in Supabase SQL Editor:")
        print("=" * 60)
        print(f"\nFile: {sql_path}")
        print("\nOr copy the SQL from the file and paste it into:")
        print("Supabase Dashboard > SQL Editor > New Query")
        print("=" * 60)

    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    apply_schema()
