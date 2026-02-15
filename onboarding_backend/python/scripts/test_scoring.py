"""
Local test: runs the scoring engine against all 12 test profiles
and prints every cross-gender pair score with category breakdowns.

Usage:
  cd onboarding_backend/python
  python3 scripts/test_scoring.py
"""

import sys
from pathlib import Path

# Add parent to path so we can import services
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.scoring import calculate_compatibility, passes_basic_filter

# -- Test Profiles (matching seed_test_data.sql) --

PROFILES = {
    "Alex": {
        "first_name": "Alex", "age": 21, "gender": ["male"],
        "interested_in_genders": ["female"],
        "location": "Houston, TX", "latitude": 29.7174, "longitude": -95.4018,
        "current_job": "Software Engineering Intern",
        "education_level": "bachelors", "school": "Rice University",
        "height_inches": 71, "ethnicity": "Asian",
        "religion": "agnostic", "political_leaning": "liberal",
        "has_children": "no", "family_plans": "want_someday",
        "drinking_frequency": "sometimes", "cannabis_frequency": "never",
        "tobacco_frequency": "never", "other_drugs_frequency": "never",
        "interests": ["coding", "hiking", "photography", "cooking", "basketball"],
        "values": ["honesty", "ambition", "curiosity", "kindness"],
    },
    "Maya": {
        "first_name": "Maya", "age": 20, "gender": ["female"],
        "interested_in_genders": ["male"],
        "location": "Houston, TX", "latitude": 29.7152, "longitude": -95.3987,
        "current_job": "Research Assistant",
        "education_level": "bachelors", "school": "Rice University",
        "height_inches": 64, "ethnicity": "South Asian",
        "religion": "hindu", "political_leaning": "liberal",
        "has_children": "no", "family_plans": "want_someday",
        "drinking_frequency": "sometimes", "cannabis_frequency": "never",
        "tobacco_frequency": "never", "other_drugs_frequency": "never",
        "interests": ["reading", "yoga", "painting", "travel", "cooking"],
        "values": ["family", "kindness", "growth", "honesty"],
    },
    "Jordan": {
        "first_name": "Jordan", "age": 22, "gender": ["male"],
        "interested_in_genders": ["female"],
        "location": "Houston, TX", "latitude": 29.7210, "longitude": -95.3963,
        "current_job": "Teaching Assistant",
        "education_level": "bachelors", "school": "Rice University",
        "height_inches": 74, "ethnicity": "Black",
        "religion": "christian", "political_leaning": "moderate",
        "has_children": "no", "family_plans": "want_someday",
        "drinking_frequency": "sometimes", "cannabis_frequency": "sometimes",
        "tobacco_frequency": "never", "other_drugs_frequency": "never",
        "interests": ["music", "basketball", "writing", "volunteering", "movies"],
        "values": ["faith", "loyalty", "humor", "community"],
    },
    "Sofia": {
        "first_name": "Sofia", "age": 21, "gender": ["female"],
        "interested_in_genders": ["male"],
        "location": "Houston, TX", "latitude": 29.7135, "longitude": -95.4050,
        "current_job": "Marketing Intern",
        "education_level": "bachelors", "school": "Rice University",
        "height_inches": 66, "ethnicity": "Hispanic",
        "religion": "catholic", "political_leaning": "moderate",
        "has_children": "no", "family_plans": "want_someday",
        "drinking_frequency": "sometimes", "cannabis_frequency": "never",
        "tobacco_frequency": "never", "other_drugs_frequency": "never",
        "interests": ["dancing", "travel", "food", "photography", "running"],
        "values": ["family", "adventure", "honesty", "faith"],
    },
    "Ethan": {
        "first_name": "Ethan", "age": 20, "gender": ["male"],
        "interested_in_genders": ["female"],
        "location": "Houston, TX", "latitude": 29.7190, "longitude": -95.4000,
        "current_job": "Data Science Intern",
        "education_level": "bachelors", "school": "Rice University",
        "height_inches": 69, "ethnicity": "Asian",
        "religion": "spiritual", "political_leaning": "liberal",
        "has_children": "no", "family_plans": "open",
        "drinking_frequency": "sometimes", "cannabis_frequency": "sometimes",
        "tobacco_frequency": "never", "other_drugs_frequency": "never",
        "interests": ["gaming", "anime", "cooking", "hiking", "music"],
        "values": ["authenticity", "curiosity", "humor", "growth"],
    },
    "Priya": {
        "first_name": "Priya", "age": 21, "gender": ["female"],
        "interested_in_genders": ["male"],
        "location": "Houston, TX", "latitude": 29.7160, "longitude": -95.4030,
        "current_job": "Product Management Intern",
        "education_level": "bachelors", "school": "Rice University",
        "height_inches": 63, "ethnicity": "South Asian",
        "religion": "spiritual", "political_leaning": "liberal",
        "has_children": "no", "family_plans": "want_someday",
        "drinking_frequency": "sometimes", "cannabis_frequency": "never",
        "tobacco_frequency": "never", "other_drugs_frequency": "never",
        "interests": ["startups", "reading", "yoga", "travel", "podcasts"],
        "values": ["ambition", "empathy", "growth", "honesty"],
    },
    "Marcus": {
        "first_name": "Marcus", "age": 23, "gender": ["male"],
        "interested_in_genders": ["female"],
        "location": "Houston, TX", "latitude": 29.7200, "longitude": -95.3950,
        "current_job": "Graduate Research Assistant",
        "education_level": "masters", "school": "Rice University",
        "height_inches": 72, "ethnicity": "Black",
        "religion": "christian", "political_leaning": "moderate",
        "has_children": "no", "family_plans": "want_someday",
        "drinking_frequency": "sometimes", "cannabis_frequency": "never",
        "tobacco_frequency": "never", "other_drugs_frequency": "never",
        "interests": ["fitness", "cooking", "jazz", "reading", "mentoring"],
        "values": ["faith", "discipline", "kindness", "integrity"],
    },
    "Emma": {
        "first_name": "Emma", "age": 20, "gender": ["female"],
        "interested_in_genders": ["male"],
        "location": "Houston, TX", "latitude": 29.7145, "longitude": -95.4065,
        "current_job": "UX Design Intern",
        "education_level": "bachelors", "school": "Rice University",
        "height_inches": 67, "ethnicity": "White",
        "religion": "agnostic", "political_leaning": "very_liberal",
        "has_children": "no", "family_plans": "open",
        "drinking_frequency": "sometimes", "cannabis_frequency": "sometimes",
        "tobacco_frequency": "never", "other_drugs_frequency": "never",
        "interests": ["art", "sustainability", "hiking", "music", "thrifting"],
        "values": ["creativity", "authenticity", "compassion", "adventure"],
    },
    "Daniel": {
        "first_name": "Daniel", "age": 21, "gender": ["male"],
        "interested_in_genders": ["female"],
        "location": "Houston, TX", "latitude": 29.7180, "longitude": -95.3975,
        "current_job": "Software Engineering Intern",
        "education_level": "bachelors", "school": "Rice University",
        "height_inches": 68, "ethnicity": "Asian",
        "religion": "buddhist", "political_leaning": "liberal",
        "has_children": "no", "family_plans": "not_sure",
        "drinking_frequency": "sometimes", "cannabis_frequency": "never",
        "tobacco_frequency": "never", "other_drugs_frequency": "never",
        "interests": ["coding", "guitar", "coffee", "board games", "running"],
        "values": ["kindness", "patience", "humor", "growth"],
    },
    "Olivia": {
        "first_name": "Olivia", "age": 22, "gender": ["female"],
        "interested_in_genders": ["male"],
        "location": "Houston, TX", "latitude": 29.7125, "longitude": -95.4040,
        "current_job": "Pre-Med Research",
        "education_level": "bachelors", "school": "Rice University",
        "height_inches": 65, "ethnicity": "Hispanic",
        "religion": "catholic", "political_leaning": "moderate",
        "has_children": "no", "family_plans": "want_someday",
        "drinking_frequency": "sometimes", "cannabis_frequency": "never",
        "tobacco_frequency": "never", "other_drugs_frequency": "never",
        "interests": ["science", "dancing", "cooking", "volunteering", "travel"],
        "values": ["family", "compassion", "dedication", "faith"],
    },
    "Ryan": {
        "first_name": "Ryan", "age": 22, "gender": ["male"],
        "interested_in_genders": ["female"],
        "location": "Houston, TX", "latitude": 29.7165, "longitude": -95.3990,
        "current_job": "Finance Intern",
        "education_level": "bachelors", "school": "Rice University",
        "height_inches": 73, "ethnicity": "White",
        "religion": "catholic", "political_leaning": "conservative",
        "has_children": "no", "family_plans": "want_someday",
        "drinking_frequency": "regularly", "cannabis_frequency": "never",
        "tobacco_frequency": "never", "other_drugs_frequency": "never",
        "interests": ["golf", "finance", "football", "cooking", "travel"],
        "values": ["loyalty", "ambition", "family", "humor"],
    },
    "Aisha": {
        "first_name": "Aisha", "age": 20, "gender": ["female"],
        "interested_in_genders": ["male"],
        "location": "Houston, TX", "latitude": 29.7155, "longitude": -95.4010,
        "current_job": "Student",
        "education_level": "bachelors", "school": "Rice University",
        "height_inches": 62, "ethnicity": "South Asian",
        "religion": "muslim", "political_leaning": "liberal",
        "has_children": "no", "family_plans": "want_someday",
        "drinking_frequency": "never", "cannabis_frequency": "never",
        "tobacco_frequency": "never", "other_drugs_frequency": "never",
        "interests": ["writing", "poetry", "photography", "hiking", "coffee"],
        "values": ["faith", "honesty", "compassion", "curiosity"],
    },
}

