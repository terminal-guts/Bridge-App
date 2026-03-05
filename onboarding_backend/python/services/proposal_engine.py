"""
Bridge Proposal Generation Engine

Generates daily proposals by:
1. Fetching all eligible users (profile complete, not paused, recently active)
2. Running basic compatibility filter
3. Scoring compatible pairs
4. Selecting top pairs that haven't been proposed before
5. Creating proposals in the database
"""

from typing import List, Dict, Tuple, Optional, Any
import datetime
import random

from services.scoring import calculate_compatibility, passes_basic_filter

# How many days of inactivity before a user is excluded
INACTIVITY_THRESHOLD_DAYS = 14

# Minimum compatibility score for a proposal
MIN_COMPATIBILITY_SCORE = 25.0

# How many proposals to generate per batch run
MAX_PROPOSALS_PER_RUN = 50


def fetch_eligible_users(supabase) -> List[Dict]:
    """
    Fetch users who are eligible for proposal generation.
    Criteria: profile_completed = true, is_paused = false, active within threshold.
    """
    cutoff = (datetime.datetime.now(datetime.timezone.utc) -
              datetime.timedelta(days=INACTIVITY_THRESHOLD_DAYS)).isoformat()

    try:
        result = supabase.table("user_profiles").select("*") \
            .eq("profile_completed", True) \
            .eq("is_paused", False) \
            .gte("last_active_at", cutoff) \
            .execute()
        return result.data or []
    except Exception as e:
        # Fallback: fetch without last_active_at filter (column may not exist yet)
        print(f"[PROPOSALS] Warning fetching with activity filter: {e}")
        try:
            result = supabase.table("user_profiles").select("*") \
                .eq("profile_completed", True) \
                .eq("is_paused", False) \
                .execute()
            return result.data or []
        except Exception as e2:
            print(f"[PROPOSALS] Error fetching eligible users: {e2}")
            return []


def fetch_user_preferences(supabase, user_ids: List[str]) -> Dict[str, Dict]:
    """Fetch preferences for a list of users, returns dict keyed by user_id."""
    if not user_ids:
        return {}

    try:
        result = supabase.table("user_preferences").select("*") \
            .in_("user_id", user_ids) \
            .execute()
        return {p["user_id"]: p for p in (result.data or [])}
    except Exception as e:
        print(f"[PROPOSALS] Error fetching preferences: {e}")
        return {}


def fetch_existing_proposal_pairs(supabase) -> set:
    """
    Fetch all user pairs that already have an active or past proposal.
    Returns set of frozensets: {frozenset({user_a_id, user_b_id}), ...}
    """
    try:
        result = supabase.table("proposals") \
            .select("user_a_id, user_b_id") \
            .execute()
        pairs = set()
        for row in (result.data or []):
            pairs.add(frozenset({row["user_a_id"], row["user_b_id"]}))
        return pairs
    except Exception as e:
        print(f"[PROPOSALS] Error fetching existing pairs: {e}")
        return set()


def fetch_rejected_pairs(supabase) -> set:
    """
    Fetch pairs from proposals that were rejected or declined.
    These should not be re-proposed.
    """
    try:
        result = supabase.table("proposals") \
            .select("user_a_id, user_b_id") \
            .in_("status", ["rejected", "declined"]) \
            .execute()
        pairs = set()
        for row in (result.data or []):
            pairs.add(frozenset({row["user_a_id"], row["user_b_id"]}))
        return pairs
    except Exception as e:
        print(f"[PROPOSALS] Error fetching rejected pairs: {e}")
        return set()


def fetch_blocked_pairs(supabase) -> set:
    """
    Fetch all blocked user pairs.
    Blocked users must never be matched or proposed to each other.
    """
    try:
        result = supabase.table("blocked_users") \
            .select("user_id, blocked_user_id") \
            .execute()
        pairs = set()
        for row in (result.data or []):
            pairs.add(frozenset({row["user_id"], row["blocked_user_id"]}))
        return pairs
    except Exception as e:
        print(f"[PROPOSALS] Error fetching blocked pairs: {e}")
        return set()


def fetch_friends(supabase) -> Dict[str, set]:
    """
    Fetch all friendships. Returns dict: user_id -> set of friend_ids.
    """
    try:
        result = supabase.table("friends").select("user_id, friend_id").execute()
        friends_map: Dict[str, set] = {}
        for row in (result.data or []):
            uid = row["user_id"]
            fid = row["friend_id"]
            friends_map.setdefault(uid, set()).add(fid)
            friends_map.setdefault(fid, set()).add(uid)
        return friends_map
    except Exception as e:
        print(f"[PROPOSALS] Error fetching friends: {e}")
        return {}


