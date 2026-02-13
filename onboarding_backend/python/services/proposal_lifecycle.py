"""
Bridge Proposal Lifecycle State Machine

Implements the exact rules from the Bridge Matching v1 internal spec:

Confirmation:
  - At least 6 pool votes
  - At least 12 total votes (pool + friends)
  - At least 8 YES votes (pool + friends)
  - Weighted YES percentage >= threshold (with relaxation over days)

Threshold Relaxation:
  - Days 1-2: 65%
  - Days 3-4: 60%
  - Days 5-6: 55%
  - Day 7: bypass and auto-send

Rejection:
  - Immediate cancel: first 6 pool votes are all NO
  - Pool floor: pool votes >= 12 and pool YES rate < 35%
  - Combined floor: total >= 12 and total YES% < 35%

Continuation (pool eligibility):
  - Pool YES rate >= 35%, OR
  - Friend YES rate >= 70% with at least 6 friend votes

Expiry:
  - Hard cutoff at 7 days
  - Auto-send to both users
"""

from typing import Dict, List, Optional, Any, Tuple
import datetime

# Friend vote weight multiplier for percentage calculations
FRIEND_VOTE_WEIGHT = 1.25

# Thresholds by day
THRESHOLD_SCHEDULE = {
    1: 0.65, 2: 0.65,
    3: 0.60, 4: 0.60,
    5: 0.55, 6: 0.55,
    7: None,  # Bypass — auto-send
}

MAX_PROPOSAL_DAYS = 7
DECISION_DEADLINE_HOURS = 48


def _get_proposal_day(proposal: Dict) -> int:
    """Get how many days old a proposal is (1-based)."""
    created = proposal.get("voting_started_at") or proposal.get("created_at")
    if not created:
        return 1

    if isinstance(created, str):
        created = datetime.datetime.fromisoformat(created.replace("Z", "+00:00"))

    now = datetime.datetime.now(datetime.timezone.utc)
    delta = now - created
    day = delta.days + 1  # Day 1 is the creation day
    return min(day, MAX_PROPOSAL_DAYS + 1)


def _get_current_threshold(proposal: Dict) -> Optional[float]:
    """Get the YES percentage threshold for the current day. None = bypass."""
    day = _get_proposal_day(proposal)
    if day > MAX_PROPOSAL_DAYS:
        return None
    return THRESHOLD_SCHEDULE.get(day, 0.55)


def _calculate_weighted_yes_percentage(
    pool_yes: int, pool_no: int,
    friend_yes: int, friend_no: int
) -> float:
    """
    Calculate weighted YES percentage.
    Friend votes count 1.25x relative to pool votes in percentage calculations.
    """
    weighted_yes = pool_yes + (friend_yes * FRIEND_VOTE_WEIGHT)
    weighted_no = pool_no + (friend_no * FRIEND_VOTE_WEIGHT)
    total_weighted = weighted_yes + weighted_no

    if total_weighted == 0:
        return 0.0

    return weighted_yes / total_weighted


def _pool_yes_rate(pool_yes: int, pool_no: int) -> float:
    """Calculate pool-only YES rate."""
    total = pool_yes + pool_no
    if total == 0:
        return 0.0
    return pool_yes / total


def _friend_yes_rate(friend_yes: int, friend_no: int) -> float:
    """Calculate friend-only YES rate."""
    total = friend_yes + friend_no
    if total == 0:
        return 0.0
    return friend_yes / total


def check_immediate_cancel(votes: List[Dict]) -> bool:
    """
    Immediate cancel: if the first 6 pool votes are all NO.
    """
    pool_votes = [v for v in votes if not v.get("is_friend_vote", False)]
    pool_votes.sort(key=lambda v: v.get("created_at", ""))

    if len(pool_votes) < 6:
        return False

    first_six = pool_votes[:6]
    return all(v.get("vote_type") == "NO" for v in first_six)


