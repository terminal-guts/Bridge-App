"""
Bridge Daily Pairing Engine

Generates exactly ONE pairing per eligible user per day using the
13-category scoring grid (including deep questions).
"""

from typing import List, Dict, Tuple, Optional, Any, Set
import datetime
import random

from services.scoring import (
    calculate_compatibility, passes_basic_filter,
    compute_answer_embedding, compute_per_question_embeddings,
)

SOFT_MIN_SCORE = 20.0
RECENT_PAIRING_LOOKBACK_DAYS = 7
UNIVERSAL_PROPOSAL_RELEASE_HOUR = 0


def _fetch_eligible_users(supabase) -> List[Dict]:
    try:
        result = supabase.table("user_profiles").select("*") \
            .eq("is_paused", False) \
            .not_.is_("age", "null") \
            .execute()
        users = result.data or []
        return [u for u in users if u.get("age") and u.get("gender")]
    except Exception as e:
        print(f"[DAILY_PAIRING] Error fetching users: {e}")
        return []


def _fetch_preferences(supabase, user_ids: List[str]) -> Dict[str, Dict]:
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


def _fetch_deep_questions(supabase, user_ids: List[str]) -> Dict[str, List[Dict]]:
    if not user_ids:
        return {}
    try:
        result = supabase.table("deep_question_answers").select("*") \
            .in_("user_id", user_ids) \
            .execute()

        dq_map: Dict[str, List[Dict]] = {}
        for row in (result.data or []):
            uid = row["user_id"]
            answers_jsonb = row.get("answers", {})
            if isinstance(answers_jsonb, dict) and answers_jsonb:
                converted = []
                for q_id, answer_text in answers_jsonb.items():
                    converted.append({
                        "question_id": int(q_id) if str(q_id).isdigit() else q_id,
                        "answer_text": answer_text if isinstance(answer_text, str) else str(answer_text),
                    })
                dq_map[uid] = converted

        return dq_map
    except Exception as e:
        print(f"[DAILY_PAIRING] Error fetching deep questions: {e}")
        return {}


def _fetch_recent_pairings(supabase, lookback_days: int = RECENT_PAIRING_LOOKBACK_DAYS) -> Set[frozenset]:
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
    try:
        result = supabase.table("matches") \
            .select("user_id_1, user_id_2") \
            .eq("status", "active") \
            .execute()
        pairs = set()
        for row in (result.data or []):
            pairs.add(frozenset({row["user_id_1"], row["user_id_2"]}))
        return pairs
    except Exception as e:
        print(f"[DAILY_PAIRING] Error fetching active matches: {e}")
        return set()


def _fetch_existing_today_pairings(supabase, today: str) -> Set[str]:
    try:
        result = supabase.table("daily_pairings") \
            .select("user_id") \
            .eq("pairing_date", today) \
            .execute()
        return {row["user_id"] for row in (result.data or [])}
    except Exception as e:
        print(f"[DAILY_PAIRING] Error checking existing pairings: {e}")
        return set()


def _compute_embeddings(dq_map: Dict[str, List[Dict]]) -> tuple:
    """Pre-compute all embeddings once before scoring pairs."""
    embedding_map: Dict[str, List[float]] = {}
    per_question_map: Dict[str, Dict] = {}

    if not dq_map:
        return embedding_map, per_question_map

    print(f"[DAILY_PAIRING] Computing embeddings for {len(dq_map)} users...")
    for uid, answers in dq_map.items():
        emb = compute_answer_embedding(answers)
        if emb is not None:
            embedding_map[uid] = emb
        per_q = compute_per_question_embeddings(answers)
        if per_q:
            per_question_map[uid] = per_q

    print(f"[DAILY_PAIRING] Computed {len(embedding_map)} combined + "
          f"{len(per_question_map)} per-question embeddings")
    return embedding_map, per_question_map


def _score_pair(
    profile_a: Dict, prefs_a: Dict,
    profile_b: Dict, prefs_b: Dict,
    deep_questions_a: Optional[List[Dict]] = None,
    deep_questions_b: Optional[List[Dict]] = None,
    embedding_a: Optional[List[float]] = None,
    embedding_b: Optional[List[float]] = None,
    per_question_a: Optional[Dict] = None,
    per_question_b: Optional[Dict] = None,
) -> Optional[Dict]:
    if not passes_basic_filter(profile_a, prefs_a, profile_b, prefs_b):
        return None

    result = calculate_compatibility(
        profile_a, prefs_a, profile_b, prefs_b,
        deep_questions_a=deep_questions_a,
        deep_questions_b=deep_questions_b,
        embedding_a=embedding_a,
        embedding_b=embedding_b,
        per_question_a=per_question_a,
        per_question_b=per_question_b,
    )
    return result


