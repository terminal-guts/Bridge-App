"""
Seed script: inserts 12 realistic test profiles into Supabase.

Usage:
  cd onboarding_backend/python
  python3 scripts/seed_test_data.py

Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
"""

import os
import sys
import json
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")

SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("EXPO_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

PROFILES = [
    {
        "first_name": "Alex", "last_name": "Chen", "age": 21,
        "gender": ["male"], "interested_in_genders": ["female"],
        "location": "Houston, TX", "hometown": "Austin, TX",
        "current_job": "Software Engineering Intern",
        "education_level": "bachelors", "school": "Rice University",
        "height_inches": 71, "ethnicity": "Asian",
        "religion": "agnostic", "political_leaning": "liberal",
        "has_children": "no", "family_plans": "want_someday",
        "drinking_frequency": "sometimes", "cannabis_frequency": "never",
        "tobacco_frequency": "never", "other_drugs_frequency": "never",
        "interests": ["coding", "hiking", "photography", "cooking", "basketball"],
        "values": ["honesty", "ambition", "curiosity", "kindness"],
        "bio": "CS major who loves building things. Weekend hiker and amateur chef.",
    },
    {
        "first_name": "Maya", "last_name": "Patel", "age": 20,
        "gender": ["female"], "interested_in_genders": ["male"],
        "location": "Houston, TX", "hometown": "Dallas, TX",
        "current_job": "Research Assistant",
        "education_level": "bachelors", "school": "Rice University",
        "height_inches": 64, "ethnicity": "South Asian",
        "religion": "hindu", "political_leaning": "liberal",
        "has_children": "no", "family_plans": "want_someday",
        "drinking_frequency": "sometimes", "cannabis_frequency": "never",
        "tobacco_frequency": "never", "other_drugs_frequency": "never",
        "interests": ["reading", "yoga", "painting", "travel", "cooking"],
        "values": ["family", "kindness", "growth", "honesty"],
        "bio": "Biochem major with a love for art.",
    },
    {
        "first_name": "Jordan", "last_name": "Williams", "age": 22,
        "gender": ["male"], "interested_in_genders": ["female"],
        "location": "Houston, TX", "hometown": "Chicago, IL",
        "current_job": "Teaching Assistant",
        "education_level": "bachelors", "school": "Rice University",
        "height_inches": 74, "ethnicity": "Black",
        "religion": "christian", "political_leaning": "moderate",
        "has_children": "no", "family_plans": "want_someday",
        "drinking_frequency": "sometimes", "cannabis_frequency": "sometimes",
        "tobacco_frequency": "never", "other_drugs_frequency": "never",
        "interests": ["music", "basketball", "writing", "volunteering", "movies"],
        "values": ["faith", "loyalty", "humor", "community"],
        "bio": "English major, aspiring writer. Piano and basketball.",
    },
    {
        "first_name": "Sofia", "last_name": "Rodriguez", "age": 21,
        "gender": ["female"], "interested_in_genders": ["male"],
        "location": "Houston, TX", "hometown": "San Antonio, TX",
        "current_job": "Marketing Intern",
        "education_level": "bachelors", "school": "Rice University",
        "height_inches": 66, "ethnicity": "Hispanic",
        "religion": "catholic", "political_leaning": "moderate",
        "has_children": "no", "family_plans": "want_someday",
        "drinking_frequency": "sometimes", "cannabis_frequency": "never",
        "tobacco_frequency": "never", "other_drugs_frequency": "never",
        "interests": ["dancing", "travel", "food", "photography", "running"],
        "values": ["family", "adventure", "honesty", "faith"],
        "bio": "Business major. Salsa dancer. Always planning the next trip.",
    },
    {
        "first_name": "Ethan", "last_name": "Kim", "age": 20,
        "gender": ["male"], "interested_in_genders": ["female"],
        "location": "Houston, TX", "hometown": "Houston, TX",
        "current_job": "Data Science Intern",
        "education_level": "bachelors", "school": "Rice University",
        "height_inches": 69, "ethnicity": "Asian",
        "religion": "spiritual", "political_leaning": "liberal",
        "has_children": "no", "family_plans": "open",
        "drinking_frequency": "sometimes", "cannabis_frequency": "sometimes",
        "tobacco_frequency": "never", "other_drugs_frequency": "never",
        "interests": ["gaming", "anime", "cooking", "hiking", "music"],
        "values": ["authenticity", "curiosity", "humor", "growth"],
        "bio": "Stats major. Playlists for every mood and ramen from scratch.",
    },
    {
        "first_name": "Priya", "last_name": "Sharma", "age": 21,
        "gender": ["female"], "interested_in_genders": ["male"],
        "location": "Houston, TX", "hometown": "New York, NY",
        "current_job": "Product Management Intern",
        "education_level": "bachelors", "school": "Rice University",
        "height_inches": 63, "ethnicity": "South Asian",
        "religion": "spiritual", "political_leaning": "liberal",
        "has_children": "no", "family_plans": "want_someday",
        "drinking_frequency": "sometimes", "cannabis_frequency": "never",
        "tobacco_frequency": "never", "other_drugs_frequency": "never",
        "interests": ["startups", "reading", "yoga", "travel", "podcasts"],
        "values": ["ambition", "empathy", "growth", "honesty"],
        "bio": "Econ + CS double major. Building a startup on the side.",
    },
    {
        "first_name": "Marcus", "last_name": "Thompson", "age": 23,
        "gender": ["male"], "interested_in_genders": ["female"],
        "location": "Houston, TX", "hometown": "Atlanta, GA",
        "current_job": "Graduate Research Assistant",
        "education_level": "masters", "school": "Rice University",
        "height_inches": 72, "ethnicity": "Black",
        "religion": "christian", "political_leaning": "moderate",
        "has_children": "no", "family_plans": "want_someday",
        "drinking_frequency": "sometimes", "cannabis_frequency": "never",
        "tobacco_frequency": "never", "other_drugs_frequency": "never",
        "interests": ["fitness", "cooking", "jazz", "reading", "mentoring"],
        "values": ["faith", "discipline", "kindness", "integrity"],
        "bio": "Mechanical engineering grad student. Gym and jazz.",
    },
    {
        "first_name": "Emma", "last_name": "Davis", "age": 20,
        "gender": ["female"], "interested_in_genders": ["male"],
        "location": "Houston, TX", "hometown": "Portland, OR",
        "current_job": "UX Design Intern",
        "education_level": "bachelors", "school": "Rice University",
        "height_inches": 67, "ethnicity": "White",
        "religion": "agnostic", "political_leaning": "very_liberal",
        "has_children": "no", "family_plans": "open",
        "drinking_frequency": "sometimes", "cannabis_frequency": "sometimes",
        "tobacco_frequency": "never", "other_drugs_frequency": "never",
        "interests": ["art", "sustainability", "hiking", "music", "thrifting"],
        "values": ["creativity", "authenticity", "compassion", "adventure"],
        "bio": "Architecture major with a design obsession.",
    },
    {
        "first_name": "Daniel", "last_name": "Nguyen", "age": 21,
        "gender": ["male"], "interested_in_genders": ["female"],
        "location": "Houston, TX", "hometown": "San Jose, CA",
        "current_job": "Software Engineering Intern",
        "education_level": "bachelors", "school": "Rice University",
        "height_inches": 68, "ethnicity": "Asian",
        "religion": "buddhist", "political_leaning": "liberal",
        "has_children": "no", "family_plans": "not_sure",
        "drinking_frequency": "sometimes", "cannabis_frequency": "never",
        "tobacco_frequency": "never", "other_drugs_frequency": "never",
        "interests": ["coding", "guitar", "coffee", "board games", "running"],
        "values": ["kindness", "patience", "humor", "growth"],
        "bio": "CS major, coffee addict, mediocre guitarist.",
    },
    {
        "first_name": "Olivia", "last_name": "Martinez", "age": 22,
        "gender": ["female"], "interested_in_genders": ["male"],
        "location": "Houston, TX", "hometown": "Miami, FL",
        "current_job": "Pre-Med Research",
        "education_level": "bachelors", "school": "Rice University",
        "height_inches": 65, "ethnicity": "Hispanic",
        "religion": "catholic", "political_leaning": "moderate",
        "has_children": "no", "family_plans": "want_someday",
        "drinking_frequency": "sometimes", "cannabis_frequency": "never",
        "tobacco_frequency": "never", "other_drugs_frequency": "never",
        "interests": ["science", "dancing", "cooking", "volunteering", "travel"],
        "values": ["family", "compassion", "dedication", "faith"],
        "bio": "Pre-med senior. Hospital volunteer. Bachata dancer.",
    },
    {
        "first_name": "Ryan", "last_name": "OBrien", "age": 22,
        "gender": ["male"], "interested_in_genders": ["female"],
        "location": "Houston, TX", "hometown": "Boston, MA",
        "current_job": "Finance Intern",
        "education_level": "bachelors", "school": "Rice University",
        "height_inches": 73, "ethnicity": "White",
        "religion": "catholic", "political_leaning": "conservative",
        "has_children": "no", "family_plans": "want_someday",
        "drinking_frequency": "regularly", "cannabis_frequency": "never",
        "tobacco_frequency": "never", "other_drugs_frequency": "never",
        "interests": ["golf", "finance", "football", "cooking", "travel"],
        "values": ["loyalty", "ambition", "family", "humor"],
        "bio": "Econ major headed to investment banking. Italian food and golf.",
    },
    {
        "first_name": "Aisha", "last_name": "Rahman", "age": 20,
        "gender": ["female"], "interested_in_genders": ["male"],
        "location": "Houston, TX", "hometown": "Houston, TX",
        "current_job": "Student",
        "education_level": "bachelors", "school": "Rice University",
        "height_inches": 62, "ethnicity": "South Asian",
        "religion": "muslim", "political_leaning": "liberal",
        "has_children": "no", "family_plans": "want_someday",
        "drinking_frequency": "never", "cannabis_frequency": "never",
        "tobacco_frequency": "never", "other_drugs_frequency": "never",
        "interests": ["writing", "poetry", "photography", "hiking", "coffee"],
        "values": ["faith", "honesty", "compassion", "curiosity"],
        "bio": "English major and aspiring poet. Coffee is non-negotiable.",
    },
]

PREFERENCES = {
    "Alex":    {"preferred_gender": "female", "age_min": 19, "age_max": 24, "looking_for": "relationship", "max_distance": 50},
    "Maya":    {"preferred_gender": "male",   "age_min": 20, "age_max": 25, "looking_for": "relationship", "max_distance": 50},
    "Jordan":  {"preferred_gender": "female", "age_min": 19, "age_max": 24, "looking_for": "relationship", "max_distance": 50},
    "Sofia":   {"preferred_gender": "male",   "age_min": 20, "age_max": 25, "looking_for": "relationship", "max_distance": 50},
    "Ethan":   {"preferred_gender": "female", "age_min": 18, "age_max": 23, "looking_for": "relationship", "max_distance": 50},
    "Priya":   {"preferred_gender": "male",   "age_min": 20, "age_max": 25, "looking_for": "relationship", "max_distance": 50},
    "Marcus":  {"preferred_gender": "female", "age_min": 20, "age_max": 25, "looking_for": "relationship", "max_distance": 50},
    "Emma":    {"preferred_gender": "male",   "age_min": 19, "age_max": 24, "looking_for": "relationship", "max_distance": 50},
    "Daniel":  {"preferred_gender": "female", "age_min": 19, "age_max": 24, "looking_for": "relationship", "max_distance": 50},
    "Olivia":  {"preferred_gender": "male",   "age_min": 20, "age_max": 25, "looking_for": "relationship", "max_distance": 50},
    "Ryan":    {"preferred_gender": "female", "age_min": 19, "age_max": 24, "looking_for": "relationship", "max_distance": 50},
    "Aisha":   {"preferred_gender": "male",   "age_min": 19, "age_max": 24, "looking_for": "relationship", "max_distance": 50},
}

DEEP_QUESTIONS = {
    "Alex": {1: "Morning hike, afternoon coding on a side project, evening cooking dinner with someone.", 5: "Building software that actually helps people. Working on an app for local food banks."},
    "Maya": {1: "Farmers market in the morning, painting in the afternoon, cooking a big meal for friends.", 5: "My research on protein folding. Understanding how molecules work is genuinely beautiful.", 10: "I used to think success meant prestige. Now I think it means doing work that matters."},
    "Jordan": {1: "Church in the morning, pickup basketball, then writing at a coffee shop.", 7: "Everything. I mentor high school students and my church community keeps me grounded."},
    "Sofia": {1: "Exploring a new neighborhood, trying a restaurant I've never been to, dancing with friends.", 5: "Planning a trip to South America. I want to reconnect with my family's roots in Colombia."},
    "Ethan": {5: "Using data to understand human behavior. Also perfecting my tonkotsu ramen recipe."},
    "Priya": {1: "Working on my startup idea in the morning, long run, then dinner with friends.", 5: "Building a platform that connects first-gen college students with mentors.", 10: "That you have to choose between ambition and relationships. The right person makes you more ambitious."},
    "Marcus": {7: "I grew up in a tight-knit neighborhood. Community is why I mentor and why I want to teach.", 10: "That vulnerability is weakness. Opening up to people has made every relationship better."},
    "Emma": {1: "Thrift store run, hike at a state park, then sketching at a coffee shop.", 5: "Sustainable design. How do we build spaces that are beautiful and don't destroy the planet?"},
    "Daniel": {1: "Long morning run, brunch, board game afternoon with friends, guitar practice.", 5: "Open source software. Contributing to projects millions use for free feels meaningful."},
    "Olivia": {7: "I volunteer at Texas Children's Hospital. Seeing those kids fight puts everything in perspective.", 10: "That medicine is just science. It's really about connection."},
    "Ryan": {1: "Golf in the morning, watching football with friends, then cooking a big Italian dinner."},
    "Aisha": {1: "Writing at my favorite coffee shop, long walk with a podcast, quiet night reading.", 5: "My poetry chapbook about growing up between two cultures.", 10: "That being introverted means being lonely. Solitude is different from loneliness."},
}


def create_auth_user(email: str, password: str = "TestPassword123!") -> str:
    try:
        res = supabase.auth.admin.create_user({
            "email": email,
            "password": password,
            "email_confirm": True,
        })
        return str(res.user.id)
    except Exception as e:
        if "already been registered" in str(e).lower() or "already exists" in str(e).lower():
            users = supabase.auth.admin.list_users()
            for u in users:
                if u.email == email:
                    return str(u.id)
        raise e


def seed():
    print("=== Bridge Test Data Seeder ===\n")
    created = []

    for profile in PROFILES:
        name = profile["first_name"]
        email = f"{name.lower()}.test@bridge-app.dev"

        print(f"Creating {name}...", end=" ")

        user_id = create_auth_user(email)
        print(f"auth:{user_id[:8]}", end=" ")

        supabase.table("user_profiles").upsert({
            "user_id": user_id,
            **profile,
            "is_paused": False,
        }, on_conflict="user_id").execute()
        print("profile", end=" ")

        prefs = PREFERENCES.get(name, {})
        if prefs:
            supabase.table("user_preferences").upsert({
                "user_id": user_id,
                **prefs,
            }, on_conflict="user_id").execute()
            print("prefs", end=" ")

        dqs = DEEP_QUESTIONS.get(name, {})
        if dqs:
            supabase.table("deep_question_answers").upsert({
                "user_id": user_id,
                "answers": dqs,
                "displayed_question_ids": list(dqs.keys()),
            }, on_conflict="user_id").execute()
            print(f"dq({len(dqs)})", end=" ")

        print("OK")
        created.append({"name": name, "id": user_id, "email": email})

    print(f"\n=== Done: {len(created)} users created ===\n")
    for u in created:
        print(f"  {u['name']:10s} {u['id'][:12]}... {u['email']}")

    print("\nNow run:")
    print("  python3 -c \"from services.daily_pairing_engine import run_daily_pairing; from utils.supabase_client import get_supabase_client; print(run_daily_pairing(get_supabase_client()))\"")


if __name__ == "__main__":
    seed()
