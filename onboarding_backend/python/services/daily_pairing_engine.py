"""
Bridge Daily Pairing Engine

Generates exactly ONE pairing per eligible user per day using the
12-category scoring grid.

Design Principles:
  • Each user gets exactly ONE partner per day (mutual: if A→B then B→A).
  • Previously paired or active-match pairs are deprioritized, not blocked,
    so users always get a result.
  • Existing conversations and matches are NEVER affected — this only
    writes to the `daily_pairings` table.
  • Runs at the Universal Proposal Release Hour (00:00 UTC by default).
  • Uses a greedy maximum-weight matching heuristic to optimize total
    compatibility across all users.
"""

from typing import List, Dict, Tuple, Optional, Any, Set
import datetime
import random

from services.scoring import calculate_compatibility, passes_basic_filter


# ============================================================================
# Configuration
# ============================================================================

# Minimum score to even attempt a pairing (soft floor — we'll still pair if
# nothing better exists).
SOFT_MIN_SCORE = 20.0

# How many days back to look for recent pairings to avoid repeats
RECENT_PAIRING_LOOKBACK_DAYS = 7

# Universal release hour (UTC) — must match frontend constant
UNIVERSAL_PROPOSAL_RELEASE_HOUR = 0  # 00:00 UTC


# ============================================================================
# Data Fetching
# ============================================================================

def _fetch_eligible_users(supabase) -> List[Dict]:
    """
    Fetch users eligible for daily pairing.
    Criteria: profile complete, not paused, active within 14 days.
    """
    cutoff = (datetime.datetime.now(datetime.timezone.utc) -
              datetime.timedelta(days=14)).isoformat()
    try:
        result = supabase.table("profiles").select("*") \
            .eq("profile_completed", True) \
            .eq("is_paused", False) \
            .gte("last_active_at", cutoff) \
            .execute()
        return result.data or []
    except Exception as e:
        print(f"[DAILY_PAIRING] Warning with activity filter: {e}")
        try:
            result = supabase.table("profiles").select("*") \
                .eq("profile_completed", True) \
                .eq("is_paused", False) \
                .execute()
            return result.data or []
        except Exception as e2:
            print(f"[DAILY_PAIRING] Error fetching users: {e2}")
            return []


def _fetch_preferences(supabase, user_ids: List[str]) -> Dict[str, Dict]:
    """Fetch preferences keyed by user_id."""
    if not user_ids:
        return {}
    try:
        result = supabase.table("user_preferences").select("*") \
            .in_("user_id", user_ids) \
            .execute()
        return {p["user_id"]: p for p in (result.data or [])}
    except Exception as e:
        print(f"[DAILY_PAIRING] Error fetching preferences: {e}")
        return {}


def _fetch_recent_pairings(supabase, lookback_days: int = RECENT_PAIRING_LOOKBACK_DAYS) -> Set[frozenset]:
    """
    Get pairs that were paired in the last N days so we can deprioritize them
    (variety is important). Returns set of frozenset({user_a, user_b}).
    """
    cutoff_date = (datetime.date.today() - datetime.timedelta(days=lookback_days)).isoformat()
    try:
        result = supabase.table("daily_pairings") \
            .select("user_id, partner_id") \
            .gte("pairing_date", cutoff_date) \
            .execute()
        pairs = set()
        for row in (result.data or []):
            pairs.add(frozenset({row["user_id"], row["partner_id"]}))
        return pairs
    except Exception as e:
        print(f"[DAILY_PAIRING] Error fetching recent pairings: {e}")
        return set()


def _fetch_active_match_pairs(supabase) -> Set[frozenset]:
    """
    Get pairs that currently have an active match.
    These users should NOT be paired with each other (they're already matched).
    """
    try:
        result = supabase.table("matches") \
            .select("user1_id, user2_id") \
            .eq("status", "active") \
            .execute()
        pairs = set()
        for row in (result.data or []):
            pairs.add(frozenset({row["user1_id"], row["user2_id"]}))
        return pairs
    except Exception as e:
        print(f"[DAILY_PAIRING] Error fetching active matches: {e}")
        return set()


def _fetch_existing_today_pairings(supabase, today: str) -> Set[str]:
    """
    Check which users already have a pairing for today.
    Prevents duplicate runs from overwriting.
    """
    try:
        result = supabase.table("daily_pairings") \
            .select("user_id") \
            .eq("pairing_date", today) \
            .execute()
        return {row["user_id"] for row in (result.data or [])}
    except Exception as e:
        print(f"[DAILY_PAIRING] Error checking existing pairings: {e}")
        return set()


# ============================================================================
# Scoring & Matching
# ============================================================================