def check_pool_floor_cancel(pool_yes: int, pool_no: int, friend_yes: int, friend_no: int) -> bool:
    """
    Pool floor cancel:
    - pool votes >= 12 and pool YES rate < 35% → cancel (friends cannot override)
    - pool + friend >= 12 and combined YES% < 35% → cancel
    """
    total_pool = pool_yes + pool_no
    total_all = total_pool + friend_yes + friend_no

    # Pool-only floor: >= 12 pool votes and < 35% pool YES
    if total_pool >= 12 and _pool_yes_rate(pool_yes, pool_no) < 0.35:
        return True

    # Combined floor: >= 12 total and < 35% combined YES
    if total_all >= 12:
        combined_yes_rate = (pool_yes + friend_yes) / total_all if total_all > 0 else 0
        if combined_yes_rate < 0.35:
            return True

    return False


def check_confirmation(
    proposal: Dict,
    pool_yes: int, pool_no: int,
    friend_yes: int, friend_no: int
) -> bool:
    """
    A proposal is confirmed if ALL conditions hold:
    - At least 6 pool votes
    - At least 12 total votes (pool + friends)
    - At least 8 YES votes (pool + friends)
    - Weighted YES percentage >= current threshold
    """
    total_pool = pool_yes + pool_no
    total_all = total_pool + friend_yes + friend_no
    total_yes = pool_yes + friend_yes

    # Minimum pool votes
    if total_pool < 6:
        return False

    # Minimum total votes
    if total_all < 12:
        return False

    # Minimum YES votes
    if total_yes < 8:
        return False

    # Weighted percentage threshold
    threshold = _get_current_threshold(proposal)
    if threshold is None:
        # Day 7+ bypass — confirmed automatically
        return True

    weighted_pct = _calculate_weighted_yes_percentage(pool_yes, pool_no, friend_yes, friend_no)
    return weighted_pct >= threshold


def check_pool_eligibility(
    pool_yes: int, pool_no: int,
    friend_yes: int, friend_no: int
) -> bool:
    """
    A proposal continues to receive pool voters if:
    - Not confirmed or canceled, AND
    - Pool YES rate >= 35%, OR
    - Friend YES rate >= 70% with at least 6 friend votes
    """
    total_friend = friend_yes + friend_no

    # Pool YES rate >= 35%
    if _pool_yes_rate(pool_yes, pool_no) >= 0.35:
        return True

    # Friend YES rate >= 70% with at least 6 friend votes
    if total_friend >= 6 and _friend_yes_rate(friend_yes, friend_no) >= 0.70:
        return True

    return False


def check_expiry(proposal: Dict) -> bool:
    """Check if proposal has hit the 7-day hard cutoff."""
    day = _get_proposal_day(proposal)
    return day > MAX_PROPOSAL_DAYS