def generate_candidate_pairs(
    users: List[Dict],
    prefs_map: Dict[str, Dict],
    existing_pairs: set,
    rejected_pairs: set,
) -> List[Tuple[Dict, Dict, Dict, Dict]]:
    """
    Generate candidate pairs that pass the basic filter.
    Returns list of (profile_a, prefs_a, profile_b, prefs_b) tuples.
    """
    candidates = []

    for i in range(len(users)):
        for j in range(i + 1, len(users)):
            a = users[i]
            b = users[j]

            pair_key = frozenset({a["user_id"], b["user_id"]})

            # Skip if already proposed or rejected
            if pair_key in existing_pairs or pair_key in rejected_pairs:
                continue

            prefs_a = prefs_map.get(a["user_id"], {})
            prefs_b = prefs_map.get(b["user_id"], {})

            # Quick gender/age filter
            if passes_basic_filter(a, prefs_a, b, prefs_b):
                candidates.append((a, prefs_a, b, prefs_b))

    return candidates


def score_and_rank_pairs(
    candidate_pairs: List[Tuple[Dict, Dict, Dict, Dict]],
    max_results: int = MAX_PROPOSALS_PER_RUN,
) -> List[Dict]:
    """
    Score all candidate pairs and return top-ranked ones.
    """
    scored = []

    for profile_a, prefs_a, profile_b, prefs_b in candidate_pairs:
        result = calculate_compatibility(profile_a, prefs_a, profile_b, prefs_b)

        if result["total_score"] >= MIN_COMPATIBILITY_SCORE:
            scored.append({
                "user_a_id": profile_a["user_id"],
                "user_b_id": profile_b["user_id"],
                "compatibility_score": result["total_score"],
                "category_scores": result["category_scores"],
                "weighted_scores": result["weighted_scores"],
            })

    # Sort by score descending
    scored.sort(key=lambda x: x["compatibility_score"], reverse=True)

    # Return top N
    return scored[:max_results]


def create_proposals_in_db(
    supabase,
    ranked_pairs: List[Dict],
) -> List[Dict]:
    """
    Insert proposals into the database.
    Returns list of created proposal records.
    """
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    created = []

    for pair in ranked_pairs:
        # Enforce user_a_id < user_b_id
        u_a = pair["user_a_id"]
        u_b = pair["user_b_id"]
        if u_a > u_b:
            u_a, u_b = u_b, u_a

        proposal_data = {
            "user_a_id": u_a,
            "user_b_id": u_b,
            "status": "voting",
            "compatibility_score": pair["compatibility_score"],
            "category_scores": pair["category_scores"],
            "pool_yes_votes": 0,
            "pool_no_votes": 0,
            "friend_yes_votes": 0,
            "friend_no_votes": 0,
            "pool_eligible": True,
            "user_a_decision": "pending",
            "user_b_decision": "pending",
            "created_at": now,
            "updated_at": now,
            "voting_started_at": now,
        }

        try:
            result = supabase.table("proposals").insert(proposal_data).execute()
            if result.data:
                created.append(result.data[0])
                print(f"[PROPOSALS] Created proposal: {u_a} <-> {u_b} "
                      f"(score: {pair['compatibility_score']})")
        except Exception as e:
            print(f"[PROPOSALS] Error creating proposal {u_a} <-> {u_b}: {e}")

    return created


def assign_pool_voters(
    supabase,
    proposals: List[Dict],
    all_users: List[Dict],
    friends_map: Dict[str, set],
    voters_per_proposal: int = 6,
) -> int:
    """
    Assign pool voters (non-friends) to each proposal.
    Each proposal gets ~6 pool voters per day.
    Returns total assignments made.
    """
    today = datetime.date.today().isoformat()
    total_assigned = 0

    for proposal in proposals:
        p_id = proposal["id"]
        ua = proposal["user_a_id"]
        ub = proposal["user_b_id"]

        # Get friends of both users (these vote as friends, not pool)
        friends_of_a = friends_map.get(ua, set())
        friends_of_b = friends_map.get(ub, set())
        all_friends = friends_of_a | friends_of_b

        # Eligible pool voters: not user_a, not user_b, not friends of either
        eligible = [
            u for u in all_users
            if u["user_id"] != ua and u["user_id"] != ub and u["user_id"] not in all_friends
        ]

        # Check who already has an assignment for this proposal
        try:
            existing = supabase.table("pool_vote_assignments") \
                .select("voter_id") \
                .eq("proposal_id", p_id) \
                .execute()
            already_assigned = {r["voter_id"] for r in (existing.data or [])}
        except Exception:
            already_assigned = set()

        eligible = [u for u in eligible if u["id"] not in already_assigned]

        # Pick random voters
        to_assign = random.sample(eligible, min(len(eligible), voters_per_proposal))

        assignments = []
        for voter in to_assign:
            assignments.append({
                "proposal_id": p_id,
                "voter_id": voter["user_id"],
                "assignment_date": today,
                "has_voted": False,
            })

        if assignments:
            try:
                supabase.table("pool_vote_assignments").insert(assignments).execute()
                total_assigned += len(assignments)
            except Exception as e:
                print(f"[PROPOSALS] Error assigning pool voters for {p_id}: {e}")

    return total_assigned


