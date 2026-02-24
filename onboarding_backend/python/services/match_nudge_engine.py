import datetime
import requests

NUDGE_DAYS = 3
EXPO_PUSH_API = "https://exp.host/--/api/v2/push/send"

def run_match_nudge_job(supabase):
    print("[MATCH_NUDGE] === Starting match nudge job ===")
    
    # 1. Get all active matches
    try:
        result = supabase.table("matches").select("id, user1_id, user2_id, created_at").eq("status", "active").execute()
        active_matches = result.data or []
    except Exception as e:
        print(f"[MATCH_NUDGE] Error fetching active matches: {e}")
        return

    if not active_matches:
        print("[MATCH_NUDGE] No active matches found.")
        return

    # 2. Check each match
    nudges_sent = 0
    now = datetime.datetime.now(datetime.timezone.utc)

    for match in active_matches:
        match_id = match["id"]
        
        # Check last message
        try:
            msg_res = supabase.table("messages").select("sent_at").eq("match_id", match_id).order("sent_at", desc=True).limit(1).execute()
            messages = msg_res.data or []
            
            if messages:
                last_activity_str = messages[0]["sent_at"]
            else:
                last_activity_str = match["created_at"]
                
            last_activity = datetime.datetime.fromisoformat(last_activity_str.replace("Z", "+00:00"))
            
            delta = now - last_activity
            if delta.days >= NUDGE_DAYS:
                # Retrieve push tokens for both users
                user1_id = match["user1_id"]
                user2_id = match["user2_id"]
                
                settings_res = supabase.table("user_settings").select("user_id, push_token").in_("user_id", [user1_id, user2_id]).execute()
                settings = settings_res.data or []
                
                push_messages = []
                for s in settings:
                    token = s.get("push_token")
                    if token:
                        push_messages.append({
                            "to": token,
                            "sound": "default",
                            "title": "Quiet in chat?",
                            "body": "It's been a few days since you chatted! If nothing is moving, maybe it's time to end the match.",
                            "data": {"type": "match_nudge", "matchId": match_id}
                        })
                
                if push_messages:
                    try:
                        response = requests.post(
                            EXPO_PUSH_API,
                            json=push_messages,
                            headers={
                                "Accept": "application/json",
                                "Accept-encoding": "gzip, deflate",
                                "Content-Type": "application/json"
                            }
                        )
                        print(f"[MATCH_NUDGE] Sent {len(push_messages)} nudges for match {match_id}. Response: {response.status_code}")
                        nudges_sent += len(push_messages)
                    except Exception as e:
                        print(f"[MATCH_NUDGE] Error pushing expo notification: {e}")
                        
        except Exception as e:
            print(f"[MATCH_NUDGE] Error processing match {match_id}: {e}")

    print(f"[MATCH_NUDGE] Finished. Total nudges sent: {nudges_sent}")