def _score_pair(
    profile_a: Dict, prefs_a: Dict,
    profile_b: Dict, prefs_b: Dict,
) -> Optional[Dict]:
    """
    Score a pair using the 12-category grid.
    Returns None if they fail basic filters.
    """
    if not passes_basic_filter(profile_a, prefs_a, profile_b, prefs_b):
        return None

    result = calculate_compatibility(profile_a, prefs_a, profile_b, prefs_b)
    return result


def _build_scored_edges(
    users: List[Dict],
    prefs_map: Dict[str, Dict],
    active_match_pairs: Set[frozenset],
    recent_pairs: Set[frozenset],
) -> List[Tuple[str, str, float, Dict]]:
    """
    Build a list of scored edges (user_a_id, user_b_id, adjusted_score, full_result).

    Scoring adjustments:
      • Active match pair → skip entirely (don't pair them)
      • Recently paired → -15 penalty (encourage variety)
    """
    edges = []
    n = len(users)

    print(f"[DAILY_PAIRING] Scoring {n * (n - 1) // 2} possible pairs...")

    for i in range(n):
        for j in range(i + 1, n):
            a = users[i]
            b = users[j]
            pair_key = frozenset({a["id"], b["id"]})

            # Skip active matches (they're already together)
            if pair_key in active_match_pairs:
                continue

            prefs_a = prefs_map.get(a["id"], {})
            prefs_b = prefs_map.get(b["id"], {})

            result = _score_pair(a, prefs_a, b, prefs_b)
            if result is None:
                continue

            score = result["total_score"]

            # Deprioritize recently paired (but don't block)
            if pair_key in recent_pairs:
                score -= 15.0

            if score > 0:
                edges.append((a["id"], b["id"], score, result))

    # Sort by score descending (greedy matching will pick best first)
    edges.sort(key=lambda e: e[2], reverse=True)

    print(f"[DAILY_PAIRING] {len(edges)} scored edges (after filters)")
    return edges


def _greedy_maximum_matching(
    edges: List[Tuple[str, str, float, Dict]],
    user_ids: Set[str],
) -> List[Tuple[str, str, Dict]]:
    """
    Greedy maximum-weight matching: iterate edges from highest score downward.
    Each user is matched at most once.

    Returns list of (user_a_id, user_b_id, scoring_result).
    """
    matched = set()
    pairings = []

    for a_id, b_id, score, result in edges:
        if a_id in matched or b_id in matched:
            continue

        pairings.append((a_id, b_id, result))
        matched.add(a_id)
        matched.add(b_id)

        # Stop when all users are matched
        if matched >= user_ids:
            break

    return pairings


# ============================================================================
# Database Writes
# ============================================================================

def _calculate_expires_at() -> str:
    """Calculate the next drop time (tomorrow at UNIVERSAL_PROPOSAL_RELEASE_HOUR UTC)."""
    now = datetime.datetime.now(datetime.timezone.utc)
    tomorrow = now.date() + datetime.timedelta(days=1)
    expires = datetime.datetime(
        tomorrow.year, tomorrow.month, tomorrow.day,
        UNIVERSAL_PROPOSAL_RELEASE_HOUR, 0, 0,
        tzinfo=datetime.timezone.utc,
    )
    return expires.isoformat()


def _insert_pairings(
    supabase,
    pairings: List[Tuple[str, str, Dict]],
    today: str,
) -> int:
    """
    Insert pairings into daily_pairings table.
    Each pair creates TWO rows (one per user) so each user can query their own.

    IMPORTANT: This only writes to daily_pairings. It does NOT touch
    conversations, matches, proposals, or any other table.
    """
    expires_at = _calculate_expires_at()
    inserted = 0

    for a_id, b_id, result in pairings:
        total_score = result["total_score"]
        category_scores = result["category_scores"]
        weighted_scores = result["weighted_scores"]

        rows = [
            {
                "pairing_date": today,
                "user_id": a_id,
                "partner_id": b_id,
                "compatibility_score": total_score,
                "category_scores": category_scores,
                "weighted_scores": weighted_scores,
                "expires_at": expires_at,
            },
            {
                "pairing_date": today,
                "user_id": b_id,
                "partner_id": a_id,
                "compatibility_score": total_score,
                "category_scores": category_scores,
                "weighted_scores": weighted_scores,
                "expires_at": expires_at,
            },
        ]

        try:
            supabase.table("daily_pairings").insert(rows).execute()
            inserted += 2
        except Exception as e:
            # Unique constraint violation = already exists, skip
            if "unique_user_daily_pairing" in str(e).lower() or "duplicate" in str(e).lower():
                print(f"[DAILY_PAIRING] Pair {a_id} ↔ {b_id} already exists for {today}, skipping")
            else:
                print(f"[DAILY_PAIRING] Error inserting pair {a_id} ↔ {b_id}: {e}")

    return inserted


# ============================================================================
# Main Entry Point
# ============================================================================

