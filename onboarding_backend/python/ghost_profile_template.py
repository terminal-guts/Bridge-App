from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid
import secrets
import string

# ----------------------------------------------------------------------------------
# Ghost Profile Models
# ----------------------------------------------------------------------------------

class GhostProfileCreate(BaseModel):
    """
    Data required to create a ghost profile. 
    This is typically filled out by a friend (the 'creator' or 'matchmaker')
    on behalf of someone who isn't on the platform yet.
    """
    creator_user_id: str = Field(..., description="ID of the user creating this ghost profile")
    
    # Basic info the friend knows
    first_name: str = Field(..., description="Friend's first name")
    phone_number: Optional[str] = Field(None, description="Friend's phone to send invite later")
    email: Optional[EmailStr] = Field(None, description="Friend's email to send invite later")
    
    # Optional details the friend can provide
    age: Optional[int] = None
    gender: Optional[str] = None
    location: Optional[str] = None
    bio_from_friend: Optional[str] = Field(None, description="A quick blurb written by the friend")
    
    # Photos uploaded by the friend (e.g., from their camera roll)
    photos: List[str] = Field(default_factory=list, description="List of S3/Supabase photo URLs")
    
class GhostProfileClaim(BaseModel):
    """
    Data required when the actual user joins and claims their ghost profile.
    """
    claim_token: str = Field(..., description="Unique token sent via SMS/Email")
    new_user_id: str = Field(..., description="The real user ID created upon signup")

class GhostProfileRecord(BaseModel):
    """
    Full representation of a Ghost Profile as stored in the database.
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="Ghost Profile ID")
    creator_user_id: str
    
    first_name: str
    phone_number: Optional[str] = None
    email: Optional[EmailStr] = None
    
    age: Optional[int] = None
    gender: Optional[str] = None
    location: Optional[str] = None
    bio_from_friend: Optional[str] = None
    photos: List[str] = Field(default_factory=list)
    
    # Meta
    claim_token: str = Field(default_factory=lambda: ''.join(secrets.choice(string.ascii_letters + string.digits) for i in range(12)))
    is_claimed: bool = False
    claimed_by_user_id: Optional[str] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime = Field(description="When the ghost profile invite expires (e.g. 7 days)")

# ----------------------------------------------------------------------------------
# Ghost Profile Service Logic (Template)
# ----------------------------------------------------------------------------------

class GhostProfileService:
    def __init__(self, db_client):
        self.db = db_client # E.g., Supabase client
        
    def create_ghost_profile(self, data: GhostProfileCreate) -> GhostProfileRecord:
        """
        1. Friend creates a ghost profile with whatever info they have.
        2. A unique claim_token is generated.
        3. The ghost profile is saved to the DB.
        4. (Optional) Trigger SMS or Email invite to the friend if contact info was provided.
        """
        from datetime import timedelta
        
        # Calculate expiration (e.g., 14 days)
        expires = datetime.utcnow() + timedelta(days=14)
        
        ghost = GhostProfileRecord(
            creator_user_id=data.creator_user_id,
            first_name=data.first_name,
            phone_number=data.phone_number,
            email=data.email,
            age=data.age,
            gender=data.gender,
            location=data.location,
            bio_from_friend=data.bio_from_friend,
            photos=data.photos,
            expires_at=expires
        )
        
        # TODO: Save ghost profile to database
        # self.db.table("ghost_profiles").insert(ghost.dict()).execute()
        
        # TODO: If phone_number provided, trigger SMS invite with the claim_token
        # if ghost.phone_number:
        #    invite_link = f"https://bridge.app/invite/{ghost.claim_token}"
        #    send_sms(ghost.phone_number, f"Your friend made you a profile on Bridge! Claim it here: {invite_link}")
        
        return ghost
        
    def get_ghost_profile_by_token(self, token: str) -> Optional[GhostProfileRecord]:
        """
        1. Retrieve ghost profile data when the user clicks the invite link.
        2. Verify it's not expired and not already claimed.
        """
        # TODO: Query DB by token
        # response = self.db.table("ghost_profiles").select("*").eq("claim_token", token).execute()
        # if response.data:
        #     return GhostProfileRecord(**response.data[0])
        return None

    def claim_ghost_profile(self, data: GhostProfileClaim) -> bool:
        """
        1. Actual user completed onboarding.
        2. Associate the ghost profile data (photos, friend's bio) with their new real profile.
        3. Mark ghost profile as claimed.
        4. (Optional) Reward the creator friend with Karma points!
        """
        ghost = self.get_ghost_profile_by_token(data.claim_token)
        
        if not ghost:
            raise ValueError("Invalid or expired claim token")
            
        if ghost.is_claimed:
            raise ValueError("Profile already claimed")
            
        if datetime.utcnow() > ghost.expires_at:
            raise ValueError("Invite has expired")
            
        # TODO: Update DB to map ghost to real user
        # self.db.table("ghost_profiles").update({
        #     "is_claimed": True,
        #     "claimed_by_user_id": data.new_user_id
        # }).eq("id", ghost.id).execute()
        
        # TODO: Merge ghost photos/bio into the newly created user profile
        # self.db.table("profiles").update({
        #     "bio_from_friend": ghost.bio_from_friend,
        #     # Append photos logic here
        # }).eq("id", data.new_user_id).execute()
        
        # TODO: Reward the matchmaker (creator)
        # reward_karma(ghost.creator_user_id, points=50, reason="Successfully onboarded a friend via Ghost Profile")
        
        return True
