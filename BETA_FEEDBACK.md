# Beta Feedback Tracker

Status key: `DONE` = completed, `IN PROGRESS` = actively being worked on, `TODO` = not started

---

## Top-Level Issues

| Status | Issue |
|--------|-------|
| DONE | Compatibility score is always 99% (display score now random 70-99, set once at proposal creation) |
| DONE | If you vote for a friend's proposal in the gate, you shouldn't be able to vote again in the friend's section (800ms delay fix in CommunityScreen.tsx) |
| IN PROGRESS | Proposal section didn't load properly — proposals generated before user hit 100% profile strength. Fix: gate matchmaking pool on `profile_completed = true`, lower 100% threshold to 1 photo |

---

## My Thoughts (Saul)

| # | Status | Issue |
|---|--------|-------|
| 1 | DONE | Make it so you can only upload 3 photos |
| 2 | IN PROGRESS | Profile strength 100% at 1 photo -> triggers profile completion -> enters matchmaking pool |
| 3 | DONE | Political interest buttons don't match the options you can select for yourself — aligned options + backend normalization |
| 4 | DONE | Completely remove non-negotiables |
| 5 | DONE | Reduce number of questions to 15 — too much friction. Mix of lighthearted and serious |
| 6 | TODO | Friend code needs to be clickable/copyable when you send it |
| 7 | DONE | Investigate streaks — counting up, system appears flawed |
| 8 | DONE | Click on friends' profile photos to see their profile |
| 9 | DONE | If you match with a friend, you shouldn't be able to vote on the match |

---

## Risus

| # | Status | Issue |
|---|--------|-------|
| 1 | DONE | No preference at the top of the list. And exclusive (ethnicity + politics in MatchPreferencesScreen) |
| 2 | DONE | Remove character limit on questions |
| 3 | DONE | Help and support / terms of service / privacy policy all need to be updated |
| 4 | IN PROGRESS | Have some sort of explanation system for beginners (asked what the timer was) — friend working on it |
| 5 | DONE | Get rid of the add more photos pop up |
| 6 | DONE | Get rid of the word streaks (changed to "X days" format) |

---

## Eliza

| # | Status | Issue |
|---|--------|-------|
| 1 | SCRAPPED | Adjust age slider so you can click and then scroll |
| 2 | DONE | 5 interest/values max (onboarding steps, profile edit, section components all updated 8→5) |
| 3 | DONE | Left and right in interests/value section of proposal didn't make sense |

---

## Leif

### Onboarding
| # | Status | Issue |
|---|--------|-------|
| a | SCRAPPED | Sign in on initial screen is unreadable |
| b | TODO | Transition from code entry for login to name entry is unnatural |
| c | DONE | Ethnicity page is not clear whether it's asking for yours or for other people (added "What's your ethnicity?" to subtitle) |
| d | TODO | Lifestyle page should indicate more buttons to scroll to beneath cannabis |
| e | SCRAPPED | Values page is a little overwhelming |
| f | TODO | Not a huge fan of the transition between pages, but likes the haptics |
| g | TODO | Photos and profile should already be uploaded before hitting get started button |

### In App
| # | Status | Issue |
|---|--------|-------|
| a | DONE | Swiping through images on profile is unnatural — should loop back around (tappable dots added) |
| b | TODO | Load changes locally before pushing to Supabase — delay is annoying |
| c | TODO | Says I already helped Risus even though I didn't |
| d | TODO | Loading screen is a little blurry |
| e | SCRAPPED | No notifs for messages |

---

## Sam

| # | Status | Issue |
|---|--------|-------|
| 1 | DONE | Too many interest/value options — skim down. Health and fitness into one |

---

## General Bugs

| Status | Issue |
|--------|-------|
| DONE | Why does Leif have 148 points in the friends section? (UserRow used fake random fallback instead of real karmaPoints) |
| TODO | Why does audio proposal not work? |
