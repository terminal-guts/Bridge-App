from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from enum import Enum
import datetime
import random

# Use the supabase client from parent utils
# We need to import it properly. Since this is in routers/, we go up.
try:
    from utils.supabase_client import get_supabase_client
except ImportError:
    # If running as module
    from ..utils.supabase_client import get_supabase_client

router = APIRouter(prefix="/voting", tags=["Voting"])
supabase = get_supabase_client()

# --- Models ---

class VoteType(str, Enum):
    YES = "YES"
    NO = "NO"
    UNSURE = "UNSURE"
    RECOMMEND = "RECOMMEND"

class VoteRequest(BaseModel):
    voter_id: str
    candidate_id: str
    vote_type: VoteType
    metadata: Optional[Dict[str, Any]] = None # For friend recommendations, etc.

class DailyGridResponse(BaseModel):
    date: str
    candidates: List[Dict[str, Any]]

# --- Endpoints ---

@router.post("/vote")
async def cast_vote(vote: VoteRequest):
    """
    Cast a vote on a candidate.
    Vote types: YES, NO, UNSURE, RECOMMEND.
    """
    try:
        # 1. Check if already voted? (The UNIQUE constraint in DB handles this, but we can check nicely)
        # For now, let's just UPSERT or Insert
        data = {
            "voter_id": vote.voter_id,
            "candidate_id": vote.candidate_id,
            "vote_type": vote.vote_type.value,
            "metadata": vote.metadata or {}
        }
        
        # Use upsert to handle potential re-votes (changing mind)
        response = supabase.table("votes").upsert(data, on_conflict="voter_id, candidate_id").execute()
        
        # --- Match Decision Logic ---
        # Define match pair IDs (sorted for uniqueness)
        u1, u2 = sorted([vote.voter_id, vote.candidate_id])

        # If this vote is positive, check if the other person also voted positively
        if vote.vote_type in [VoteType.YES, VoteType.RECOMMEND]:
            # Check if candidate has already voted for voter
            other_vote_res = supabase.table("votes").select("vote_type")\
                .eq("voter_id", vote.candidate_id)\
                .eq("candidate_id", vote.voter_id)\
                .execute()
                
            if other_vote_res.data:
                other_vote_type = other_vote_res.data[0]["vote_type"]
                # Determine if it's a mutual match
                # Both must be YES or RECOMMEND
                if other_vote_type in ["YES", "RECOMMEND"]:
                    print(f"[MATCH] Mutual match found between {vote.voter_id} and {vote.candidate_id}")
                    
                    match_data = {
                        "user1_id": u1,
                        "user2_id": u2,
                        "status": "candidate", # Pre-chat state
                        "created_at": datetime.datetime.now().isoformat(),
                        "updated_at": datetime.datetime.now().isoformat()
                    }
                    
                    # Store match cleanly
                    # upsert prevents duplicates if they re-match or verify
                    match_res = supabase.table("matches").upsert(
                        match_data, 
                        on_conflict="user1_id, user2_id"
                    ).execute()
                    
                    if match_res.data:
                        print(f"[MATCH] Candidate match stored: {match_res.data[0].get('id')}")
        else:
            # If vote changed to NO/UNSURE, ensure no match exists (cleanup)
            try:
                supabase.table("matches").delete().eq("user1_id", u1).eq("user2_id", u2).execute()
                print(f"[MATCH] Enforced no match for {u1} and {u2}")
            except Exception as match_del_err:
                 print(f"[MATCH] Error cleaning up match or no match existed: {match_del_err}")

        return {"status": "success", "message": f"Vote {vote.vote_type} cast successfully"}
    except Exception as e:
        print(f"[VOTING] Error casting vote: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/daily-grid", response_model=DailyGridResponse)
async def get_daily_grid(user_id: str):
    """
    Get the set of users to vote on for today.
    1. Checks if a grid already exists for today.
    2. If not, generates one by finding unwatched candidates.
    """
    today_str = datetime.date.today().isoformat()
    
    try:
        # 1. Check existing grid
        existing_grid = supabase.table("daily_grids")\
            .select("candidate_id, profiles(*)")\
            .eq("user_id", user_id)\
            .eq("assignment_date", today_str)\
            .execute()
            
        if existing_grid.data:
            # Flatten the response to return profile data
            candidates = []
            for entry in existing_grid.data:
                if entry.get("profiles"):
                    candidates.append(entry["profiles"])
            return {"date": today_str, "candidates": candidates}
            
        # 2. Generate new grid
        # Logic: Find users NOT voted on by me, AND NOT in previous grids?
        # Simpler: Find users NOT voted on.
        
        # Get list of IDs I have voted on
        votes_res = supabase.table("votes").select("candidate_id").eq("voter_id", user_id).execute()
        voted_ids = {v["candidate_id"] for v in votes_res.data}
        voted_ids.add(user_id) # Don't vote on self
        
        # Fetch potential candidates (LIMIT 50, then random pick)
        # Note: In real app, perform filtering in DB. Here we fetch some and filter.
        # This is a naive implementation for small scale.
        all_profiles = supabase.table("user_profiles").select("*").limit(100).execute()
        
        potential = [p for p in all_profiles.data if p["id"] not in voted_ids]
        
        # Pick random 6
        selected = random.sample(potential, min(len(potential), 6))
        
        # Save to daily_grids
        grid_entries = []
        for cand in selected:
            grid_entries.append({
                "user_id": user_id,
                "candidate_id": cand["id"],
                "assignment_date": today_str
            })
            
        if grid_entries:
            supabase.table("daily_grids").insert(grid_entries).execute()
            
        return {"date": today_str, "candidates": selected}

    except Exception as e:
        print(f"[VOTING] Error generating grid: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats")
async def get_voting_stats(user_id: str):
    """
    Get stats for a user (votes received).
    Ignores UNSURE votes.
    """
    try:
        # Fetch all votes where candidate is this user
        res = supabase.table("votes").select("vote_type").eq("candidate_id", user_id).execute()
        
        total = 0
        breakdown = {"YES": 0, "NO": 0, "RECOMMEND": 0}
        
        for v in res.data:
            vt = v["vote_type"]
            if vt == "UNSURE":
                continue # Ignore UNSURE per requirements
            
            if vt in breakdown:
                breakdown[vt] += 1
            total += 1
            
        return {
            "user_id": user_id,
            "total_valid_votes": total,
            "breakdown": breakdown
        }
        
    except Exception as e:
        print(f"[VOTING] Error fetching stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))