def evaluate_proposal(
    proposal: Dict,
    votes: List[Dict],
) -> Tuple[str, Dict[str, Any]]:
    """
    Main lifecycle evaluation. Given a proposal and its votes, determine the new status.

    Returns:
        (new_status, metadata)
        new_status: 'voting' | 'confirmed' | 'rejected' | 'expired_sent'
        metadata: dict with reason, timestamps, etc.
    """
    pool_yes = proposal.get("pool_yes_votes", 0) or 0
    pool_no = proposal.get("pool_no_votes", 0) or 0
    friend_yes = proposal.get("friend_yes_votes", 0) or 0
    friend_no = proposal.get("friend_no_votes", 0) or 0

    current_status = proposal.get("status", "voting")
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    # Already in a terminal state — no change
    if current_status in ("confirmed", "rejected", "expired_sent", "accepted", "declined"):
        return current_status, {}

    # 1. Check expiry (7-day hard cutoff)
    if check_expiry(proposal):
        deadline = (datetime.datetime.now(datetime.timezone.utc) +
                    datetime.timedelta(hours=DECISION_DEADLINE_HOURS)).isoformat()
        return "expired_sent", {
            "reason": "7_day_expiry",
            "expired_at": now_iso,
            "sent_to_users_at": now_iso,
            "decision_deadline_at": deadline,
        }

    # 2. Check immediate cancel (first 6 pool votes all NO)
    if check_immediate_cancel(votes):
        return "rejected", {
            "reason": "immediate_cancel_6_no",
            "rejected_at": now_iso,
        }

    # 3. Check pool floor cancel
    if check_pool_floor_cancel(pool_yes, pool_no, friend_yes, friend_no):
        return "rejected", {
            "reason": "pool_floor_cancel",
            "rejected_at": now_iso,
        }

    # 4. Check confirmation
    if check_confirmation(proposal, pool_yes, pool_no, friend_yes, friend_no):
        deadline = (datetime.datetime.now(datetime.timezone.utc) +
                    datetime.timedelta(hours=DECISION_DEADLINE_HOURS)).isoformat()
        return "confirmed", {
            "reason": "community_confirmed",
            "confirmed_at": now_iso,
            "sent_to_users_at": now_iso,
            "decision_deadline_at": deadline,
        }

    # 5. Check pool eligibility (may stop pool exposure)
    pool_eligible = check_pool_eligibility(pool_yes, pool_no, friend_yes, friend_no)

    return "voting", {
        "pool_eligible": pool_eligible,
    }


def process_user_decision(
    supabase,
    proposal_id: str,
    user_id: str,
    decision: str,  # 'accepted' or 'declined'
) -> Dict[str, Any]:
    """
    Process a user's accept/decline decision on a confirmed or expired_sent proposal.
    """
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    try:
        result = supabase.table("proposals") \
            .select("*") \
            .eq("id", proposal_id) \
            .single() \
            .execute()
        proposal = result.data
    except Exception as e:
        return {"status": "error", "message": f"Proposal not found: {e}"}

    if not proposal:
        return {"status": "error", "message": "Proposal not found"}

    # Must be in confirmed or expired_sent status
    if proposal["status"] not in ("confirmed", "expired_sent"):
        return {"status": "error", "message": f"Proposal is in {proposal['status']} status, cannot decide"}

    # Check deadline
    deadline = proposal.get("decision_deadline_at")
    if deadline:
        if isinstance(deadline, str):
            deadline_dt = datetime.datetime.fromisoformat(deadline.replace("Z", "+00:00"))
        else:
            deadline_dt = deadline
        if datetime.datetime.now(datetime.timezone.utc) > deadline_dt:
            # Expired decision window → auto-decline
            supabase.table("proposals").update({
                "status": "declined",
                "updated_at": now_iso,
            }).eq("id", proposal_id).execute()
            return {"status": "expired", "message": "Decision deadline passed"}

    # Determine which user
    is_user_a = (user_id == proposal["user_a_id"])
    is_user_b = (user_id == proposal["user_b_id"])

    if not is_user_a and not is_user_b:
        return {"status": "error", "message": "User is not part of this proposal"}

    # Update the decision
    update_data = {"updated_at": now_iso}
    if is_user_a:
        update_data["user_a_decision"] = decision
        update_data["user_a_decided_at"] = now_iso
    else:
        update_data["user_b_decision"] = decision
        update_data["user_b_decided_at"] = now_iso

    # Check if both have decided
    other_decision = proposal["user_b_decision"] if is_user_a else proposal["user_a_decision"]

    if decision == "declined":
        # One decline = proposal declined
        update_data["status"] = "declined"
    elif other_decision == "accepted":
        # Both accepted → match!
        update_data["status"] = "accepted"
    elif other_decision == "declined":
        # Other already declined
        update_data["status"] = "declined"
    # else other is still pending — stay in current status

    supabase.table("proposals").update(update_data).eq("id", proposal_id).execute()

    new_status = update_data.get("status", proposal["status"])

    # If accepted, create a match
    if new_status == "accepted":
        _create_match_from_proposal(supabase, proposal)

    return {
        "status": "success",
        "proposal_status": new_status,
        "your_decision": decision,
    }


