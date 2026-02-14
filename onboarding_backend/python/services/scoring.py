"""
Bridge Matching Algorithm — Scoring Engine

13-category mutual percentage-based scoring. Gradient scoring: closer = higher.
All categories sum to 100%.

Category Weights:
  Age Range:    18%    Distance:      15%    Lifestyle:     12%
  Values:        8%    Interests:      8%    Family:         8%
  Religion:      6%    Politics:       6%    Height:         5%
  Ethnicity:     5%    Deep Questions: 5%    Education:      3%
  Career:        1%
"""

from typing import Dict, List, Optional, Any
import math
import re

WEIGHTS = {
    "age_range": 0.18,
    "distance": 0.15,
    "lifestyle_substances": 0.12,
    "values": 0.08,
    "interests": 0.08,
    "family": 0.08,
    "religion": 0.06,
    "politics": 0.06,
    "height": 0.05,
    "ethnicity": 0.05,
    "deep_questions": 0.05,
    "education": 0.03,
    "career": 0.01,
}

SIMILAR_RELIGIONS = [
    {"christian", "spiritual"},
    {"buddhist", "spiritual"},
    {"hindu", "spiritual"},
]

OPPOSING_RELIGIONS = [
    {"atheist", "christian"},
    {"atheist", "muslim"},
    {"atheist", "jewish"},
    {"atheist", "hindu"},
    {"agnostic", "christian"},
]

RELIGIOUS_SET = {
    "christian", "catholic", "protestant", "muslim", "jewish",
    "hindu", "buddhist", "sikh", "mormon", "jehovahs_witness",
}

POLITICS_ADJACENCY = {
    ("very_liberal", "liberal"): 0.80,
    ("liberal", "moderate"): 0.70,
    ("moderate", "conservative"): 0.70,
    ("conservative", "very_conservative"): 0.80,
    ("moderate", "not_political"): 0.80,
}

POLITICS_SPECTRUM = [
    "very_liberal", "liberal", "moderate", "conservative", "very_conservative"
]

EDUCATION_LEVELS = {
    "no_high_school": 0,
    "high_school": 1,
    "some_college": 2,
    "trade_school": 2,
    "associates": 3,
    "bachelors": 4,
    "masters": 5,
    "phd": 6,
    "beyond_masters": 6,
    "professional": 6,
    "other": 3,
}

FAMILY_PLANS_MATRIX = {
    ("want_someday", "want_someday"): 1.0,
    ("want_someday", "open"): 0.8,
    ("want_someday", "not_sure"): 0.6,
    ("want_someday", "dont_want"): 0.0,
    ("want_someday", "prefer_not_to_say"): 0.5,
    ("dont_want", "dont_want"): 1.0,
    ("dont_want", "open"): 0.4,
    ("dont_want", "not_sure"): 0.4,
    ("open", "open"): 1.0,
    ("open", "not_sure"): 0.8,
    ("not_sure", "not_sure"): 0.9,
}

DEEP_STOP_WORDS = {
    "i", "me", "my", "myself", "we", "our", "ours", "you", "your",
    "he", "she", "it", "they", "them", "the", "a", "an", "is", "are",
    "was", "were", "be", "been", "being", "have", "has", "had", "do",
    "does", "did", "will", "would", "could", "should", "may", "might",
    "shall", "can", "need", "dare", "to", "of", "in", "for", "on",
    "with", "at", "by", "from", "as", "into", "about", "like", "through",
    "after", "over", "between", "out", "up", "down", "then", "than",
    "that", "this", "these", "those", "what", "which", "who", "whom",
    "when", "where", "how", "not", "no", "nor", "but", "and", "or",
    "if", "so", "because", "very", "just", "also", "really", "think",
    "know", "want", "get", "go", "make", "see", "come", "take",
    "thing", "things", "something", "someone", "one", "much", "many",
    "would", "could", "should", "dont", "doesn", "didn", "won", "isn",
    "its", "im", "ive", "id", "ill", "thats", "theyre", "were",
}


def _get(profile: Dict, key: str, default=None):
    return profile.get(key, default)


def _get_pref(profile: Dict, prefs: Dict, key: str, default=None):
    return prefs.get(key, default)