def run_daily_pairing(supabase) -> Dict[str, Any]:
    """
    Main entry point: generate today's pairings.

    Steps:
    1. Fetch eligible users
    2. Check for existing pairings today (idempotent)
    3. Fetch preferences, recent pairings, active matches
    4. Score all viable pairs
    5. Greedy maximum-weight matching (exactly 1 partner per user)
    6. Insert into daily_pairings table

    SAFE: Does NOT modify conversations, matches, proposals, or any
    other user state. Only writes to daily_pairings.

    Returns summary dict.
    """
    today = datetime.date.today().isoformat()
    print(f"[DAILY_PAIRING] === Starting daily pairing for {today} ===")

    # 1. Eligible users
    users = _fetch_eligible_users(supabase)
    print(f"[DAILY_PAIRING] {len(users)} eligible users")

    if len(users) < 2:
        return {
            "status": "insufficient_users",
            "date": today,
            "eligible_users": len(users),
            "pairings_created": 0,
        }

    # 2. Idempotent check: skip users who already have a pairing today
    already_paired = _fetch_existing_today_pairings(supabase, today)
    users = [u for u in users if u["id"] not in already_paired]
    print(f"[DAILY_PAIRING] {len(users)} users need pairing ({len(already_paired)} already paired)")

    if len(users) < 2:
        return {
            "status": "all_paired",
            "date": today,
            "eligible_users": len(users) + len(already_paired),
            "already_paired": len(already_paired),
            "pairings_created": 0,
        }

    # 3. Fetch context data
    user_ids = [u["id"] for u in users]
    prefs_map = _fetch_preferences(supabase, user_ids)
    recent_pairs = _fetch_recent_pairings(supabase)
    active_match_pairs = _fetch_active_match_pairs(supabase)
    print(f"[DAILY_PAIRING] Context: {len(prefs_map)} prefs, "
          f"{len(recent_pairs)} recent pairs, "
          f"{len(active_match_pairs)} active matches")

    # 4. Score all viable pairs
    edges = _build_scored_edges(users, prefs_map, active_match_pairs, recent_pairs)

    if not edges:
        return {
            "status": "no_compatible_pairs",
            "date": today,
            "eligible_users": len(users),
            "pairings_created": 0,
        }

    # 5. Greedy maximum-weight matching
    user_id_set = {u["id"] for u in users}
    pairings = _greedy_maximum_matching(edges, user_id_set)
    print(f"[DAILY_PAIRING] Matched {len(pairings)} pairs "
          f"({len(pairings) * 2}/{len(users)} users)")

    # 6. Insert into database
    inserted = _insert_pairings(supabase, pairings, today)
    print(f"[DAILY_PAIRING] Inserted {inserted} pairing rows")

    # Summary stats
    scores = [p[2]["total_score"] for p in pairings]
    unmatched = len(users) - (len(pairings) * 2)

    return {
        "status": "success",
        "date": today,
        "eligible_users": len(users) + len(already_paired),
        "users_needing_pairing": len(users),
        "pairings_created": len(pairings),
        "rows_inserted": inserted,
        "unmatched_users": max(0, unmatched),
        "avg_score": round(sum(scores) / len(scores), 1) if scores else 0,
        "top_score": round(max(scores), 1) if scores else 0,
        "min_score": round(min(scores), 1) if scores else 0,
    }


def get_user_daily_pairing(supabase, user_id: str, date: Optional[str] = None) -> Optional[Dict]:
    """
    Fetch a user's pairing for a specific date (defaults to today).

    Returns the pairing record with partner profile, or None.
    Does NOT touch conversations or matches.
    """
    if date is None:
        date = datetime.date.today().isoformat()

    try:
        result = supabase.table("daily_pairings") \
            .select("*") \
            .eq("user_id", user_id) \
            .eq("pairing_date", date) \
            .maybe_single() \
            .execute()

        if not result.data:
            return None

        pairing = result.data

        # Mark as seen if not already
        if not pairing.get("seen"):
            supabase.table("daily_pairings") \
                .update({
                    "seen": True,
                    "seen_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                }) \
                .eq("id", pairing["id"]) \
                .execute()
            pairing["seen"] = True

        # Fetch partner profile
        partner_result = supabase.table("profiles") \
            .select("id, first_name, age, gender, location, interests, values, "
                    "bio, height_inches, ethnicity, religion, political_leaning, "
                    "education_level, current_job") \
            .eq("id", pairing["partner_id"]) \
            .maybe_single() \
            .execute()

        if partner_result.data:
            # Fetch partner photos
            photos = supabase.table("user_photos") \
                .select("url, is_main, display_order") \
                .eq("user_id", pairing["partner_id"]) \
                .order("display_order") \
                .execute()
            partner_result.data["photos"] = photos.data or []

        pairing["partner_profile"] = partner_result.data if partner_result.data else {}

        return pairing

    except Exception as e:
        print(f"[DAILY_PAIRING] Error fetching pairing for {user_id}: {e}")
        return None