def _create_match_from_proposal(supabase, proposal: Dict):
    """Create a match record when both users accept a proposal."""
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    u1 = min(proposal["user_a_id"], proposal["user_b_id"])
    u2 = max(proposal["user_a_id"], proposal["user_b_id"])

    match_data = {
        "user1_id": u1,
        "user2_id": u2,
        "status": "active",
        "created_at": now_iso,
        "updated_at": now_iso,
    }

    try:
        supabase.table("matches").upsert(
            match_data, on_conflict="user1_id, user2_id"
        ).execute()
        print(f"[MATCH] Created match from proposal: {u1} <-> {u2}")
    except Exception as e:
        print(f"[MATCH] Error creating match: {e}")


def run_lifecycle_checks(supabase) -> Dict[str, Any]:
    """
    Run lifecycle checks on all active voting proposals.
    Called periodically (e.g., every hour or after each vote).
    """
    try:
        result = supabase.table("proposals") \
            .select("*") \
            .eq("status", "voting") \
            .execute()
        proposals = result.data or []
    except Exception as e:
        return {"status": "error", "message": str(e)}

    confirmed_count = 0
    rejected_count = 0
    expired_count = 0
    pool_stopped_count = 0
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    for proposal in proposals:
        # Fetch votes for this proposal
        try:
            votes_result = supabase.table("proposal_votes") \
                .select("*") \
                .eq("proposal_id", proposal["id"]) \
                .execute()
            votes = votes_result.data or []
        except Exception:
            votes = []

        new_status, metadata = evaluate_proposal(proposal, votes)

        if new_status != "voting":
            # Status changed — update in DB
            update_data = {
                "status": new_status,
                "updated_at": now_iso,
                **{k: v for k, v in metadata.items() if k != "reason" and k != "pool_eligible"},
            }
            try:
                supabase.table("proposals") \
                    .update(update_data) \
                    .eq("id", proposal["id"]) \
                    .execute()
            except Exception as e:
                print(f"[LIFECYCLE] Error updating proposal {proposal['id']}: {e}")

            if new_status == "confirmed":
                confirmed_count += 1
            elif new_status == "rejected":
                rejected_count += 1
            elif new_status == "expired_sent":
                expired_count += 1
        else:
            # Check pool eligibility change
            new_pool_eligible = metadata.get("pool_eligible", True)
            if new_pool_eligible != proposal.get("pool_eligible", True):
                try:
                    supabase.table("proposals") \
                        .update({"pool_eligible": new_pool_eligible, "updated_at": now_iso}) \
                        .eq("id", proposal["id"]) \
                        .execute()
                    if not new_pool_eligible:
                        pool_stopped_count += 1
                except Exception as e:
                    print(f"[LIFECYCLE] Error updating pool eligibility: {e}")

    # Also check confirmed/expired_sent proposals for decision deadlines
    _check_decision_deadlines(supabase)

    return {
        "status": "success",
        "proposals_checked": len(proposals),
        "confirmed": confirmed_count,
        "rejected": rejected_count,
        "expired_sent": expired_count,
        "pool_stopped": pool_stopped_count,
    }


def _check_decision_deadlines(supabase):
    """Check for proposals past their decision deadline and auto-decline."""
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    try:
        result = supabase.table("proposals") \
            .select("*") \
            .in_("status", ["confirmed", "expired_sent"]) \
            .lt("decision_deadline_at", now_iso) \
            .execute()

        for proposal in (result.data or []):
            # If either user hasn't decided → auto-decline
            if proposal.get("user_a_decision") == "pending" or proposal.get("user_b_decision") == "pending":
                supabase.table("proposals").update({
                    "status": "declined",
                    "updated_at": now_iso,
                }).eq("id", proposal["id"]).execute()
                print(f"[LIFECYCLE] Auto-declined proposal {proposal['id']} (deadline passed)")
    except Exception as e:
        print(f"[LIFECYCLE] Error checking deadlines: {e}")
