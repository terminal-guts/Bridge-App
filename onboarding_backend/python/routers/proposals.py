"""
Bridge Proposals Router

Endpoints for proposal generation, voting (pool + friend), lifecycle management,
and user accept/decline decisions.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from enum import Enum
import datetime

try:
    from utils.supabase_client import get_supabase_client
except ImportError:
    from ..utils.supabase_client import get_supabase_client

from services.proposal_engine import (
    run_proposal_generation,
    assign_daily_pool_voters,
)
from services.proposal_lifecycle import (
    evaluate_proposal,
    process_user_decision,
    run_lifecycle_checks,
    FRIEND_VOTE_WEIGHT,
)
from services.daily_pairing_engine import (
    run_daily_pairing,
    get_user_daily_pairing,
)

router = APIRouter(prefix="/proposals", tags=["Proposals"])
supabase = get_supabase_client()


# ============================================================================
# Models
# ============================================================================

class ProposalVoteType(str, Enum):
    YES = "YES"
    NO = "NO"
    UNSURE = "UNSURE"
    RECOMMEND = "RECOMMEND"


class CastVoteRequest(BaseModel):
    proposal_id: str
    voter_id: str
    vote_type: ProposalVoteType
    recommend_to_id: Optional[str] = None  # For RECOMMEND votes


class UserDecisionRequest(BaseModel):
    user_id: str
    decision: str  # 'accepted' or 'declined'


class GenerateProposalsRequest(BaseModel):
    max_proposals: int = 50


# ============================================================================
# Proposal Generation Endpoints
# ============================================================================

@router.post("/generate")
async def generate_proposals(request: GenerateProposalsRequest):
    """
    Generate new proposals from the user pool.
    Typically called by a cron job or admin trigger.
    """
    try:
        result = run_proposal_generation(supabase, max_proposals=request.max_proposals)
        return result
    except Exception as e:
        print(f"[PROPOSALS] Generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/assign-daily-voters")
async def assign_daily_voters():
    """
    Assign new pool voters to active proposals.
    Called daily to give each proposal ~6 new pool voters.
    """
    try:
        result = assign_daily_pool_voters(supabase)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Voting Endpoints
# ============================================================================

@router.get("/for-voting")
async def get_proposals_for_voting(user_id: str):
    """
    Get proposals assigned to a user for pool voting today.
    Also includes proposals where the user is a friend of either party.
    """
    today = datetime.date.today().isoformat()

    try:
        # 1. Pool assignments for today
        pool_result = supabase.table("pool_vote_assignments") \
            .select("proposal_id") \
            .eq("voter_id", user_id) \
            .eq("assignment_date", today) \
            .eq("has_voted", False) \
            .execute()

        pool_proposal_ids = [r["proposal_id"] for r in (pool_result.data or [])]

        # 2. Friend voting: find proposals where user is friend of user_a or user_b
        friends_result = supabase.table("friends") \
            .select("friend_id") \
            .eq("user_id", user_id) \
            .execute()
        friend_ids = {r["friend_id"] for r in (friends_result.data or [])}

        # Also check reverse direction
        friends_result2 = supabase.table("friends") \
            .select("user_id") \
            .eq("friend_id", user_id) \
            .execute()
        friend_ids |= {r["user_id"] for r in (friends_result2.data or [])}

        friend_proposal_ids = []
        if friend_ids:
            # Find voting proposals involving friends
            for fid in friend_ids:
                # Proposals where friend is user_a
                res_a = supabase.table("proposals") \
                    .select("id") \
                    .eq("user_a_id", fid) \
                    .eq("status", "voting") \
                    .execute()
                friend_proposal_ids.extend([r["id"] for r in (res_a.data or [])])

                # Proposals where friend is user_b
                res_b = supabase.table("proposals") \
                    .select("id") \
                    .eq("user_b_id", fid) \
                    .eq("status", "voting") \
                    .execute()
                friend_proposal_ids.extend([r["id"] for r in (res_b.data or [])])

        # Deduplicate and exclude proposals user is part of
        all_proposal_ids = list(set(pool_proposal_ids + friend_proposal_ids))

        if not all_proposal_ids:
            return {"proposals": [], "pool_count": 0, "friend_count": 0}

        # 3. Fetch full proposal data
        proposals_result = supabase.table("proposals") \
            .select("*") \
            .in_("id", all_proposal_ids) \
            .eq("status", "voting") \
            .execute()
        proposals = proposals_result.data or []

        # Filter out proposals the user is part of
        proposals = [
            p for p in proposals
            if p["user_a_id"] != user_id and p["user_b_id"] != user_id
        ]

        # 4. Check which ones user already voted on
        if proposals:
            voted_result = supabase.table("proposal_votes") \
                .select("proposal_id") \
                .eq("voter_id", user_id) \
                .in_("proposal_id", [p["id"] for p in proposals]) \
                .execute()
            voted_ids = {r["proposal_id"] for r in (voted_result.data or [])}
            proposals = [p for p in proposals if p["id"] not in voted_ids]

        # 5. Enrich with profile data for user_a and user_b
        enriched = []
        for p in proposals:
            is_friend = p["id"] in friend_proposal_ids
            is_pool = p["id"] in pool_proposal_ids

            # Fetch profiles (blurred for pool, clear for friends)
            profile_a = _fetch_proposal_profile(p["user_a_id"], blur=not is_friend)
            profile_b = _fetch_proposal_profile(p["user_b_id"], blur=not is_friend)

            enriched.append({
                **p,
                "user_a_profile": profile_a,
                "user_b_profile": profile_b,
                "vote_context": "friend" if is_friend else "pool",
                "is_friend_vote": is_friend,
            })

        pool_count = len([p for p in enriched if p["vote_context"] == "pool"])
        friend_count = len([p for p in enriched if p["vote_context"] == "friend"])

        return {
            "proposals": enriched,
            "pool_count": pool_count,
            "friend_count": friend_count,
        }

    except Exception as e:
        print(f"[PROPOSALS] Error fetching proposals for voting: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def _fetch_proposal_profile(user_id: str, blur: bool = False) -> Dict:
    """Fetch a user profile for proposal display. If blur=True, limit fields."""
    try:
        result = supabase.table("profiles") \
            .select("id, first_name, age, gender, location, interests, values, bio, height_inches, ethnicity, religion, political_leaning, education_level, school, current_job, company_position") \
            .eq("id", user_id) \
            .single() \
            .execute()
        profile = result.data or {}

        # Get photos
        photos_result = supabase.table("user_photos") \
            .select("url, is_main, display_order") \
            .eq("user_id", user_id) \
            .order("display_order") \
            .execute()
        profile["photos"] = photos_result.data or []

        if blur:
            # For pool voters: limited info, blurred photos
            profile["blurred"] = True
            # Remove last name, exact location, etc.
            profile.pop("current_job", None)
            profile.pop("company_position", None)
            profile.pop("school", None)

        return profile
    except Exception as e:
        print(f"[PROPOSALS] Error fetching profile {user_id}: {e}")
        return {"id": user_id, "error": "profile_fetch_failed"}


@router.post("/vote")
async def cast_proposal_vote(vote: CastVoteRequest):
    """
    Cast a vote on a proposal (pool or friend vote).
    Automatically determines if voter is a friend of either party.
    Triggers lifecycle check after vote.
    """
    try:
        # 1. Verify proposal exists and is in voting status
        proposal_result = supabase.table("proposals") \
            .select("*") \
            .eq("id", vote.proposal_id) \
            .single() \
            .execute()

        if not proposal_result.data:
            raise HTTPException(status_code=404, detail="Proposal not found")

        proposal = proposal_result.data

        if proposal["status"] != "voting":
            raise HTTPException(status_code=400, detail=f"Proposal is {proposal['status']}, not accepting votes")

        # Can't vote on your own proposal
        if vote.voter_id in (proposal["user_a_id"], proposal["user_b_id"]):
            raise HTTPException(status_code=400, detail="Cannot vote on your own proposal")

        # 2. Determine if friend vote
        is_friend = False
        friend_of = None

        friends_a = _get_friends_of(proposal["user_a_id"])
        friends_b = _get_friends_of(proposal["user_b_id"])

        if vote.voter_id in friends_a and vote.voter_id in friends_b:
            is_friend = True
            friend_of = "both"
        elif vote.voter_id in friends_a:
            is_friend = True
            friend_of = "user_a"
        elif vote.voter_id in friends_b:
            is_friend = True
            friend_of = "user_b"

        # 3. If pool vote, check pool eligibility
        if not is_friend and not proposal.get("pool_eligible", True):
            raise HTTPException(status_code=400, detail="Proposal is no longer accepting pool votes")

        # 4. Insert vote
        vote_data = {
            "proposal_id": vote.proposal_id,
            "voter_id": vote.voter_id,
            "vote_type": vote.vote_type.value,
            "is_friend_vote": is_friend,
            "friend_of": friend_of,
            "recommend_to_id": vote.recommend_to_id,
        }

        supabase.table("proposal_votes").upsert(
            vote_data, on_conflict="proposal_id, voter_id"
        ).execute()

        # 5. Update vote tallies on proposal
        _update_vote_tallies(proposal, vote.vote_type.value, is_friend)

        # 6. Mark pool assignment as voted
        if not is_friend:
            try:
                supabase.table("pool_vote_assignments") \
                    .update({"has_voted": True}) \
                    .eq("proposal_id", vote.proposal_id) \
                    .eq("voter_id", vote.voter_id) \
                    .execute()
            except Exception:
                pass  # Assignment might not exist for friend voters

        # 7. Re-fetch proposal and run lifecycle check
        updated_proposal = supabase.table("proposals") \
            .select("*") \
            .eq("id", vote.proposal_id) \
            .single() \
            .execute()

        if updated_proposal.data:
            all_votes = supabase.table("proposal_votes") \
                .select("*") \
                .eq("proposal_id", vote.proposal_id) \
                .execute()

            new_status, metadata = evaluate_proposal(
                updated_proposal.data,
                all_votes.data or []
            )

            now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

            if new_status != "voting":
                update_data = {
                    "status": new_status,
                    "updated_at": now_iso,
                    **{k: v for k, v in metadata.items()
                       if k not in ("reason", "pool_eligible")},
                }
                supabase.table("proposals") \
                    .update(update_data) \
                    .eq("id", vote.proposal_id) \
                    .execute()
            elif "pool_eligible" in metadata:
                supabase.table("proposals") \
                    .update({"pool_eligible": metadata["pool_eligible"], "updated_at": now_iso}) \
                    .eq("id", vote.proposal_id) \
                    .execute()

            return {
                "status": "success",
                "vote_type": vote.vote_type.value,
                "is_friend_vote": is_friend,
                "proposal_status": new_status,
            }

        return {
            "status": "success",
            "vote_type": vote.vote_type.value,
            "is_friend_vote": is_friend,
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[PROPOSALS] Error casting vote: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def _get_friends_of(user_id: str) -> set:
    """Get all friend IDs for a user."""
    try:
        r1 = supabase.table("friends").select("friend_id").eq("user_id", user_id).execute()
        r2 = supabase.table("friends").select("user_id").eq("friend_id", user_id).execute()
        friends = {r["friend_id"] for r in (r1.data or [])}
        friends |= {r["user_id"] for r in (r2.data or [])}
        return friends
    except Exception:
        return set()


def _update_vote_tallies(proposal: Dict, vote_type: str, is_friend: bool):
    """Increment the denormalized vote tallies on the proposal."""
    if vote_type == "UNSURE":
        return  # Unsure is ignored in all calculations

    update = {}
    if vote_type in ("YES", "RECOMMEND"):
        if is_friend:
            update["friend_yes_votes"] = (proposal.get("friend_yes_votes") or 0) + 1
        else:
            update["pool_yes_votes"] = (proposal.get("pool_yes_votes") or 0) + 1
    elif vote_type == "NO":
        if is_friend:
            update["friend_no_votes"] = (proposal.get("friend_no_votes") or 0) + 1
        else:
            update["pool_no_votes"] = (proposal.get("pool_no_votes") or 0) + 1

    if update:
        update["updated_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
        try:
            supabase.table("proposals") \
                .update(update) \
                .eq("id", proposal["id"]) \
                .execute()
        except Exception as e:
            print(f"[PROPOSALS] Error updating tallies: {e}")


# ============================================================================
# User Decision Endpoints
# ============================================================================

@router.post("/{proposal_id}/decide")
async def decide_on_proposal(proposal_id: str, request: UserDecisionRequest):
    """
    User accepts or declines a confirmed/expired proposal.
    """
    if request.decision not in ("accepted", "declined"):
        raise HTTPException(status_code=400, detail="Decision must be 'accepted' or 'declined'")

    result = process_user_decision(supabase, proposal_id, request.user_id, request.decision)

    if result.get("status") == "error":
        raise HTTPException(status_code=400, detail=result["message"])

    return result


@router.get("/pending-decisions")
async def get_pending_decisions(user_id: str):
    """
    Get proposals that are waiting for this user's accept/decline decision.
    """
    try:
        # Proposals where user is user_a and hasn't decided
        res_a = supabase.table("proposals") \
            .select("*") \
            .eq("user_a_id", user_id) \
            .in_("status", ["confirmed", "expired_sent"]) \
            .eq("user_a_decision", "pending") \
            .execute()

        # Proposals where user is user_b and hasn't decided
        res_b = supabase.table("proposals") \
            .select("*") \
            .eq("user_b_id", user_id) \
            .in_("status", ["confirmed", "expired_sent"]) \
            .eq("user_b_decision", "pending") \
            .execute()

        proposals = (res_a.data or []) + (res_b.data or [])

        # Enrich with partner profile
        enriched = []
        for p in proposals:
            partner_id = p["user_b_id"] if p["user_a_id"] == user_id else p["user_a_id"]
            partner_profile = _fetch_proposal_profile(partner_id, blur=False)

            enriched.append({
                **p,
                "partner_profile": partner_profile,
            })

        return {"proposals": enriched}

    except Exception as e:
        print(f"[PROPOSALS] Error fetching pending decisions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Lifecycle Management Endpoints
# ============================================================================

@router.post("/lifecycle-check")
async def trigger_lifecycle_check():
    """
    Run lifecycle checks on all active proposals.
    Confirms, rejects, or expires proposals based on voting rules.
    """
    try:
        result = run_lifecycle_checks(supabase)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Query Endpoints
# ============================================================================

@router.get("/{proposal_id}")
async def get_proposal(proposal_id: str):
    """Get full details for a single proposal."""
    try:
        result = supabase.table("proposals") \
            .select("*") \
            .eq("id", proposal_id) \
            .single() \
            .execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Proposal not found")

        proposal = result.data

        # Enrich with profiles
        proposal["user_a_profile"] = _fetch_proposal_profile(proposal["user_a_id"], blur=False)
        proposal["user_b_profile"] = _fetch_proposal_profile(proposal["user_b_id"], blur=False)

        # Fetch votes
        votes_result = supabase.table("proposal_votes") \
            .select("id, voter_id, vote_type, is_friend_vote, friend_of, created_at") \
            .eq("proposal_id", proposal_id) \
            .execute()
        proposal["votes"] = votes_result.data or []

        return proposal

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/user/{user_id}/history")
async def get_user_proposal_history(user_id: str):
    """Get all proposals involving a user (past and present)."""
    try:
        res_a = supabase.table("proposals") \
            .select("*") \
            .eq("user_a_id", user_id) \
            .order("created_at", desc=True) \
            .execute()

        res_b = supabase.table("proposals") \
            .select("*") \
            .eq("user_b_id", user_id) \
            .order("created_at", desc=True) \
            .execute()

        proposals = (res_a.data or []) + (res_b.data or [])
        proposals.sort(key=lambda p: p.get("created_at", ""), reverse=True)

        return {"proposals": proposals}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Daily Pairing Endpoints (Scoring-Grid Coordinates)
# ============================================================================

@router.post("/generate-daily-pairings")
async def generate_daily_pairings():
    """
    Generate today's daily pairings using the 12-category scoring grid.

    Each eligible user receives exactly ONE pairing per day.
    Pairings are computed via greedy maximum-weight matching over all
    compatible pairs.

    SAFE: Only writes to the `daily_pairings` table.
    Does NOT modify conversations, matches, proposals, or any other state.

    Typically triggered by a cron job at the Universal Proposal Release Hour
    (00:00 UTC).
    """
    try:
        result = run_daily_pairing(supabase)
        return result
    except Exception as e:
        print(f"[DAILY_PAIRING] Generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/daily-pairing")
async def get_daily_pairing(user_id: str, date: Optional[str] = None):
    """
    Get a user's daily pairing for a specific date (defaults to today).

    Returns the partner profile and the full 12-category compatibility
    coordinates (category_scores + weighted_scores).

    SAFE: Read-only query against `daily_pairings` + `profiles`.
    Does NOT touch conversations or matches.
    """
    try:
        pairing = get_user_daily_pairing(supabase, user_id, date)
        if not pairing:
            return {
                "status": "no_pairing",
                "message": "No pairing found for this date. New pairings drop daily at 00:00 UTC.",
                "date": date or datetime.date.today().isoformat(),
            }
        return {
            "status": "success",
            "pairing": pairing,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/daily-pairing/stats")
async def get_daily_pairing_stats(days: int = 7):
    """
    Get daily pairing statistics for the last N days.
    Useful for monitoring pairing quality and engagement.
    """
    try:
        cutoff_date = (datetime.date.today() - datetime.timedelta(days=days)).isoformat()
        result = supabase.table("daily_pairings") \
            .select("pairing_date, compatibility_score, seen, proposal_created") \
            .gte("pairing_date", cutoff_date) \
            .execute()

        rows = result.data or []

        if not rows:
            return {"status": "no_data", "days": days, "stats": []}

        # Aggregate by date
        by_date: Dict[str, Dict] = {}
        for row in rows:
            d = row["pairing_date"]
            if d not in by_date:
                by_date[d] = {
                    "date": d,
                    "total_pairings": 0,
                    "scores": [],
                    "seen_count": 0,
                    "proposal_count": 0,
                }
            by_date[d]["total_pairings"] += 1
            by_date[d]["scores"].append(row["compatibility_score"])
            if row.get("seen"):
                by_date[d]["seen_count"] += 1
            if row.get("proposal_created"):
                by_date[d]["proposal_count"] += 1

        stats = []
        for d, data in sorted(by_date.items(), reverse=True):
            scores = data["scores"]
            stats.append({
                "date": d,
                "total_pairings": data["total_pairings"],
                "avg_score": round(sum(scores) / len(scores), 1),
                "min_score": round(min(scores), 1),
                "max_score": round(max(scores), 1),
                "seen_count": data["seen_count"],
                "seen_rate": round(data["seen_count"] / data["total_pairings"] * 100, 1),
                "proposal_count": data["proposal_count"],
            })

        return {"status": "success", "days": days, "stats": stats}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