def score_age(profile_a: Dict, prefs_a: Dict, profile_b: Dict, prefs_b: Dict) -> float:
    age_a = _get(profile_a, "age")
    age_b = _get(profile_b, "age")

    if age_a is None or age_b is None:
        return 0.5

    a_min = _get_pref(profile_a, prefs_a, "age_min", 18)
    a_max = _get_pref(profile_a, prefs_a, "age_max", 99)
    b_min = _get_pref(profile_b, prefs_b, "age_min", 18)
    b_max = _get_pref(profile_b, prefs_b, "age_max", 99)

    def direction_score(person_age, pref_min, pref_max):
        if person_age < pref_min or person_age > pref_max:
            return 0.0
        ideal = (pref_min + pref_max) / 2
        half_range = (pref_max - pref_min) / 2
        if half_range == 0:
            return 1.0 if person_age == ideal else 0.0
        dist = abs(person_age - ideal)
        return 1.0 - (dist / half_range) * 0.5

    a_to_b = direction_score(age_b, a_min, a_max)
    b_to_a = direction_score(age_a, b_min, b_max)

    return (a_to_b + b_to_a) / 2


def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 3959
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (math.sin(d_lat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(d_lon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def score_distance(
    profile_a: Dict, prefs_a: Dict,
    profile_b: Dict, prefs_b: Dict,
    actual_distance: Optional[float] = None
) -> float:
    if actual_distance is None:
        lat_a = _get(profile_a, "latitude")
        lon_a = _get(profile_a, "longitude")
        lat_b = _get(profile_b, "latitude")
        lon_b = _get(profile_b, "longitude")

        if lat_a and lon_a and lat_b and lon_b:
            actual_distance = _haversine(lat_a, lon_a, lat_b, lon_b)
        else:
            return 0.5

    a_max = _get_pref(profile_a, prefs_a, "max_distance") or _get_pref(profile_a, prefs_a, "distance_miles")
    b_max = _get_pref(profile_b, prefs_b, "max_distance") or _get_pref(profile_b, prefs_b, "distance_miles")

    if a_max is None or a_max >= 200:
        a_max = 200
    if b_max is None or b_max >= 200:
        b_max = 200

    max_acceptable = min(a_max, b_max)

    if actual_distance > max_acceptable:
        return 0.0

    if max_acceptable == 0:
        return 1.0

    score = 1.0 - (actual_distance / max_acceptable) ** 0.7
    return max(0.0, score)


def _score_single_substance(
    a_habit: Optional[str],
    b_prefs_for_substance: Any,
    b_habit: Optional[str],
    a_prefs_for_substance: Any,
) -> float:
    def one_direction(habit, partner_prefs):
        if habit is None or habit == "":
            return 0.5

        if partner_prefs is None:
            return 0.5
        if isinstance(partner_prefs, str):
            if partner_prefs == "dont_care" or partner_prefs == "don't care":
                return 1.0
            partner_prefs = [partner_prefs]
        if not isinstance(partner_prefs, list):
            return 0.5

        if "dont_care" in partner_prefs or "don't care" in partner_prefs:
            return 1.0

        if habit in partner_prefs:
            return 1.0

        if habit == "sometimes":
            has_only_yes = partner_prefs == ["yes"] or partner_prefs == ["regularly"]
            has_only_no = partner_prefs == ["no"] or partner_prefs == ["never"]
            if has_only_yes or has_only_no:
                return 0.5

        if habit == "prefer_not_to_say":
            return 0.5

        return 0.0

    a_to_b = one_direction(a_habit, b_prefs_for_substance)
    b_to_a = one_direction(b_habit, a_prefs_for_substance)
    return (a_to_b + b_to_a) / 2


def score_lifestyle(profile_a: Dict, prefs_a: Dict, profile_b: Dict, prefs_b: Dict) -> float:
    substances = ["drinking", "cannabis", "tobacco", "other_drugs"]
    habit_keys = [
        "drinking_frequency", "cannabis_frequency",
        "tobacco_frequency", "other_drugs_frequency"
    ]

    a_lifestyle_prefs = _get_pref(profile_a, prefs_a, "partner_lifestyle_preferences", {})
    b_lifestyle_prefs = _get_pref(profile_b, prefs_b, "partner_lifestyle_preferences", {})

    if isinstance(a_lifestyle_prefs, str):
        a_lifestyle_prefs = {}
    if isinstance(b_lifestyle_prefs, str):
        b_lifestyle_prefs = {}

    total = 0.0
    for substance, habit_key in zip(substances, habit_keys):
        a_habit = _get(profile_a, habit_key)
        b_habit = _get(profile_b, habit_key)

        a_pref = a_lifestyle_prefs.get(substance) if isinstance(a_lifestyle_prefs, dict) else None
        b_pref = b_lifestyle_prefs.get(substance) if isinstance(b_lifestyle_prefs, dict) else None

        total += _score_single_substance(a_habit, b_pref, b_habit, a_pref)

    return total / len(substances)


def score_values(profile_a: Dict, profile_b: Dict) -> float:
    a_vals = set(_get(profile_a, "values") or [])
    b_vals = set(_get(profile_b, "values") or [])

    if not a_vals and not b_vals:
        return 0.5

    union = a_vals | b_vals
    if len(union) == 0:
        return 0.5

    shared = a_vals & b_vals
    return len(shared) / len(union)


def score_interests(profile_a: Dict, profile_b: Dict) -> float:
    a_ints = set(_get(profile_a, "interests") or [])
    b_ints = set(_get(profile_b, "interests") or [])

    if not a_ints and not b_ints:
        return 0.5

    union = a_ints | b_ints
    if len(union) == 0:
        return 0.5

    shared = a_ints & b_ints
    return len(shared) / len(union)


def _score_has_children(profile_a: Dict, prefs_a: Dict, profile_b: Dict, prefs_b: Dict) -> float:
    a_children = _get(profile_a, "has_children")
    b_children = _get(profile_b, "has_children")

    a_non_neg = _get_pref(profile_a, prefs_a, "non_negotiables", []) or []
    b_non_neg = _get_pref(profile_b, prefs_b, "non_negotiables", []) or []

    def one_direction(their_children, my_non_neg):
        if "has_children" in my_non_neg:
            if their_children == "yes" or their_children == "has_children":
                return 0.0
            else:
                return 1.0
        return None

    a_to_b = one_direction(b_children, a_non_neg)
    b_to_a = one_direction(a_children, b_non_neg)

    if a_to_b is not None and b_to_a is not None:
        return (a_to_b + b_to_a) / 2
    if a_to_b is not None:
        b_to_a = _default_children_score(a_children, b_children)
        return (a_to_b + b_to_a) / 2
    if b_to_a is not None:
        a_to_b = _default_children_score(b_children, a_children)
        return (a_to_b + b_to_a) / 2

    return _default_children_score(a_children, b_children)


def _default_children_score(a_children, b_children):
    if a_children == "prefer_not_to_say" or b_children == "prefer_not_to_say":
        return 0.75
    if a_children is None or b_children is None:
        return 0.5
    if a_children == b_children:
        return 1.0
    return 0.5


def _score_family_plans(profile_a: Dict, profile_b: Dict) -> float:
    a_plans = _get(profile_a, "family_plans")
    b_plans = _get(profile_b, "family_plans")

    if not a_plans or not b_plans:
        return 0.5

    if a_plans == "prefer_not_to_say" or b_plans == "prefer_not_to_say":
        return 0.5

    key = (a_plans, b_plans)
    reverse_key = (b_plans, a_plans)

    score = FAMILY_PLANS_MATRIX.get(key) or FAMILY_PLANS_MATRIX.get(reverse_key)
    if score is not None:
        return score

    return 0.5


def score_family(profile_a: Dict, prefs_a: Dict, profile_b: Dict, prefs_b: Dict) -> float:
    children_score = _score_has_children(profile_a, prefs_a, profile_b, prefs_b)
    plans_score = _score_family_plans(profile_a, profile_b)
    return children_score * 0.4 + plans_score * 0.6


def _are_similar_religions(a: str, b: str) -> bool:
    a_lower = a.lower()
    b_lower = b.lower()
    for group in SIMILAR_RELIGIONS:
        if a_lower in group and b_lower in group:
            return True
    return False


def _are_opposing_religions(a: str, b: str) -> bool:
    a_lower = a.lower()
    b_lower = b.lower()
    for pair in OPPOSING_RELIGIONS:
        if {a_lower, b_lower} == pair:
            return True
    if a_lower == "atheist" and b_lower in RELIGIOUS_SET:
        return True
    if b_lower == "atheist" and a_lower in RELIGIOUS_SET:
        return True
    return False


def score_religion(profile_a: Dict, prefs_a: Dict, profile_b: Dict, prefs_b: Dict) -> float:
    a_religion = _get(profile_a, "religion")
    b_religion = _get(profile_b, "religion")

    if not a_religion or not b_religion:
        return 0.5

    a_non_neg = _get_pref(profile_a, prefs_a, "non_negotiables", []) or []
    b_non_neg = _get_pref(profile_b, prefs_b, "non_negotiables", []) or []

    def one_direction(their_religion, my_religion, my_non_neg):
        if "different_religion" in my_non_neg:
            if their_religion.lower() == my_religion.lower():
                return 1.0
            return 0.0
        if their_religion.lower() == my_religion.lower():
            return 1.0
        if _are_similar_religions(their_religion, my_religion):
            return 0.75
        if _are_opposing_religions(their_religion, my_religion):
            return 0.25
        return 0.50

    a_to_b = one_direction(b_religion, a_religion, a_non_neg)
    b_to_a = one_direction(a_religion, b_religion, b_non_neg)

    return (a_to_b + b_to_a) / 2


def score_politics(profile_a: Dict, prefs_a: Dict, profile_b: Dict, prefs_b: Dict) -> float:
    a_politics = _get(profile_a, "political_leaning")
    b_politics = _get(profile_b, "political_leaning")

    if not a_politics or not b_politics:
        return 0.5

    a_pref_politics = _get_pref(profile_a, prefs_a, "preferred_politics", [])
    b_pref_politics = _get_pref(profile_b, prefs_b, "preferred_politics", [])

    def one_direction(their_leaning, my_leaning, my_pref_politics):
        if their_leaning == "prefer_not_to_say" or my_leaning == "prefer_not_to_say":
            return 0.5

        if not my_pref_politics or "no_preference" in my_pref_politics:
            return 1.0

        if isinstance(my_pref_politics, list) and their_leaning in my_pref_politics:
            return 1.0

        if their_leaning == my_leaning:
            return 1.0

        pair = tuple(sorted([their_leaning, my_leaning]))
        for adj_pair, adj_score in POLITICS_ADJACENCY.items():
            if set(pair) == set(adj_pair):
                return adj_score

        if their_leaning == "not_political" or my_leaning == "not_political":
            return 0.6

        if {their_leaning, my_leaning} == {"very_liberal", "very_conservative"}:
            return 0.0

        if their_leaning in POLITICS_SPECTRUM and my_leaning in POLITICS_SPECTRUM:
            a_idx = POLITICS_SPECTRUM.index(their_leaning)
            b_idx = POLITICS_SPECTRUM.index(my_leaning)
            gap = abs(a_idx - b_idx)
            if gap >= 3:
                return 0.1
            if gap >= 2:
                return 0.3

        return 0.5

    a_to_b = one_direction(b_politics, a_politics, a_pref_politics)
    b_to_a = one_direction(a_politics, b_politics, b_pref_politics)

    return (a_to_b + b_to_a) / 2


def score_height(profile_a: Dict, prefs_a: Dict, profile_b: Dict, prefs_b: Dict) -> float:
    a_height = _get(profile_a, "height_inches")
    b_height = _get(profile_b, "height_inches")

    if a_height is None or b_height is None:
        return 0.5

    a_min = _get_pref(profile_a, prefs_a, "height_min")
    a_max = _get_pref(profile_a, prefs_a, "height_max")
    b_min = _get_pref(profile_b, prefs_b, "height_min")
    b_max = _get_pref(profile_b, prefs_b, "height_max")

    def direction_score(person_height, pref_min, pref_max):
        if (pref_min is None or pref_min == 0) and (pref_max is None or pref_max == 0 or pref_max >= 120):
            return 1.0

        effective_min = pref_min if pref_min and pref_min > 0 else 48
        effective_max = pref_max if pref_max and pref_max < 120 else 96

        if person_height < effective_min or person_height > effective_max:
            return 0.0

        ideal = (effective_min + effective_max) / 2
        half_range = (effective_max - effective_min) / 2
        if half_range == 0:
            return 1.0 if person_height == ideal else 0.0
        dist = abs(person_height - ideal)
        return 1.0 - (dist / half_range) * 0.5

    a_to_b = direction_score(b_height, a_min, a_max)
    b_to_a = direction_score(a_height, b_min, b_max)

    return (a_to_b + b_to_a) / 2


def score_ethnicity(profile_a: Dict, prefs_a: Dict, profile_b: Dict, prefs_b: Dict) -> float:
    a_ethnicity = _get(profile_a, "ethnicity")
    b_ethnicity = _get(profile_b, "ethnicity")

    if not a_ethnicity or not b_ethnicity:
        return 0.5

    a_pref_eth = _get_pref(profile_a, prefs_a, "preferred_ethnicities", []) or []
    b_pref_eth = _get_pref(profile_b, prefs_b, "preferred_ethnicities", []) or []

    STANDARD_ETHNICITIES = {
        "white", "black", "asian", "hispanic", "latino", "middle_eastern",
        "native_american", "pacific_islander", "south_asian", "southeast_asian",
        "east_asian", "african", "caribbean", "mixed", "multiracial",
    }

    def one_direction(their_ethnicity, my_pref_ethnicities):
        if not my_pref_ethnicities or "no_preference" in my_pref_ethnicities:
            return 1.0

        if their_ethnicity.lower() in [e.lower() for e in my_pref_ethnicities]:
            return 1.0

        if " / " in their_ethnicity:
            components = [c.strip().lower() for c in their_ethnicity.split(" / ")]
            for comp in components:
                if comp in [e.lower() for e in my_pref_ethnicities]:
                    return 1.0

        if their_ethnicity.lower() not in STANDARD_ETHNICITIES:
            return 0.5

        return 0.0

    a_to_b = one_direction(b_ethnicity, a_pref_eth)
    b_to_a = one_direction(a_ethnicity, b_pref_eth)

    return (a_to_b + b_to_a) / 2


def score_education(profile_a: Dict, profile_b: Dict) -> float:
    a_edu = _get(profile_a, "education_level")
    b_edu = _get(profile_b, "education_level")

    if not a_edu or not b_edu:
        return 0.5

    a_level = EDUCATION_LEVELS.get(a_edu.lower(), 3)
    b_level = EDUCATION_LEVELS.get(b_edu.lower(), 3)

    gap = abs(a_level - b_level)

    if gap == 0:
        return 1.0
    elif gap == 1:
        return 0.8
    elif gap == 2:
        return 0.6
    elif gap == 3:
        return 0.4
    else:
        return 0.2


def _normalize_text(text: Optional[str]) -> str:
    if not text:
        return ""
    return text.lower().strip()


def _extract_keywords(text: str) -> set:
    stop_words = {"the", "a", "an", "at", "in", "of", "and", "or", "for", "to", "is", "inc", "llc", "ltd"}
    words = set(_normalize_text(text).split())
    return words - stop_words


def score_career(profile_a: Dict, profile_b: Dict) -> float:
    a_job = _normalize_text(_get(profile_a, "current_job"))
    b_job = _normalize_text(_get(profile_b, "current_job"))
    a_company = _normalize_text(_get(profile_a, "company_position"))
    b_company = _normalize_text(_get(profile_b, "company_position"))
    a_school = _normalize_text(_get(profile_a, "school"))
    b_school = _normalize_text(_get(profile_b, "school"))

    if (not a_job and not a_company) or (not b_job and not b_company):
        return 0.5

    if a_company and b_company and a_company == b_company:
        return 1.0

    if a_school and b_school and a_school == b_school:
        return 1.0

    a_keywords = _extract_keywords(a_job) | _extract_keywords(a_company)
    b_keywords = _extract_keywords(b_job) | _extract_keywords(b_company)

    if a_keywords and b_keywords:
        overlap = a_keywords & b_keywords
        if overlap:
            return 0.75

    if a_job and b_job:
        return 0.5

    return 0.25


def _score_question_overlap(deep_a: List[Dict], deep_b: List[Dict]) -> float:
    a_ids = {d.get("question_id") for d in deep_a if d.get("question_id")}
    b_ids = {d.get("question_id") for d in deep_b if d.get("question_id")}

    if not a_ids or not b_ids:
        return 0.5

    shared = a_ids & b_ids
    overlap_ratio = len(shared) / min(len(a_ids), len(b_ids))
    return min(1.0, overlap_ratio * 1.2)


def _extract_meaningful_words(text: str) -> set:
    if not text:
        return set()
    words = set(re.sub(r'[^a-z\s]', '', text.lower()).split())
    return {w for w in words if w not in DEEP_STOP_WORDS and len(w) > 2}


def _score_keyword_overlap(deep_a: List[Dict], deep_b: List[Dict]) -> float:
    a_words = set()
    for d in deep_a:
        a_words |= _extract_meaningful_words(d.get("answer_text", ""))

    b_words = set()
    for d in deep_b:
        b_words |= _extract_meaningful_words(d.get("answer_text", ""))

    if not a_words or not b_words:
        return 0.5

    shared = a_words & b_words
    union = a_words | b_words

    if len(union) == 0:
        return 0.5

    jaccard = len(shared) / len(union)
    return min(1.0, jaccard / 0.25)


def _score_answer_length_similarity(deep_a: List[Dict], deep_b: List[Dict]) -> float:
    def avg_length(answers):
        lengths = [len(d.get("answer_text", "")) for d in answers]
        return sum(lengths) / len(lengths) if lengths else 0

    a_avg = avg_length(deep_a)
    b_avg = avg_length(deep_b)

    if a_avg == 0 and b_avg == 0:
        return 0.5

    if a_avg == 0 or b_avg == 0:
        return 0.3

    return min(a_avg, b_avg) / max(a_avg, b_avg)


def score_deep_questions(deep_a: List[Dict], deep_b: List[Dict]) -> float:
    if not deep_a and not deep_b:
        return 0.5

    if not deep_a or not deep_b:
        return 0.3

    question_score = _score_question_overlap(deep_a, deep_b)
    keyword_score = _score_keyword_overlap(deep_a, deep_b)
    length_score = _score_answer_length_similarity(deep_a, deep_b)

    return question_score * 0.4 + keyword_score * 0.4 + length_score * 0.2


def calculate_compatibility(
    profile_a: Dict,
    prefs_a: Dict,
    profile_b: Dict,
    prefs_b: Dict,
    actual_distance: Optional[float] = None,
    deep_questions_a: Optional[List[Dict]] = None,
    deep_questions_b: Optional[List[Dict]] = None,
) -> Dict[str, Any]:
    raw = {
        "age_range": score_age(profile_a, prefs_a, profile_b, prefs_b),
        "distance": score_distance(profile_a, prefs_a, profile_b, prefs_b, actual_distance),
        "lifestyle_substances": score_lifestyle(profile_a, prefs_a, profile_b, prefs_b),
        "values": score_values(profile_a, profile_b),
        "interests": score_interests(profile_a, profile_b),
        "family": score_family(profile_a, prefs_a, profile_b, prefs_b),
        "religion": score_religion(profile_a, prefs_a, profile_b, prefs_b),
        "politics": score_politics(profile_a, prefs_a, profile_b, prefs_b),
        "height": score_height(profile_a, prefs_a, profile_b, prefs_b),
        "ethnicity": score_ethnicity(profile_a, prefs_a, profile_b, prefs_b),
        "deep_questions": score_deep_questions(
            deep_questions_a or [], deep_questions_b or []
        ),
        "education": score_education(profile_a, profile_b),
        "career": score_career(profile_a, profile_b),
    }

    weighted = {}
    total = 0.0
    for category, raw_score in raw.items():
        w = WEIGHTS[category]
        contribution = raw_score * w * 100
        weighted[category] = round(contribution, 2)
        total += contribution

    category_scores = {cat: round(raw_score * 100, 1) for cat, raw_score in raw.items()}

    return {
        "total_score": round(total, 1),
        "category_scores": category_scores,
        "weighted_scores": weighted,
        "raw_scores": {cat: round(v, 4) for cat, v in raw.items()},
    }


def passes_basic_filter(
    profile_a: Dict,
    prefs_a: Dict,
    profile_b: Dict,
    prefs_b: Dict,
) -> bool:
    a_gender = _get(profile_a, "gender") or []
    b_gender = _get(profile_b, "gender") or []
    a_interested = _get_pref(profile_a, prefs_a, "interested_in_genders", []) or []
    b_interested = _get_pref(profile_b, prefs_b, "interested_in_genders", []) or []

    if isinstance(a_gender, str):
        a_gender = [a_gender]
    if isinstance(b_gender, str):
        b_gender = [b_gender]

    if a_interested:
        a_ok = any(g in a_interested for g in b_gender) or "everyone" in a_interested
        if not a_ok:
            return False

    if b_interested:
        b_ok = any(g in b_interested for g in a_gender) or "everyone" in b_interested
        if not b_ok:
            return False

    a_age = _get(profile_a, "age")
    b_age = _get(profile_b, "age")
    if a_age and b_age:
        a_min = _get_pref(profile_a, prefs_a, "age_min", 18)
        a_max = _get_pref(profile_a, prefs_a, "age_max", 99)
        b_min = _get_pref(profile_b, prefs_b, "age_min", 18)
        b_max = _get_pref(profile_b, prefs_b, "age_max", 99)

        if b_age < a_min or b_age > a_max:
            return False
        if a_age < b_min or a_age > b_max:
            return False

    return True