PREFERENCES = {
    "Alex":   {"age_min": 19, "age_max": 24, "max_distance": 50},
    "Maya":   {"age_min": 20, "age_max": 25, "max_distance": 50},
    "Jordan": {"age_min": 19, "age_max": 24, "max_distance": 50},
    "Sofia":  {"age_min": 20, "age_max": 25, "max_distance": 50},
    "Ethan":  {"age_min": 18, "age_max": 23, "max_distance": 50},
    "Priya":  {"age_min": 20, "age_max": 25, "max_distance": 50},
    "Marcus": {"age_min": 20, "age_max": 25, "max_distance": 50},
    "Emma":   {"age_min": 19, "age_max": 24, "max_distance": 50},
    "Daniel": {"age_min": 19, "age_max": 24, "max_distance": 50},
    "Olivia": {"age_min": 20, "age_max": 25, "max_distance": 50},
    "Ryan":   {"age_min": 19, "age_max": 24, "max_distance": 50},
    "Aisha":  {"age_min": 19, "age_max": 24, "max_distance": 50},
}

DEEP_QUESTIONS = {
    "Alex":   [{"question_id": 1, "answer_text": "Morning hike, afternoon coding on a side project, evening cooking dinner with someone."}, {"question_id": 5, "answer_text": "Building software that actually helps people. Working on an app for local food banks."}],
    "Maya":   [{"question_id": 1, "answer_text": "Farmers market in the morning, painting in the afternoon, cooking a big meal for friends."}, {"question_id": 5, "answer_text": "My research on protein folding. Understanding how molecules work is genuinely beautiful."}, {"question_id": 10, "answer_text": "I used to think success meant prestige. Now I think it means doing work that matters."}],
    "Jordan": [{"question_id": 1, "answer_text": "Church in the morning, pickup basketball, then writing at a coffee shop."}, {"question_id": 7, "answer_text": "Everything. I mentor high school students and my church community keeps me grounded."}],
    "Sofia":  [{"question_id": 1, "answer_text": "Exploring a new neighborhood, trying a restaurant I've never been to, dancing with friends."}, {"question_id": 5, "answer_text": "Planning a trip to South America. I want to reconnect with my family's roots in Colombia."}],
    "Ethan":  [{"question_id": 5, "answer_text": "Using data to understand human behavior. Also perfecting my tonkotsu ramen recipe."}],
    "Priya":  [{"question_id": 1, "answer_text": "Working on my startup idea in the morning, long run, then dinner with friends."}, {"question_id": 5, "answer_text": "Building a platform that connects first-gen college students with mentors."}, {"question_id": 10, "answer_text": "That you have to choose between ambition and relationships. The right person makes you more ambitious."}],
    "Marcus": [{"question_id": 7, "answer_text": "I grew up in a tight-knit neighborhood. Community is why I mentor and why I want to teach."}, {"question_id": 10, "answer_text": "That vulnerability is weakness. Opening up to people has made every relationship better."}],
    "Emma":   [{"question_id": 1, "answer_text": "Thrift store run, hike at a state park, then sketching at a coffee shop."}, {"question_id": 5, "answer_text": "Sustainable design. How do we build spaces that are beautiful and don't destroy the planet?"}],
    "Daniel": [{"question_id": 1, "answer_text": "Long morning run, brunch, board game afternoon with friends, guitar practice."}, {"question_id": 5, "answer_text": "Open source software. Contributing to projects millions use for free feels meaningful."}],
    "Olivia": [{"question_id": 7, "answer_text": "I volunteer at Texas Children's Hospital. Seeing those kids fight puts everything in perspective."}, {"question_id": 10, "answer_text": "That medicine is just science. It's really about connection."}],
    "Ryan":   [{"question_id": 1, "answer_text": "Golf in the morning, watching football with friends, then cooking a big Italian dinner."}],
    "Aisha":  [{"question_id": 1, "answer_text": "Writing at my favorite coffee shop, long walk with a podcast, quiet night reading."}, {"question_id": 5, "answer_text": "My poetry chapbook about growing up between two cultures."}, {"question_id": 10, "answer_text": "That being introverted means being lonely. Solitude is different from loneliness."}],
}

