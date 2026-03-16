# DEFERRED: Suggest a Match

Deferred on 2026-03-16. Feature is complete and working — pulled from UI for v1 launch to keep the Community screen focused. Re-enable for a later version.

## What this feature does

Allows a user to suggest two of their friends as a match for each other.
Also allows recommending someone you voted on to a specific friend.

## Two sub-features

### 1. Suggest a Match (friend-to-friend suggestions)
- User picks two friends → creates a `friend_suggestions` row (status='queued')
- At 7PM generate-proposals cycle, queued suggestions are converted to proposals
- Suggester gets +1 karma assist when it converts

### 2. Recommend This Person (from proposal voting)
- After passing on a proposal, user can recommend the person to a specific friend
- Creates a `friend_recommendations` row
- Acts as an algorithmic boost (not shown to the user being recommended)

## Files stored here

### Frontend
- `frontend/SuggestMatchScreen.tsx` — full UI for picking friends and submitting
- `frontend/friendProposalService.ts` — createFriendSuggestion, getEligibleFriends, getActiveSuggestions, getFriendActiveProposal

### Edge Functions
- `edge-functions/suggest-friend-match/index.ts` — validates + inserts friend_suggestions
- `edge-functions/submit-recommendation/index.ts` — validates + upserts friend_recommendations

## Database (still live — do NOT drop these tables)
- `friend_suggestions` table — migration: 20260312000005_friend_suggestions.sql
- `friend_recommendations` table — migrations: 20260305000001_friend_recommendations.sql, 20260305_fix_friend_recommendations_unique.sql

## What was removed from active code
- `SuggestMatchRow` component from CommunityScreen.components.tsx
- `getActiveSuggestions` + suggestionsMap from CommunityScreen.tsx
- `submitRecommendation` from communityBackendService.ts
- `submitFriendRecommendation` from proposalApiService.ts
- allUserRecs pre-fetch from communityBackendService.friends.ts
- Recommend button from MatchProposalScreen.tsx
- SuggestMatch route from AppNavigator.tsx + types/index.ts
- Friend suggestion processing from generate-proposals edge function
- Friend recommendation boost from generate-proposals edge function

## To re-enable
1. Restore files from this folder
2. Re-add navigation route (SuggestMatch in RootStackParamList + AppNavigator)
3. Re-add SuggestMatchRow to CommunityScreen.components.tsx
4. Re-add getActiveSuggestions + suggestionsMap to CommunityScreen.tsx
5. Re-add submitRecommendation to communityBackendService.ts
6. Re-add recommendation boost + suggestion processing to generate-proposals
7. Re-deploy suggest-friend-match and submit-recommendation edge functions