def run_proposal_generation(supabase, max_proposals: int = MAX_PROPOSALS_PER_RUN) -> Dict[str, Any]:
    """
    Main entry point: run a full proposal generation cycle.

    Steps:
    1. Fetch eligible users
    2. Fetch preferences
    3. Fetch existing/rejected pairs
    4. Generate candidate pairs (basic filter)
    5. Score and rank
    6. Create proposals in DB
    7. Assign initial pool voters

    Returns summary dict.
    """
    print("[PROPOSALS] Starting proposal generation...")

    # 1. Eligible users
    users = fetch_eligible_users(supabase)
    print(f"[PROPOSALS] Found {len(users)} eligible users")

    if len(users) < 2:
        return {
            "status": "insufficient_users",
            "eligible_users": len(users),
            "proposals_created": 0,
        }

    # 2. Preferences
    user_ids = [u["user_id"] for u in users]
    prefs_map = fetch_user_preferences(supabase, user_ids)
    print(f"[PROPOSALS] Loaded preferences for {len(prefs_map)} users")

    # 3. Existing + rejected + blocked pairs
    existing_pairs = fetch_existing_proposal_pairs(supabase)
    rejected_pairs = fetch_rejected_pairs(supabase)
    blocked_pairs = fetch_blocked_pairs(supabase)
    excluded_pairs = existing_pairs | rejected_pairs | blocked_pairs
    print(f"[PROPOSALS] Excluding {len(excluded_pairs)} existing/rejected/blocked pairs")

    # 4. Generate candidates
    candidates = generate_candidate_pairs(users, prefs_map, existing_pairs, rejected_pairs)
    print(f"[PROPOSALS] {len(candidates)} candidate pairs pass basic filter")

    if not candidates:
        return {
            "status": "no_candidates",
            "eligible_users": len(users),
            "proposals_created": 0,
        }

    # 5. Score and rank
    ranked = score_and_rank_pairs(candidates, max_results=max_proposals)
    print(f"[PROPOSALS] {len(ranked)} pairs above minimum score threshold")

    if not ranked:
        return {
            "status": "no_viable_matches",
            "eligible_users": len(users),
            "candidates_filtered": len(candidates),
            "proposals_created": 0,
        }

    # 6. Create proposals
    created = create_proposals_in_db(supabase, ranked)
    print(f"[PROPOSALS] Created {len(created)} proposals")

    # 7. Assign pool voters
    friends_map = fetch_friends(supabase)
    assigned = assign_pool_voters(supabase, created, users, friends_map)
    print(f"[PROPOSALS] Assigned {assigned} pool voters")

    return {
        "status": "success",
        "eligible_users": len(users),
        "candidates_filtered": len(candidates),
        "proposals_created": len(created),
        "pool_voters_assigned": assigned,
        "top_score": ranked[0]["compatibility_score"] if ranked else 0,
        "avg_score": sum(r["compatibility_score"] for r in ranked) / len(ranked) if ranked else 0,
    }


def assign_daily_pool_voters(supabase, voters_per_proposal: int = 6) -> Dict[str, Any]:
    """
    Daily job: assign new pool voters to active proposals that are pool-eligible.
    Each proposal gets ~6 new pool voters per day, up to max 42 total over 7 days.
    """
    MAX_POOL_VOTES = 42

    try:
        # Fetch active voting proposals that are pool-eligible
        result = supabase.table("proposals") \
            .select("*") \
            .eq("status", "voting") \
            .eq("pool_eligible", True) \
            .execute()
        proposals = result.data or []
    except Exception as e:
        print(f"[PROPOSALS] Error fetching active proposals: {e}")
        return {"status": "error", "message": str(e)}

    if not proposals:
        return {"status": "no_active_proposals", "assigned": 0}

    # Fetch all users and friends
    users = fetch_eligible_users(supabase)
    friends_map = fetch_friends(supabase)

    # Filter proposals that haven't hit max pool votes
    eligible_proposals = []
    for p in proposals:
        total_pool = (p.get("pool_yes_votes", 0) or 0) + (p.get("pool_no_votes", 0) or 0)
        if total_pool < MAX_POOL_VOTES:
            eligible_proposals.append(p)

    assigned = assign_pool_voters(
        supabase, eligible_proposals, users, friends_map, voters_per_proposal
    )

    return {
        "status": "success",
        "active_proposals": len(proposals),
        "eligible_proposals": len(eligible_proposals),
        "total_assigned": assigned,
    }
