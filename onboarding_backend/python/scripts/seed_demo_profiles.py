"""
Seed script: inserts 5 realistic demo user profiles into Supabase.

Usage:
  cd onboarding_backend/python
  python3 scripts/seed_demo_profiles.py

Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
"""

import os
import sys
import uuid
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client

# Load environment variables
load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")

SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("EXPO_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Fixed UUIDs for idempotency
DEMO_USER_IDS = [
    "d0000000-0000-0000-0000-000000000001",
    "d0000000-0000-0000-0000-000000000002",
    "d0000000-0000-0000-0000-000000000003",
    "d0000000-0000-0000-0000-000000000004",
    "d0000000-0000-0000-0000-000000000005",
]

REVIEWER_USER_ID = "d0000000-0000-0000-0000-000000000000"

DEMO_PROFILES = [
    {
        "id": DEMO_USER_IDS[0],
        "first_name": "Maya", "last_name": "Patel", "age": 24,
        "gender": ["female"], "interested_in_genders": ["male", "non-binary"],
        "ethnicity": "South Asian", "location": "Houston, TX", "hometown": "Dallas, TX",
        "current_job": "Graphic Designer", "education_level": "bachelors", "school": "UT Austin",
        "interests": ["yoga", "painting", "reading", "hiking", "vegan cooking"],
        "values": ["kindness", "growth", "authenticity", "creativity"],
        "bio": "Art enthusiast and yoga practitioner. Love exploring local galleries and finding the best chai in town.",
        "looking_for": "serious",
        "email": "maya.demo@bridgedate.app"
    },
    {
        "id": DEMO_USER_IDS[1],
        "first_name": "Ethan", "last_name": "Miller", "age": 26,
        "gender": ["male"], "interested_in_genders": ["female"],
        "ethnicity": "White", "location": "Houston, TX", "hometown": "Austin, TX",
        "current_job": "Software Engineer", "education_level": "bachelors", "school": "Rice University",
        "interests": ["cooking", "hiking", "photography", "board games", "rock climbing"],
        "values": ["honesty", "ambition", "humor", "loyalty"],
        "bio": "CS grad who loves the outdoors. If I'm not coding, I'm probably halfway up a mountain or trying a new recipe.",
        "looking_for": "serious",
        "email": "ethan.demo@bridgedate.app"
    },
    {
        "id": DEMO_USER_IDS[2],
        "first_name": "Jordan", "last_name": "Williams", "age": 22,
        "gender": ["non-binary"], "interested_in_genders": ["male", "female", "non-binary"],
        "ethnicity": "Black", "location": "Houston, TX", "hometown": "Chicago, IL",
        "current_job": "Freelance Writer", "education_level": "bachelors", "school": "University of Houston",
        "interests": ["music", "poetry", "vinyl records", "podcasts", "social justice"],
        "values": ["empathy", "justice", "community", "curiosity"],
        "bio": "Words and melodies are my language. Looking for deep connections and good conversations.",
        "looking_for": "open",
        "email": "jordan.demo@bridgedate.app"
    },
    {
        "id": DEMO_USER_IDS[3],
        "first_name": "Sofia", "last_name": "Rodriguez", "age": 28,
        "gender": ["female"], "interested_in_genders": ["male"],
        "ethnicity": "Hispanic", "location": "Houston, TX", "hometown": "San Antonio, TX",
        "current_job": "Marketing Manager", "education_level": "masters", "school": "Texas A&M",
        "interests": ["salsa dancing", "traveling", "photography", "wine tasting", "swimming"],
        "values": ["family", "adventure", "integrity", "faith"],
        "bio": "Always planning my next trip. I love dancing, good wine, and spending time with my family.",
        "looking_for": "serious",
        "email": "sofia.demo@bridgedate.app"
    },
    {
        "id": DEMO_USER_IDS[4],
        "first_name": "Alex", "last_name": "Chen", "age": 25,
        "gender": ["male"], "interested_in_genders": ["female", "non-binary"],
        "ethnicity": "Asian", "location": "Houston, TX", "hometown": "Seattle, WA",
        "current_job": "Data Analyst", "education_level": "bachelors", "school": "UW",
        "interests": ["coding", "street photography", "running", "sushi", "e-sports"],
        "values": ["intelligence", "discipline", "open-mindedness", "growth"],
        "bio": "Analytical mind with a creative heart. I run half-marathons and capture the city through my lens.",
        "looking_for": "casual",
        "email": "alex.demo@bridgedate.app"
    }
]

DEEP_QUESTIONS = [
    {"question_id": 1, "question_text": "What's your idea of a perfect first date?", "answers": [
        "A long walk in the park followed by a cozy dinner at a place with great lighting.",
        "Doing something active like rock climbing or a hike, then getting tacos.",
        "Checking out a local music venue or a poetry slam.",
        "Dancing the night away and then talking until the sun comes up.",
        "A quiet coffee shop where we can actually hear each other talk."
    ]},
    {"question_id": 2, "question_text": "What are you most passionate about?", "answers": [
        "Using art to tell stories that haven't been heard yet.",
        "Building things that make people's lives easier and more efficient.",
        "Creating communities where everyone feels like they belong.",
        "Experiencing everything the world has to offer and never stopping growing.",
        "Finding the patterns in data that reveal the truth about how the world works."
    ]}
]

def create_auth_user(user_id, email, password="TestPassword123!"):
    try:
        supabase.auth.admin.create_user({
            "id": user_id,
            "email": email,
            "password": password,
            "email_confirm": True,
        })
        print(f"Created auth user: {email}")
    except Exception as e:
        if "already been registered" in str(e).lower() or "already exists" in str(e).lower():
            print(f"Auth user already exists: {email}")
        else:
            print(f"Error creating auth user {email}: {e}")

def seed():
    print("=== Seeding Demo Profiles ===\n")

    # Create Reviewer account
    create_auth_user(REVIEWER_USER_ID, "reviewer@bridgedate.app", "AppReview2024!")

    # Create Reviewer Profile (minimal)
    supabase.table("user_profiles").upsert({
        "user_id": REVIEWER_USER_ID,
        "first_name": "Apple",
        "last_name": "Reviewer",
        "age": 30,
        "gender": ["male"],
        "location": "Houston, TX",
        "profile_photo_path": f"https://i.pravatar.cc/400?u={REVIEWER_USER_ID}",
    }, on_conflict="user_id").execute()

    for i, profile in enumerate(DEMO_PROFILES):
        user_id = profile["id"]
        email = profile["email"]

        # 1. Create Auth User
        create_auth_user(user_id, email)

        # 2. Insert User Profile
        profile_data = {
            "user_id": user_id,
            "first_name": profile["first_name"],
            "last_name": profile["last_name"],
            "age": profile["age"],
            "gender": profile["gender"],
            "interested_in_genders": profile["interested_in_genders"],
            "ethnicity": profile["ethnicity"],
            "location": profile["location"],
            "hometown": profile["hometown"],
            "current_job": profile["current_job"],
            "education_level": profile["education_level"],
            "school": profile["school"],
            "interests": profile["interests"],
            "values": profile["values"],
            "bio": profile["bio"],
            "is_verified": True,
            "is_paused": False,
            "profile_photo_path": f"https://i.pravatar.cc/400?u={user_id}",
            "photos": [
                {"id": f"photo-{user_id}-1", "url": f"https://i.pravatar.cc/400?u={user_id}1", "is_main": True, "order": 0},
                {"id": f"photo-{user_id}-2", "url": f"https://i.pravatar.cc/400?u={user_id}2", "is_main": False, "order": 1}
            ]
        }

        # Add profile_completed if it exists or other flags
        # Based on CLAUDE.md and memory, we want these to be 'completed'
        # user_profiles table doesn't have profile_completed but we can assume fully populated means completed

        supabase.table("user_profiles").upsert(profile_data, on_conflict="user_id").execute()
        print(f"Upserted profile: {profile['first_name']}")

        # 3. Insert User Photos
        for j in range(2):
            supabase.table("user_photos").upsert({
                "user_id": user_id,
                "storage_path": f"demo/{user_id}/{j}",
                "url": f"https://i.pravatar.cc/400?u={user_id}{j}",
                "is_main": j == 0,
                "display_order": j
            }).execute()
        print(f"Upserted photos for: {profile['first_name']}")

        # 4. Insert User Preferences
        supabase.table("user_preferences").upsert({
            "user_id": user_id,
            "looking_for": profile["looking_for"],
            "preferred_gender": "both",
            "age_min": 22,
            "age_max": 30,
            "max_distance": 50
        }, on_conflict="user_id").execute()
        print(f"Upserted preferences for: {profile['first_name']}")

        # 5. Insert Deep Question Answers
        for dq in DEEP_QUESTIONS:
            supabase.table("deep_question_answers").upsert({
                "user_id": user_id,
                "question_id": dq["question_id"],
                "question_text": dq["question_text"],
                "answer_text": dq["answers"][i],
                "tier": 1,
                "is_displayed": True
            }, on_conflict="user_id, question_id").execute()
        print(f"Upserted deep questions for: {profile['first_name']}")

    print("\n=== Seeding Complete ===")

if __name__ == "__main__":
    seed()
