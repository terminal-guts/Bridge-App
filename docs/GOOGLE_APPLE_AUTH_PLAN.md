# Google Sign-In + Sign in with Apple — Final Plan

## Context

Apple rejected Google Sign-In under Guideline 4.8: must offer Sign in with Apple alongside. Google was stripped from main. To bring it back, we build both.

## Architecture

```
Welcome Screen
├── "Sign in with Apple"  → Apple auth → .edu verification (one-time) → app
├── "Continue with Google" → Google auth (rice.edu only) → app
└── "Use Rice email"       → existing OTP flow → app
```

**Google = 1 step** (Rice Google Workspace email IS the .edu email)
**Apple = 2 steps** first time (Apple auth → verify .edu), then 1 step for returning users

## Key Architectural Decisions (Settled)

1. **Auto-linking ON** — trust Supabase to merge accounts when Google email matches existing OTP email
2. **Server-side Google domain validation** — edge function checks `hd` claim before accepting token
3. **Apple dedup** — check for existing .edu account BEFORE creating Apple auth user

## Implementation — 9 Work Items

### 1. Database migration: add `edu_email` + `edu_email_verified` columns

```sql
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS edu_email TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS edu_email_verified BOOLEAN DEFAULT FALSE;
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_edu_email ON user_profiles(edu_email) WHERE edu_email IS NOT NULL;
```

This is the dedup key across ALL auth methods. When an Apple user verifies their .edu, it goes here. When a Google/OTP user signs up, their @rice.edu email goes here. The UNIQUE index prevents two accounts with the same .edu.

### 2. Edge function: `validate-google-domain`

New edge function that validates the Google ID token's `hd` claim before Supabase accepts it. Alternative: do this check in `authService.ts` after `signInWithIdToken` and sign out + reject if domain doesn't match (already implemented on the deferred branch). The deferred branch approach is simpler and doesn't require a new edge function.

**Decision: use the deferred branch approach** (client-side validation after sign-in, sign out if wrong domain). The `hd` claim is inside the JWT which Supabase already verified. Reading it client-side after sign-in and rejecting is equivalent security since the token is already verified.

### 3. Re-enable Google Sign-In

Cherry-pick from `deferred/google-auth-apple-signin`:

**`app.json`** — re-add Google plugin:
```json
["@react-native-google-signin/google-signin", {
  "iosUrlScheme": "com.googleusercontent.apps.71474997929-p87rld819donm3a4odg05unl9ufunnlh"
}]
```

**`src/services/authService.ts`** — restore `configureGoogleSignIn()` and `signInWithGoogle()` from deferred branch. Already has `hostedDomain: 'rice.edu'` and post-sign-in email domain check.

**`src/screens/auth/LoginScreen.tsx`** — restore Google button with "Continue with Rice Google" text.

**`src/screens/onboarding/steps/EmailSignUpStep.tsx`** — restore Google button on signup screen.

### 4. Install Apple Sign-In packages

```bash
npx expo install expo-apple-authentication expo-crypto
```

**`app.json`** — add:
```json
"plugins": ["expo-apple-authentication"]
"ios": { "usesAppleSignIn": true }
```

**Apple Developer Portal:** Enable "Sign in with Apple" capability on App ID `com.bridgedate.app`.

**Supabase Dashboard:** Authentication → Providers → Apple → toggle ON.

### 5. Implement `signInWithApple()` in authService.ts

```typescript
export const signInWithApple = async (): Promise<ApiResponse<User>> => {
  // 1. Generate nonce (crypto.randomUUID → SHA-256 hash)
  // 2. AppleAuthentication.signInAsync({ requestedScopes: [FULL_NAME, EMAIL], nonce: hashedNonce })
  // 3. IMMEDIATELY capture credential.fullName (null after first sign-in ever)
  // 4. supabase.auth.signInWithIdToken({ provider: 'apple', token: credential.identityToken, nonce: rawNonce })
  // 5. Store name in user metadata if captured
  // 6. Return user
};
```

**Critical gotcha:** Apple gives `fullName` only on the VERY FIRST sign-in for that Apple ID + app combo. Must capture and store immediately. If missed, user has to revoke the app in Apple ID settings.

### 6. Build EduVerificationScreen

**New file:** `src/screens/auth/EduVerificationScreen.tsx`

Shows after Apple Sign-In if user has no verified .edu email.