def _build_scored_edges(
    users: List[Dict],
    prefs_map: Dict[str, Dict],
    active_match_pairs: Set[frozenset],
    recent_pairs: Set[frozenset],
    dq_map: Dict[str, List[Dict]] = None,
    embedding_map: Dict[str, List[float]] = None,
    per_question_map: Dict[str, Dict] = None,
) -> List[Tuple[str, str, float, Dict]]:
    edges = []
    n = len(users)
    if dq_map is None:
        dq_map = {}
    if embedding_map is None:
        embedding_map = {}
    if per_question_map is None:
        per_question_map = {}

    print(f"[DAILY_PAIRING] Scoring {n * (n - 1) // 2} possible pairs...")

    for i in range(n):
        for j in range(i + 1, n):
            a = users[i]
            b = users[j]
            a_uid = a["user_id"]
            b_uid = b["user_id"]
            pair_key = frozenset({a_uid, b_uid})

            if pair_key in active_match_pairs:
                continue

            prefs_a = prefs_map.get(a_uid, {})
            prefs_b = prefs_map.get(b_uid, {})

            result = _score_pair(
                a, prefs_a, b, prefs_b,
                deep_questions_a=dq_map.get(a_uid, []),
                deep_questions_b=dq_map.get(b_uid, []),
                embedding_a=embedding_map.get(a_uid),
                embedding_b=embedding_map.get(b_uid),
                per_question_a=per_question_map.get(a_uid),
                per_question_b=per_question_map.get(b_uid),
            )
            if result is None:
                continue

            score = result["total_score"]

            if pair_key in recent_pairs:
                score -= 15.0

            if score > 0:
                edges.append((a_uid, b_uid, score, result))

    edges.sort(key=lambda e: e[2], reverse=True)

    print(f"[DAILY_PAIRING] {len(edges)} scored edges (after filters)")
    return edges


def _greedy_maximum_matching(
    edges: List[Tuple[str, str, float, Dict]],
    user_ids: Set[str],
) -> List[Tuple[str, str, Dict]]:
    matched = set()
    pairings = []

    for a_id, b_id, score, result in edges:
        if a_id in matched or b_id in matched:
            continue

        pairings.append((a_id, b_id, result))
        matched.add(a_id)
        matched.add(b_id)

        if matched >= user_ids:
            break

    return pairings


def _calculate_expires_at() -> str:
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
            if "unique_user_daily_pairing" in str(e).lower() or "duplicate" in str(e).lower():
                print(f"[DAILY_PAIRING] Pair {a_id} <> {b_id} already exists for {today}, skipping")
            else:
                print(f"[DAILY_PAIRING] Error inserting pair {a_id} <> {b_id}: {e}")

    return inserted


def run_daily_pairing(supabase) -> Dict[str, Any]:
    today = datetime.date.today().isoformat()
    print(f"[DAILY_PAIRING] === Starting daily pairing for {today} ===")

    users = _fetch_eligible_users(supabase)
    print(f"[DAILY_PAIRING] {len(users)} eligible users")

    if len(users) < 2:
        return {
            "status": "insufficient_users",
            "date": today,
            "eligible_users": len(users),
            "pairings_created": 0,
        }

    already_paired = _fetch_existing_today_pairings(supabase, today)
    users = [u for u in users if u["user_id"] not in already_paired]
    print(f"[DAILY_PAIRING] {len(users)} users need pairing ({len(already_paired)} already paired)")

    if len(users) < 2:
        return {
            "status": "all_paired",
            "date": today,
            "eligible_users": len(users) + len(already_paired),
            "already_paired": len(already_paired),
            "pairings_created": 0,
        }

    user_ids = [u["user_id"] for u in users]
    prefs_map = _fetch_preferences(supabase, user_ids)
    dq_map = _fetch_deep_questions(supabase, user_ids)
    recent_pairs = _fetch_recent_pairings(supabase)
    active_match_pairs = _fetch_active_match_pairs(supabase)
    print(f"[DAILY_PAIRING] Context: {len(prefs_map)} prefs, "
          f"{len(dq_map)} users with deep questions, "
          f"{len(recent_pairs)} recent pairs, "
          f"{len(active_match_pairs)} active matches")

    # Pre-compute semantic embeddings for deep question answers
    embedding_map, per_question_map = _compute_embeddings(dq_map)

    edges = _build_scored_edges(
        users, prefs_map, active_match_pairs, recent_pairs,
        dq_map, embedding_map, per_question_map,
    )

    if not edges:
        return {
            "status": "no_compatible_pairs",
            "date": today,
            "eligible_users": len(users),
            "pairings_created": 0,
        }

    user_id_set = set(user_ids)
    pairings = _greedy_maximum_matching(edges, user_id_set)
    print(f"[DAILY_PAIRING] Matched {len(pairings)} pairs "
          f"({len(pairings) * 2}/{len(users)} users)")

    inserted = _insert_pairings(supabase, pairings, today)
    print(f"[DAILY_PAIRING] Inserted {inserted} pairing rows")

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

        if not pairing.get("seen"):
            supabase.table("daily_pairings") \
                .update({
                    "seen": True,
                    "seen_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                }) \
                .eq("id", pairing["id"]) \
                .execute()
            pairing["seen"] = True

        partner_result = supabase.table("user_profiles") \
            .select("user_id, first_name, age, gender, location, interests, values, "
                    "bio, height_inches, ethnicity, religion, political_leaning, "
                    "education_level, current_job") \
            .eq("user_id", pairing["partner_id"]) \
            .maybe_single() \
            .execute()

        partner = partner_result.data if partner_result.data else {}

        if partner:
            photos = supabase.table("user_photos") \
                .select("storage_path, is_main, display_order") \
                .eq("user_id", pairing["partner_id"]) \
                .order("display_order") \
                .execute()
            partner["photos"] = [
                {"url": p["storage_path"], "is_main": p["is_main"], "display_order": p["display_order"]}
                for p in (photos.data or [])
            ]
            partner["id"] = partner.get("user_id")

        pairing["partner_profile"] = partner

        return pairing

    except Exception as e:
        print(f"[DAILY_PAIRING] Error fetching pairing for {user_id}: {e}")
        return None