MALES = ["Alex", "Jordan", "Ethan", "Marcus", "Daniel", "Ryan"]
FEMALES = ["Maya", "Sofia", "Priya", "Emma", "Olivia", "Aisha"]


def run_test():
    print("=" * 70)
    print("BRIDGE SCORING ENGINE — LOCAL TEST RUN")
    print("=" * 70)

    # Score all cross-gender pairs
    results = []
    for m in MALES:
        for f in FEMALES:
            prof_a = PROFILES[m]
            prof_b = PROFILES[f]
            prefs_a = PREFERENCES[m]
            prefs_b = PREFERENCES[f]

            if not passes_basic_filter(prof_a, prefs_a, prof_b, prefs_b):
                continue

            result = calculate_compatibility(
                prof_a, prefs_a, prof_b, prefs_b,
                deep_questions_a=DEEP_QUESTIONS.get(m, []),
                deep_questions_b=DEEP_QUESTIONS.get(f, []),
            )
            results.append((m, f, result))

    # Sort by score descending
    results.sort(key=lambda x: x[2]["total_score"], reverse=True)

    # Print all pairs
    print(f"\n{'Pair':<25} {'Score':>6}  {'Age':>4} {'Dist':>4} {'Life':>4} {'Val':>4} {'Int':>4} {'Fam':>4} {'Rel':>4} {'Pol':>4} {'Ht':>4} {'Eth':>4} {'DQ':>4} {'Edu':>4} {'Car':>4}")
    print("-" * 120)

    for m, f, result in results:
        cs = result["category_scores"]
        print(
            f"{m + ' + ' + f:<25} {result['total_score']:>5.1f}%"
            f"  {cs['age_range']:>4.0f} {cs['distance']:>4.0f} {cs['lifestyle_substances']:>4.0f}"
            f" {cs['values']:>4.0f} {cs['interests']:>4.0f} {cs['family']:>4.0f}"
            f" {cs['religion']:>4.0f} {cs['politics']:>4.0f} {cs['height']:>4.0f}"
            f" {cs['ethnicity']:>4.0f} {cs['deep_questions']:>4.0f} {cs['education']:>4.0f}"
            f" {cs['career']:>4.0f}"
        )

    print(f"\n{'=' * 70}")
    print(f"SUMMARY: {len(results)} valid cross-gender pairs scored")

    scores = [r[2]["total_score"] for r in results]
    print(f"  Average: {sum(scores)/len(scores):.1f}%")
    print(f"  Highest: {max(scores):.1f}% ({results[0][0]} + {results[0][1]})")
    print(f"  Lowest:  {min(scores):.1f}% ({results[-1][0]} + {results[-1][1]})")

    # Top 6 pairings (greedy matching)
    print(f"\n{'=' * 70}")
    print("GREEDY MATCHING (top pairing per person):")
    print("-" * 70)
    matched = set()
    pairings = []
    for m, f, result in results:
        if m not in matched and f not in matched:
            pairings.append((m, f, result))
            matched.add(m)
            matched.add(f)

    for m, f, result in pairings:
        print(f"  {m:<10} + {f:<10} = {result['total_score']:.1f}%")

    # Detailed breakdown of top match
    print(f"\n{'=' * 70}")
    top_m, top_f, top_result = pairings[0]
    print(f"DETAILED: {top_m} + {top_f} ({top_result['total_score']:.1f}%)")
    print("-" * 70)
    for cat, raw in top_result["raw_scores"].items():
        weight = {"age_range": 18, "distance": 15, "lifestyle_substances": 12,
                  "values": 8, "interests": 8, "family": 8, "religion": 6,
                  "politics": 6, "height": 5, "ethnicity": 5, "deep_questions": 5,
                  "education": 3, "career": 1}[cat]
        cat_score = top_result["category_scores"][cat]
        weighted = top_result["weighted_scores"][cat]
        bar = "#" * int(cat_score / 5) + "." * (20 - int(cat_score / 5))
        print(f"  {cat:<22} [{bar}] {cat_score:>5.1f}% x {weight}% = {weighted:>5.2f}")


if __name__ == "__main__":
    run_test()