**Flow:**
1. User enters @rice.edu email
2. Check `edu_email` UNIQUE index — if another user_profiles row has this email → "Account exists, sign in with Rice email instead"
3. Send OTP to that .edu email (reuse existing `sendOtpToEmail` with `skipAccountCheck: true`)
4. User verifies OTP
5. Update `user_profiles` with `edu_email` + `edu_email_verified = true`
6. Continue to app/onboarding

**For returning Apple users:** Skip this screen — their `edu_email_verified` is already true.

### 7. Post-auth routing logic

**`AppNavigator.tsx`** or **`EmailVerificationScreen.tsx`** — after any sign-in:

```
if (signedInViaApple && !profile.edu_email_verified) {
  → EduVerificationScreen
} else if (!profile) {
  → Onboarding
} else {
  → MainTabs
}
```

For Google: no extra check needed (email IS .edu).
For OTP: no extra check needed (email IS .edu).

### 8. UI: button layout

Per Apple's design guidelines, Apple button must be at least as prominent as Google.

```
┌─────────────────────────────┐
│    Sign in with Apple       │  ← Apple's official black button
└─────────────────────────────┘
┌─────────────────────────────┐
│   Continue with Rice Google  │  ← Google branded button
└─────────────────────────────┘
          ─── or ───
     [ Use Rice email ]          ← text link, existing OTP flow
```

Both social buttons same size. Apple on top (Apple's preference).

### 9. Auth state race condition guard

Add a `signingInRef` to prevent concurrent sign-in attempts:

```typescript
const signingInRef = useRef(false);

const handleGoogleSignIn = async () => {
  if (signingInRef.current) return;
  signingInRef.current = true;
  try { ... } finally { signingInRef.current = false; }
};
```

Same pattern for Apple. Prevents: user taps Apple → cancels → taps Google → state corruption.

## Edge Cases Handled

| Edge Case | Solution |
|-----------|----------|
| Google then Apple = two accounts? | Auto-linking handles Google+OTP. Apple dedup check during .edu verification prevents Apple duplicates. |
| hostedDomain bypass (jailbreak) | Post-sign-in email domain check in authService + sign out if non-.edu |
| Apple name only given once | Capture immediately, store in user metadata |
| Apple relay email | EduVerificationScreen handles .edu verification separately |
| User denies "Share Email" | Still works — identity token JWT has the relay email, signInWithIdToken succeeds |
| Cancel Apple, tap Google | signingInRef prevents concurrent sign-ins |
| Rice account deactivated post-graduation | OTP always available as fallback, .edu email stored in profile |
| Reviewer bypass | Unchanged — 5-tap hidden login uses email/password, not social |
| Returning Apple user | edu_email_verified flag → skip verification → straight to app |

## What Does NOT Change

- Existing email OTP flow — untouched
- Reviewer accounts — untouched  
- Demo bubble — untouched
- Voting, matching, profiles — untouched
- All edge functions except possibly process-vote pool_eligible check — untouched

## Files Modified/Created

| File | Change |
|------|--------|
| `app.json` | Re-add Google plugin, add Apple plugin + usesAppleSignIn |
| `package.json` | Add expo-apple-authentication, expo-crypto |
| `src/services/authService.ts` | Restore signInWithGoogle(), add signInWithApple() |
| `src/screens/auth/LoginScreen.tsx` | Add Apple + Google buttons |
| `src/screens/onboarding/steps/EmailSignUpStep.tsx` | Add Apple + Google buttons |
| `src/screens/auth/EduVerificationScreen.tsx` | NEW — .edu verification for Apple users |
| `src/navigation/AppNavigator.tsx` | Add EduVerification route + post-auth routing |
| `supabase/migrations/` | NEW — edu_email + edu_email_verified columns |
| Apple Developer Portal | Enable Sign in with Apple capability |
| Supabase Dashboard | Enable Apple provider |

## Testing Checklist

1. Google → rice.edu account → creates account → onboarding
2. Google → non-rice.edu (should be blocked by hostedDomain + validation)
3. Apple → relay email → EduVerificationScreen → verify .edu → onboarding
4. Apple → returning user (verified .edu) → straight to app
5. Apple → .edu already used by OTP account → "account exists" message
6. Google → email already has OTP account → auto-linked by Supabase
7. Existing OTP user → still works unchanged
8. Reviewer 5-tap → still works unchanged
9. iPad test (previous Google crash)
10. Apple button follows Apple's design guidelines
11. Both buttons equal prominence
12. Cancel Apple → tap Google → no crash
13. Sign out → sign back in with different method → works
