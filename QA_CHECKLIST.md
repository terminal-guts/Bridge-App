# Professional Mobile QA Reference: iOS / React Native / Expo

A comprehensive QA reference compiled from professional testing methodology sources, Apple's official App Store Review Guidelines, and industry-standard checklists. Intended as a living document for pre-release and ongoing testing of Bridge.

*Researched March 2026. Sources cited at the bottom.*

---

## Table of Contents

1. [QA Philosophy and Strategy](#1-qa-philosophy-and-strategy)
2. [Functional Testing](#2-functional-testing)
3. [UI / UX Testing](#3-ui--ux-testing)
4. [Performance Testing](#4-performance-testing)
5. [Network Condition Testing](#5-network-condition-testing)
6. [Authentication and Account Flow Testing](#6-authentication-and-account-flow-testing)
7. [Permission Handling Testing](#7-permission-handling-testing)
8. [Crash and Error State Testing](#8-crash-and-error-state-testing)
9. [Security Testing](#9-security-testing)
10. [Accessibility Testing](#10-accessibility-testing)
11. [Compatibility and Device Testing](#11-compatibility-and-device-testing)
12. [Installation and Update Testing](#12-installation-and-update-testing)
13. [Interrupt and Lifecycle Testing](#13-interrupt-and-lifecycle-testing)
14. [Edge Case and Regression Testing](#14-edge-case-and-regression-testing)
15. [Push Notification Testing](#15-push-notification-testing)
16. [Localization Testing](#16-localization-testing)
17. [React Native / Expo-Specific Testing](#17-react-native--expo-specific-testing)
18. [Apple App Store Review Guidelines Reference](#18-apple-app-store-review-guidelines-reference)
19. [Common App Store Rejection Reasons](#19-common-app-store-rejection-reasons)
20. [Pre-Submission Checklist](#20-pre-submission-checklist)
21. [Release Readiness Criteria](#21-release-readiness-criteria)
22. [Sources](#22-sources)

---

## 1. QA Philosophy and Strategy

### Core Principles

- **Start early.** Involve QA from the requirements phase, not after development. Catching logical flaws before code is written is far cheaper than bug fixes post-launch.
- **Test on real devices.** Emulators and simulators miss hardware-specific bugs, real-world network conditions, OS-level quirks, and permission dialog behavior. Always supplement simulator testing with physical device testing.
- **Risk-based prioritization.** Focus the most intensive testing on high-risk areas: authentication flows, data submission forms, and primary user journeys. Not all features carry equal risk.
- **Treat the checklist as a living document.** Update it with every new feature shipped and every piece of user feedback received.
- **Combine manual and automated testing.** Manual testing is essential for exploratory, usability, and edge case work. Automated testing handles regression, repetitive flows, and CI/CD gates.
- **Define "done" for QA.** Each sprint should have an explicit QA definition of done: automated test coverage for key scenarios, no P1/P2 open bugs, device testing sign-off.

### Testing Pyramid for React Native

```
      [E2E Tests]         <- Detox, Maestro (fewest, most expensive)
   [Integration Tests]    <- React Native Testing Library + MSW
  [Unit / Component]      <- Jest (most, cheapest)
```

- **Unit/Component tests (Jest + React Native Testing Library):** Individual components, utility functions, business logic. Focus on what the user sees, not internal implementation.
- **Integration tests:** Screen-level flows, API integration via mock service worker.
- **End-to-end tests (Detox or Maestro):** Full user journeys on real device/simulator. Critical paths: onboarding, auth, core feature flows.

### Testing Types Reference

| Type | Purpose | When |
|---|---|---|
| Smoke testing | Quick check of basic functionality | After every build |
| Functional testing | All features work per requirements | Each sprint |
| Regression testing | Recent changes haven't broken existing flows | Before every release |
| Sanity testing | Specific bug fixes or components after a change | After bug fix |
| Performance testing | Load times, memory, battery | Pre-release |
| Security testing | Vulnerabilities, data protection | Pre-release |
| Accessibility testing | Assistive technology compatibility | Pre-release |
| Usability testing | Real users evaluate the app | Beta / major releases |
| Compatibility testing | Multiple devices, OS versions | Pre-release |

### Recommended Tooling

| Area | Tool |
|---|---|
| Unit/component | Jest + React Native Testing Library |
| E2E (React Native–native) | Detox |
| E2E (YAML-based, accessible to non-devs) | Maestro |
| Automation cross-platform | Appium |
| Network simulation | Charles Proxy, iOS Network Link Conditioner |
| Crash reporting | Sentry / Firebase Crashlytics |
| Performance profiling | Xcode Instruments, Flipper |
| Accessibility inspection | Xcode Accessibility Inspector |
| Real device cloud | BrowserStack, Firebase Test Lab |
| Database testing | pgTAP (via Supabase) |

---

## 2. Functional Testing

### Core Flow Validation

- [ ] All primary user journeys execute end-to-end without errors
- [ ] All secondary flows complete correctly
- [ ] Navigation between all screens works (no dead ends, no broken back navigation)
- [ ] All buttons, links, and interactive elements are tappable and respond correctly
- [ ] All forms submit, validate, and display errors correctly
- [ ] Mandatory fields are enforced before submission
- [ ] Field-level validation messages appear in the right context
- [ ] Empty states render correctly (no data, first-time use, cleared content)
- [ ] Loading states and skeletons display during async operations
- [ ] Success states and confirmation feedback shown after actions
- [ ] All modal sheets, overlays, and dialogs open and dismiss correctly
- [ ] Pull-to-refresh works where expected
- [ ] Infinite scroll / pagination works without duplicates or gaps
- [ ] Search and filter returns correct results
- [ ] Sorting functions work correctly and persist where expected

### Data Integrity

- [ ] Data entered by a user is saved and retrieved correctly
- [ ] Data persists across app restarts (where intended)
- [ ] Data does not persist across logouts (where it should not)
- [ ] No data loss during interrupted operations (e.g., losing network mid-submit)
- [ ] Cached data is stale only when expected; fresh fetch triggers correctly
- [ ] Date, time, and timezone handling is correct

### Feature Completeness

- [ ] No placeholder text ("Lorem ipsum," "TODO," "Coming soon") visible to users
- [ ] No test data or developer-only content appears in production builds
- [ ] All features listed in App Store metadata are functional and accessible
- [ ] No broken image assets or missing icons

---

## 3. UI / UX Testing

### Layout and Visual Consistency

- [ ] UI renders correctly on all target screen sizes (4.7", 5.8", 6.1", 6.7" and equivalent)
- [ ] UI renders correctly in portrait (and landscape if supported)
- [ ] Safe area insets are respected (notch, Dynamic Island, home indicator)
- [ ] No content is clipped, truncated, or hidden behind system UI elements
- [ ] Typography is consistent across all screens
- [ ] Color palette is consistent; no off-brand colors introduced
- [ ] Icons are consistently sized and aligned
- [ ] Spacing between interactive elements prevents accidental taps (minimum 44×44pt touch targets per Apple HIG)
- [ ] Shadows, borders, and elevation styles are consistent
- [ ] Images load at the correct resolution without pixelation or stretching
- [ ] Dark mode and light mode render correctly (if both supported)

### Interaction Feedback

- [ ] Button press states (highlighted, disabled) provide visual feedback
- [ ] Loading indicators appear for all async operations exceeding ~300ms
- [ ] Toast messages, alerts, and banners appear with correct timing and dismiss correctly
- [ ] Haptic feedback fires at appropriate moments (if implemented)
- [ ] Swipe gestures behave as expected; no conflicts with system swipe-back gesture
- [ ] Scroll behavior is smooth; no jank at 60fps on target devices

### Usability Heuristics (Nielsen's 10 — Applied to Mobile)

Evaluate each screen against these principles:

1. **Visibility of system status:** Users always know what is happening (loading, error, success).
2. **Match with the real world:** Language and concepts match the user's mental model, not engineering terminology.
3. **User control and freedom:** Easy escape routes from all states; no dead ends.
4. **Consistency and standards:** Same patterns used for same actions throughout the app.
5. **Error prevention:** Dangerous actions require confirmation; forms validate before submit.
6. **Recognition over recall:** Labels and context are visible; users don't need to memorize.
7. **Flexibility and efficiency:** Core flows are fast for experienced users; progressive disclosure for new users.
8. **Aesthetic and minimalist design:** No unnecessary information competing for attention.
9. **Help users recognize, diagnose, and recover from errors:** Error messages are plain language, not error codes.
10. **Help and documentation:** Critical paths have contextual help; onboarding explains non-obvious features.

*Note: A single evaluator finds approximately 35% of usability problems. Three to five evaluators provide comprehensive coverage.*

### Onboarding

- [ ] First-run onboarding clearly explains the app's core value proposition
- [ ] Onboarding can be skipped or dismissed if applicable
- [ ] Permission requests are contextually placed (not all at launch)
- [ ] Completion of onboarding leads correctly into the authenticated main flow

---

## 4. Performance Testing

### Key Benchmarks (Industry Standard)

| Metric | Target | Minimum Acceptable |
|---|---|---|
| Cold launch time | < 2 seconds | < 3 seconds |
| Warm launch time | < 1 second | < 1.5 seconds |
| Screen transition (navigation) | < 300ms | < 500ms |
| API response (UI feedback) | < 1 second | < 2 seconds |
| App frame rate | 60 fps steady | No visible jank |
| Crash-free sessions | > 99.95% | > 99% |
| Crash-free users | > 99% | — |
| Memory usage (foreground) | Within OS allocations | No memory warnings |

*Source: BrowserStack, Survicate Mobile App Benchmarks 2025. Apple rejects ~25% of submissions for performance issues — the single largest rejection category.*

### Launch Performance

- [ ] Cold launch (first install or cleared from memory) is under 2 seconds to interactive
- [ ] Warm launch (app in background memory) is under 1 second
- [ ] No unnecessary work blocking the main thread at startup
- [ ] Fonts, critical assets, and initial screen content load before first meaningful paint
- [ ] Splash screen dismisses cleanly without flash or blank frame

### Memory and CPU

- [ ] No memory leaks in core navigation flows (profile memory over repeated navigation)
- [ ] Memory usage remains stable during extended sessions (30+ minutes)
- [ ] No CPU spikes during idle states
- [ ] Animations are GPU-accelerated; heavy computation is off the main thread
- [ ] Large list rendering uses virtualization (FlatList, FlashList) — no full re-renders

### Battery

- [ ] App does not drain battery abnormally during active use
- [ ] Background processes are minimal and conform to iOS background execution limits
- [ ] No continuous GPS polling, sensor access, or network requests in the background without explicit user awareness
- [ ] Test 30-minute active usage session and observe battery percentage delta vs. baseline

### Network Efficiency

- [ ] Requests are not made redundantly (e.g., repeated fetches on every re-render)
- [ ] Images are cached and not re-downloaded unnecessarily
- [ ] Pagination loads incrementally rather than fetching all records at once
- [ ] No large payloads sent over the network when smaller ones would suffice
- [ ] API calls are deduplicated during concurrent renders

---

## 5. Network Condition Testing

### Connectivity Scenarios to Test

| Condition | How to Simulate |
|---|---|
| Strong Wi-Fi | Default |
| Weak Wi-Fi / 3G | Charles Proxy throttle / iOS Network Link Conditioner |
| 4G / LTE | Physical device on cellular |
| 2G / Edge | Network Link Conditioner (very poor) |
| Full offline / Airplane mode | Toggle Airplane mode mid-session |
| Network loss mid-request | Toggle Airplane mode while a request is in flight |
| Network restoration after loss | Toggle back to connected mid-session |
| Wi-Fi to cellular handoff | Disconnect from Wi-Fi while on 5G cellular |

Network factors to vary: bandwidth (2G–5G), latency (20ms–2000ms), packet loss %, connection type.

### Offline Behavior

- [ ] App does not crash when launched offline
- [ ] Appropriate "no connection" message is shown — not a blank screen or raw error
- [ ] Cached or previously loaded content is visible offline where applicable
- [ ] Pending actions queue and retry correctly when connectivity is restored (if app supports this)
- [ ] No data loss from interrupted form submissions or writes
- [ ] App does not enter an infinite loading state without timeout and user feedback

### Error Feedback

- [ ] Network error messages are human-readable, not raw HTTP status codes or stack traces
- [ ] Retry actions are offered to users after a network failure
- [ ] Failed image loads show placeholder/fallback, not broken image icons
- [ ] Error states do not persist after connectivity is restored without user action

### API Error Handling

- [ ] 401 Unauthorized: user redirected to login gracefully, not left in broken state
- [ ] 403 Forbidden: appropriate message shown; user not in empty/broken state
- [ ] 404 Not Found: graceful empty / not-found state shown
- [ ] 429 Rate Limited: retry-after logic or friendly message
- [ ] 500 Server Error: generic error with retry option; no stack trace exposed
- [ ] Timeout (no response): timeout fires after a reasonable interval (10–30s); user is informed

---

## 6. Authentication and Account Flow Testing

### Login / Sign-Up Flows

- [ ] Valid credentials log in successfully
- [ ] Invalid credentials show a clear, non-revealing error ("Incorrect email or password" — not which field is wrong specifically)
- [ ] Email with incorrect casing is handled gracefully
- [ ] Login with a non-existent account shows appropriate message
- [ ] Sign-up with an already-registered email shows appropriate message
- [ ] Password fields mask input by default; show/hide toggle works correctly
- [ ] Login via OTP/magic link delivers code promptly and the code works correctly
- [ ] OTP codes expire after their stated window
- [ ] Repeated failed login attempts trigger rate limiting (no infinite attempts)
- [ ] Deep link from email (magic link, OTP) opens correct screen inside the app
- [ ] "Remember me" / session persistence works as expected across restarts

### Session Management

- [ ] Authenticated sessions persist correctly across app restarts and background/foreground cycles
- [ ] Expired tokens are handled gracefully — user prompted to re-authenticate, not left in a broken state
- [ ] Concurrent sessions from multiple devices behave as designed
- [ ] Logout clears all sensitive local data (tokens, cached user data, AsyncStorage keys)
- [ ] After logout, navigating back (gesture) does not return to an authenticated screen
- [ ] Deleted accounts are fully revoked — re-login with a deleted account shows appropriate message

### Password Reset / Account Recovery

- [ ] Password reset email is sent promptly
- [ ] Reset links expire after their stated window
- [ ] Using an expired reset link shows a clear message and offers to resend
- [ ] Multiple reset requests in quick succession handled (no duplicate email loops)
- [ ] Resetting password on one device invalidates other sessions (if that is the intended behavior)

### Account Deletion

- [ ] In-app account deletion is available and functional (required by Apple App Store — see §18)
- [ ] Account deletion removes all user data as described in the privacy policy
- [ ] After deletion, user is signed out and cannot log back in
- [ ] Deletion is confirmed with a dialog before proceeding (irreversible action warning)

### Auth Edge Cases

- [ ] App handles OAuth provider downtime gracefully (Google, Apple Sign-In)
- [ ] App handles provider token expiration and prompts re-authorization
- [ ] Sign in with Apple works on a fresh device with no Apple ID cached
- [ ] Social login revocation (user removes app permissions from their account settings) is handled
- [ ] Role/permission changes take effect without requiring full logout/login (or session refresh is triggered)

*Security note: Authenticated testing detects 78% more sensitive data exposure per scan vs. unauthenticated testing. When auth fails, up to 95% of vulnerabilities remain hidden. (NowSecure, 2026)*

---

## 7. Permission Handling Testing

### General Rules for Each Permission

For every permission the app requests:

- [ ] The permission dialog appears at the correct, contextually relevant moment (not all at app launch)
- [ ] The `NSUsageDescription` string clearly explains why the permission is needed
- [ ] The app functions gracefully when permission is denied
- [ ] An alternative flow or explanatory message is shown if a critical permission is denied
- [ ] When permission is denied, the app does not crash or enter a broken state
- [ ] When permission is denied, the app offers to direct the user to Settings to enable it (if needed)
- [ ] When permission is later revoked from iOS Settings, the next app session handles it gracefully
- [ ] When permission is later granted from iOS Settings, the feature becomes available without requiring a restart (or the app prompts a restart if needed)
- [ ] Restricted settings (e.g., parental controls) are handled gracefully

### Specific Permissions

**Notifications (Push)**
- [ ] Permission request appears at a natural moment (not immediately on first launch)
- [ ] Denying notifications does not block core app functionality
- [ ] Notifications arrive correctly and tap navigation works
- [ ] Notification badge counts are correct and clear when appropriate

**Camera**
- [ ] Camera opens correctly when permission is granted
- [ ] Graceful fallback when camera permission is denied
- [ ] Camera is released properly when the user dismisses the camera view

**Photo Library**
- [ ] Photo picker opens correctly with granted permission
- [ ] Limited Photo Library access (iOS 14+) is handled — the app functions with a subset of photos
- [ ] Graceful message when permission is denied

**Location**
- [ ] Location is only requested when the feature requires it
- [ ] "While Using" vs. "Always" permission requested appropriately for the use case
- [ ] App handles location permission set to "Never" without crash
- [ ] Location permission prompt text accurately describes why location is needed

**Contacts**
- [ ] Permission request is contextually timed
- [ ] Denial is handled gracefully; no attempt to access contacts without permission
- [ ] Contacts data is not stored beyond its immediate use

**Microphone**
- [ ] Permission requested only when audio recording is used
- [ ] Denial is handled gracefully
- [ ] Microphone session ends correctly when recording is complete or dismissed

---

## 8. Crash and Error State Testing

### Crash Scenarios

- [ ] App does not crash on cold launch on any target device/OS combination
- [ ] App does not crash on warm launch (restored from background)
- [ ] App does not crash during core user flows
- [ ] App does not crash when receiving a push notification while in the foreground
- [ ] App does not crash when receiving a push notification while in the background
- [ ] App does not crash when deep linked into from another app or notification
- [ ] App does not crash on rapid navigation (back-forward button mashing)
- [ ] App does not crash when device memory is critically low
- [ ] App does not crash when device storage is full (test file upload / media capture)
- [ ] App does not crash when network is lost mid-operation

### Crash Recovery

- [ ] After a crash, the app restarts cleanly
- [ ] After a crash, the user is returned to a reasonable state (not mid-broken-flow)
- [ ] User data entered before the crash is preserved where possible (or the user is notified of loss)
- [ ] Crash reports are being captured correctly in monitoring tooling (Sentry / Crashlytics)

### Error State UI

- [ ] Every error state has a visible, human-readable message
- [ ] Error messages do not expose internal error codes, stack traces, or server responses to the user
- [ ] Every error state has a recovery action (retry, go back, go home)
- [ ] Error states do not block the entire app — users can navigate away
- [ ] Form validation errors clearly indicate which field has the issue
- [ ] Network error states disappear when the operation succeeds on retry

### Edge Input Handling

- [ ] All text inputs handle extremely long strings without overflow or crash
- [ ] All text inputs handle empty strings, whitespace-only input, and null values
- [ ] All text inputs handle special characters (emoji, Unicode, RTL characters) without crash
- [ ] Numeric fields reject non-numeric input at the UI level
- [ ] Date pickers do not allow invalid date selections
- [ ] Copy/paste into form fields works correctly (including paste from clipboard manager)
- [ ] Rapid repeated taps on submit buttons do not cause duplicate submissions

---

## 9. Security Testing

### Data Storage

- [ ] Sensitive data (auth tokens, passwords, PII) is stored in the iOS Keychain, not in AsyncStorage or plain files
- [ ] No sensitive data appears in device logs or Xcode console in production builds
- [ ] No sensitive data is stored in plain text in SQLite, Realm, or local files
- [ ] App container files do not contain readable sensitive data

### Data Transmission

- [ ] All network requests use HTTPS — no HTTP calls in any environment
- [ ] Certificate pinning implemented for highly sensitive endpoints (if required)
- [ ] API keys and secrets are not embedded in the client bundle or exposed in JS source
- [ ] Auth tokens transmitted only in headers (Authorization), not in URL query parameters

### Authentication Security

- [ ] Auth tokens are deleted from the device on logout
- [ ] Sessions are invalidated server-side on logout, not just client-side
- [ ] Expired tokens are rejected by the server and not reused
- [ ] Failed login attempts are rate-limited (server enforces this, not just client)
- [ ] Session tokens are not exposed in error messages or logs

### App Transport Security (iOS)

- [ ] No exceptions in `NSAppTransportSecurity` unless explicitly required and documented
- [ ] Any ATS exceptions are minimized in scope and justified in App Review Notes

### Third-Party SDKs

- [ ] All third-party SDKs are from reputable sources and are up to date
- [ ] SDKs do not request beyond what is needed
- [ ] SDK data collection practices are disclosed in the privacy policy
- [ ] SDKs do not introduce unintended network calls or data exfiltration

### Privacy Compliance

- [ ] App Privacy labels in App Store Connect accurately reflect all data collected
- [ ] Permission strings in `Info.plist` accurately reflect actual usage
- [ ] App Tracking Transparency (ATT) prompt appears where required
- [ ] Privacy policy is linked in both App Store Connect metadata and within the app
- [ ] GDPR compliance in place if app is distributed in the EU

---

## 10. Accessibility Testing

### iOS VoiceOver Testing (Priority 1)

Enable VoiceOver in iOS Settings > Accessibility > VoiceOver, then verify:

- [ ] All interactive elements (buttons, links, inputs) are announced with a meaningful label
- [ ] Decorative images are not announced (hidden from accessibility tree)
- [ ] Screen transitions announce the new screen's title or heading
- [ ] Reading order follows the visual layout logically (top-to-bottom, left-to-right)
- [ ] Custom components (cards, carousels, pickers) expose correct accessibility roles and states
- [ ] Modal sheets and dialogs trap focus within themselves and restore focus when dismissed
- [ ] Form fields announce their label, type, and current value
- [ ] Error messages are announced when they appear (not just visually displayed)
- [ ] Progress indicators and loading states are announced
- [ ] Page titles are read to inform users of screen context

### Touch Target Sizing

- [ ] All interactive elements have a minimum touch target of 44×44 points (Apple HIG requirement)
- [ ] Closely spaced interactive elements have adequate separation to prevent misfire
- [ ] Swipe-to-action elements have accessible button alternatives

### Color and Contrast

- [ ] Text contrast ratio is at least 4.5:1 for normal text (WCAG 2.1 AA)
- [ ] Text contrast ratio is at least 3:1 for large text (18pt+ regular or 14pt+ bold)
- [ ] Errors, warnings, and required fields are not indicated by color alone (must have icon, label, or pattern)
- [ ] UI is usable with Reduce Transparency and Increase Contrast enabled
- [ ] UI is usable in Grayscale mode (Settings > Accessibility > Display & Text Size)

### Dynamic Type

- [ ] App supports iOS Dynamic Type across all text size settings (xSmall through AX5)
- [ ] Text does not overflow, clip, or overlap when font size is increased to the largest setting
- [ ] Layout adapts gracefully (line wrapping, expanding containers) at large text sizes
- [ ] Fixed-height containers do not crop text at larger sizes

### Motion and Animation

- [ ] App respects the iOS Reduce Motion setting (Settings > Accessibility > Motion > Reduce Motion)
- [ ] Parallax effects, auto-play animations, and large transitions are disabled under Reduce Motion
- [ ] No content flashes more than 3 times per second (WCAG seizure guideline)

### Additional Assistive Technology

- [ ] App is navigable via Switch Control
- [ ] App is compatible with Voice Control (tap-by-label, tap-by-number)
- [ ] App is usable with an external Bluetooth keyboard (focus navigation, Enter to activate)
- [ ] No functionality is available via custom gesture only without an accessible alternative

*Recommended testing tools: VoiceOver (iOS), Xcode Accessibility Inspector, Xcode Simulator Dynamic Type*

---

## 11. Compatibility and Device Testing

### Target Device Matrix (iOS)

Test on at least one device from each form factor category:

| Category | Example Devices |
|---|---|
| iPhone SE (small form) | iPhone SE (3rd gen) |
| iPhone standard | iPhone 14, iPhone 15 |
| iPhone Plus / Max | iPhone 14 Plus, iPhone 15 Pro Max |
| iPhone with Dynamic Island | iPhone 14 Pro, iPhone 15 Pro |
| iPad (if supported) | iPad 10th gen, iPad Air |

### OS Version Coverage

- [ ] Current iOS release (latest)
- [ ] Current iOS release − 1
- [ ] Current iOS release − 2 (minimum supported version per app's deployment target)
- [ ] Beta iOS version (if available, for regression awareness)

### Screen Size and Resolution

- [ ] UI is correct at 375pt width (iPhone SE / older standard)
- [ ] UI is correct at 390pt width (iPhone 14 standard)
- [ ] UI is correct at 430pt width (iPhone 14 Plus / Pro Max)
- [ ] No content relies on exact pixel values that break on different display scales

### Orientation

- [ ] If landscape is supported, all screens render correctly in landscape
- [ ] If orientation is locked, confirm the lock is enforced
- [ ] Keyboard appearance in landscape does not break form layouts

---

## 12. Installation and Update Testing

### Fresh Installation

- [ ] App installs cleanly from TestFlight and App Store
- [ ] First launch after install shows correct onboarding / welcome flow
- [ ] All required permissions are requested at the right moments (not all at once)
- [ ] App does not assume any pre-existing local data on first launch

### Upgrade from Previous Version

- [ ] Install the last released version, log in, create data, then update to the new build
- [ ] After update: no forced logout loop
- [ ] After update: no missing or corrupted cached data
- [ ] After update: no broken navigation state from persisted navigation state
- [ ] After update: all new features accessible; no orphaned old features
- [ ] AsyncStorage schema migrations handle new/removed keys correctly

### Uninstallation

- [ ] Uninstalling the app removes all non-Keychain local data
- [ ] Keychain items are cleared correctly (depending on app's Keychain sharing policy)
- [ ] Re-installing after uninstall behaves like a fresh install (no ghost state)

### TestFlight Distribution

- [ ] Build is submitted with correct version and build numbers
- [ ] TestFlight distribution list receives the build and can install
- [ ] TestFlight-specific flags/features do not appear in the production build
- [ ] Demo credentials provided in TestFlight notes (or App Review Notes) are valid

---

## 13. Interrupt and Lifecycle Testing

### App State Transitions

- [ ] Incoming phone call during a critical action: app suspends gracefully, resumes correctly
- [ ] SMS notification received during active use: no disruption to current flow
- [ ] Push notification received while app is in foreground: handled correctly
- [ ] Push notification tapped from background/lock screen: app opens to correct screen
- [ ] App moved to background mid-operation: operation completes or is correctly handled on resume
- [ ] App killed from multitasking tray: next launch is a clean cold launch
- [ ] Device locked during app use: on unlock, app resumes to correct screen
- [ ] Low battery alert displayed: app handles system overlay without crash
- [ ] Low storage alert / OS memory pressure: app does not crash

### Keyboard Behavior

- [ ] Keyboard appears when a text input is tapped
- [ ] Keyboard dismisses correctly (tap outside input, Done button, swipe down)
- [ ] Keyboard does not obscure the active input field (content scrolls or insets correctly)
- [ ] Switching between input fields works correctly (Next key, toolbar buttons)
- [ ] Keyboard type is correct for each input (email, numeric, URL, default)
- [ ] No content is permanently hidden behind the keyboard after it dismisses

### Background Refresh and Timers

- [ ] Background fetch (if implemented) does not execute more frequently than configured
- [ ] Timers and scheduled tasks do not fire unexpectedly or accumulate on resume
- [ ] Real-time connections (WebSocket, Supabase Realtime) reconnect correctly after background/foreground cycle

---

## 14. Edge Case and Regression Testing

### Regression Test Strategy

Run the following after every release candidate build:

- [ ] Complete authentication flow (sign up → onboard → use core feature → sign out → sign back in)
- [ ] Core feature flows (the 3–5 most-used user journeys)
- [ ] Any flows that were modified in the current release
- [ ] Any flows adjacent to modified code (side-effect regression)
- [ ] Upgrade from the previously released version

### Input Edge Cases

- [ ] Empty inputs on forms that require data
- [ ] Whitespace-only inputs
- [ ] Maximum-length inputs (verify the UI does not break at the character limit)
- [ ] Inputs with emoji and Unicode characters
- [ ] Inputs with potential injection strings (`<script>`, `'; DROP TABLE`)
- [ ] Copy/paste into form fields (including paste from clipboard manager)
- [ ] Rapid repeated taps on submit buttons (no duplicate submissions)

### Data State Edge Cases

- [ ] User with zero content/activity (empty state rendering)
- [ ] User with maximum content/activity (long lists, many items)
- [ ] User with partial data (profile 50% complete, half-filled lists)
- [ ] Content with very long strings (names, descriptions, titles)
- [ ] Content with very short or single-character strings
- [ ] Content with special characters in user-generated fields

### Timing and Concurrency Edge Cases

- [ ] Rapid screen navigation (tapping before transitions complete)
- [ ] Double-tap on action buttons
- [ ] Simultaneous network requests completing out of order (race condition check)
- [ ] Pull-to-refresh during an already-in-flight request
- [ ] Backgrounding the app during a network request and foregrounding before it completes

### Regional and System Setting Edge Cases

- [ ] 12-hour vs. 24-hour time format (System Settings > General > Date & Time)
- [ ] Non-English system language (does the app handle system strings correctly?)
- [ ] Large system font size (see Accessibility > Dynamic Type)
- [ ] High contrast mode
- [ ] Right-to-left locale (verify it does not catastrophically break if not explicitly supported)

---

## 15. Push Notification Testing

- [ ] Notifications are received when the app is in the foreground
- [ ] Notifications are received when the app is in the background
- [ ] Notifications are received when the app is fully closed
- [ ] Notifications do not arrive in Do Not Disturb mode (unless configured as Critical)
- [ ] Tapping a notification when app is backgrounded opens the correct screen
- [ ] Tapping a notification when app is closed cold-launches and routes to the correct screen
- [ ] Notification content is accurate and not stale
- [ ] Notification badge count is correct on the app icon
- [ ] Badge count clears correctly when relevant content is viewed
- [ ] Notifications respect timezone (time-sensitive notifications appear at the correct time)
- [ ] Notification permission denial is handled gracefully (app works without notifications)
- [ ] In-app notification preferences (if they exist) are respected

---

## 16. Localization Testing

- [ ] All user-facing strings are externalized (no hardcoded English strings if localization is planned)
- [ ] All strings display correctly with the longest expected translation
- [ ] Date formats adapt to locale (MM/DD/YYYY vs. DD/MM/YYYY vs. YYYY-MM-DD)
- [ ] Time formats adapt to locale (12h vs. 24h)
- [ ] Currency symbols and formatting are locale-correct
- [ ] Number formatting (1,000.00 vs. 1.000,00) is locale-correct
- [ ] No text overflow from longer translated strings
- [ ] No culturally insensitive imagery, colors, or metaphors
- [ ] RTL layouts are tested if any RTL language is supported

---

## 17. React Native / Expo-Specific Testing

### JavaScript / Native Bridge

- [ ] No JS bundle crashes on startup (test in both debug and release builds — they behave differently)
- [ ] Release build (not debug/Metro) is used for all final QA — Hermes optimization can expose bugs not seen in debug
- [ ] No "Unhandled promise rejection" warnings in logs
- [ ] No "VirtualizedList: You have a large list that is slow to update" warnings in production list components
- [ ] No native module calls failing silently in production

### Expo-Specific

- [ ] EAS Build produces a clean build without warnings about deprecated APIs
- [ ] `app.json` permissions are correct and minimal (only what is actually used)
- [ ] `app.json` `bundleIdentifier` and version/build numbers are correct for submission
- [ ] OTA update behavior (if using Expo Updates): update downloads, applies on next cold launch
- [ ] Expo Updates fallback works correctly if update download fails
- [ ] All native modules are compatible with the Expo SDK version in use
- [ ] Production build tested with `expo build` / EAS Build (not Metro dev server)

### AsyncStorage / State Persistence

- [ ] AsyncStorage reads do not cause blank screen on launch (loading state handles the async gap)
- [ ] AsyncStorage data from a previous session does not cause incorrect behavior after update
- [ ] Stale/invalid cached data is detected and cleared without crash
- [ ] Navigation state persistence (if enabled) does not route users to invalid screens after update

### React Navigation

- [ ] Deep links route to the correct screen with the correct params
- [ ] Deep links do not bypass authentication (unauthenticated users are redirected to login)
- [ ] Back navigation stack is correct after deep link entry
- [ ] Modal presentation and dismissal does not leave orphaned screens in the stack
- [ ] Tab navigation persists state correctly (navigating away and back does not reset the tab)

### NativeWind / Styling

- [ ] Tailwind class changes take effect correctly in production builds
- [ ] No style conflicts between NativeWind and StyleSheet styles
- [ ] Custom font classes (`font-bold`, `font-semibold`) resolve to correct native font families on both debug and release builds
- [ ] No layout regression between debug and release builds caused by styling differences

---

## 18. Apple App Store Review Guidelines Reference

Apple reviews all apps against five categories. These are the most testing-relevant requirements extracted from the official guidelines.

### Category 1: Safety

**1.2 User-Generated Content**
If users can post content, you must implement:
- Method for filtering objectionable material
- Mechanism to report offensive content
- Ability to block abusive users
- Published contact information for support

**1.2.1 Creator Content**
Apps featuring creator-generated content must:
- Moderate content per Guideline 1.2
- Provide a way for users to identify content exceeding the app's age rating
- Use an age restriction mechanism for underage users

### Category 2: Performance

**2.1 App Completeness**
- App must not crash or exhibit obvious technical problems
- No placeholder text, temporary content, or incomplete features
- Test on-device before submission
- Demo account credentials must be included in App Review Notes if login is required
- All backend services must be active during review (do not block Apple's IP ranges)

**2.3 Accurate Metadata**
- Screenshots must show the app's actual UI in use, not concept art or marketing imagery
- App description must accurately describe what reviewers will find in the app
- "What's New" text must specifically describe the changes in the current version
- App name limited to 30 characters; no pricing in name or subtitle
- Category must be appropriate to the app's primary function
- Age rating questions must be answered honestly

**2.4 Hardware Compatibility**
- App must not drain battery abnormally or generate excessive heat
- iPhone apps must run on iPad (or explicitly declare iPad-incompatibility)
- App must function on IPv6-only networks

**2.5 Software Requirements**
- Only public Apple APIs may be used
- App must be fully functional on IPv6-only networks
- Background modes must be used only for their declared purpose
- Push notifications must not be required for core functionality

### Category 3: Business

**3.1.1 In-App Purchase**
- All purchases of digital goods/features must use Apple's IAP
- Apps cannot use alternate mechanisms (license keys, QR codes, external payment links, cryptocurrency) for digital goods
- Credits/in-game currencies cannot expire
- "Restore Purchases" button required for all non-consumable and subscription products
- Loot box / randomized reward odds must be disclosed before purchase

**3.1.2 Subscriptions**
- Must provide ongoing value; minimum 7-day duration
- Cannot take away primary functionality from existing paid customers
- Auto-renewal terms must be clearly disclosed before purchase
- Free trial periods available via App Store Connect

### Category 4: Design

**4.2 Minimum Functionality**
- App must provide value beyond a repackaged website
- All features listed in metadata must be present and functional

**4.8 Login Services**
- If using third-party login (Google, Facebook), Sign in with Apple must also be offered
- Exception: apps that are clients for a specific third-party service (e.g., a dedicated social media client)

### Category 5: Legal

**5.1.1 Privacy Policy**
- Privacy policy URL must be set in App Store Connect metadata
- Privacy policy must also be accessible within the app itself
- Policy must describe: what data is collected, how it is used, third-party sharing, retention, and deletion

**5.1.1(v) Account Sign-In and Deletion**
- Do not require login unless the app has account-based features that require it
- Account deletion must be available as a self-service action within the app (email-only deletion is not accepted)
- Deleting an account must actually delete the user's data, not just deactivate it

**5.1.2 Data Use and Sharing**
- App Privacy Nutrition Labels in App Store Connect must be accurate and complete
- App Tracking Transparency prompt required before tracking user across apps/websites
- Purpose strings in `Info.plist` must accurately reflect actual data use
- Explicit disclosure required if personal data is shared with third-party AI; user consent must be obtained beforehand (2025 rule)

**5.1.5 Location Services**
- Use Location Services only when directly relevant
- Notify and obtain consent before collecting/transmitting/using location data
- Explain purpose in the permission prompt

---

## 19. Common App Store Rejection Reasons

Based on Apple's published statistics: Apple rejected approximately 1,931,400 submissions in 2024 — nearly 25% of all apps reviewed.

### #1: Guideline 2.1 — Performance: App Completeness (~40%+ of rejections)

**What causes it:**
- App crashes during review
- Features listed in metadata are missing or non-functional
- Broken flows or dead ends in navigation
- Demo account credentials not provided (reviewer could not log in)
- Backend service was down or blocking reviewer access
- Placeholder content visible in the app

**Fix:** Test on a physical device in release mode. Run a complete "reviewer run" — clean install, all core flows, login/logout. Provide working credentials in App Review Notes.

### #2: Guideline 2.3 — Accurate Metadata

**What causes it:**
- Screenshots show UI that does not match the app's current design
- Description claims features that are not present or require additional steps
- Misleading or unverifiable claims in the description

**Fix:** Update screenshots for every major UI change. Review the description against the actual app before every submission.

### #3: Guideline 3.1.1 — In-App Purchase

**What causes it:**
- App allows purchase of digital goods outside of IAP
- Subscription "Restore Purchases" button missing
- Loot box / randomized reward odds not disclosed before purchase
- In-app currency purchasable with real money but no IAP system used

**Fix:** Route all digital purchases through StoreKit IAP. Add a "Restore Purchases" button for all non-consumable and subscription products.

### #4: Guideline 5.1.1 — Privacy

**What causes it:**
- Privacy policy missing from App Store Connect metadata or not accessible within the app
- Permission strings vague or do not explain actual use
- Data collection exceeds what is described in the privacy policy
- Account deletion not available within the app

**Fix:** Include privacy policy in both App Store Connect and in-app. Write clear, specific NSUsageDescription strings. Add in-app account deletion.

### #5: Design Quality (Guideline 4.x)

**What causes it:**
- Obvious spelling errors, broken layout, or unpolished UI
- App looks unfinished or prototype-quality
- Inconsistent fonts, off-brand colors, misaligned elements

**Fix:** Follow Apple Human Interface Guidelines. Test UI on all target device sizes. Have a non-developer do a complete walkthrough.

### #6: Privacy Violations — New 2025/2026 Rules

**What causes it:**
- Failure to disclose AI / third-party data sharing
- Missing user consent before transmitting personal data to AI services
- Missing age verification mechanism for content exceeding the app's age rating

**Fix:** Disclose all third-party data sharing (including AI) in privacy policy and App Privacy labels. Obtain explicit user consent before sending data to AI services.

### #7: Missing or Broken Functionality

**What causes it:**
- Features requiring subscriptions are not accessible to reviewer
- Features requiring specific setup steps not documented in App Review Notes
- Region-locked content with no indication in review notes

**Fix:** In App Review Notes, document any non-obvious access paths, special setup requirements, and demo credentials.

### Pre-Submission "Reviewer Run" Protocol

Execute this on a clean physical device before every App Store submission:

1. Delete the existing install
2. Install the build fresh
3. Complete the entire onboarding flow
4. Log in with demo credentials (or credentials in App Review Notes)
5. Exercise every core feature flow listed in the app description
6. Test "Restore Purchases" if IAP is present
7. Locate and confirm the privacy policy is accessible from within the app
8. Locate and confirm account deletion is available within the app
9. Log out and confirm the session is cleared
10. Verify no placeholder text appears anywhere

---

## 20. Pre-Submission Checklist

### Build Verification

- [ ] Build is a release build (not development/debug)
- [ ] Bundle identifier is correct for production
- [ ] Version number and build number are correct and incremented from last submission
- [ ] No debug flags, logging, or test credentials embedded in release build
- [ ] Minimum iOS deployment target is set correctly
- [ ] Supported device families are set correctly in `app.json`
- [ ] Production build tested with `expo build` / EAS Build (not Metro dev server)

### Metadata

- [ ] App name is correct (max 30 characters)
- [ ] Subtitle is correct (max 30 characters)
- [ ] Description accurately reflects current features
- [ ] Keywords are relevant and within 100-character limit
- [ ] "What's New" text describes the specific changes in this version
- [ ] Screenshots are up to date and show the actual current UI on all required device sizes
- [ ] App preview video (if provided) shows actual app functionality
- [ ] Category is correct
- [ ] Age rating is answered honestly
- [ ] Privacy policy URL is set and resolves to the current policy
- [ ] Support URL is set and valid

### App Review Information

- [ ] Demo account credentials are provided (login email/password or OTP-triggerable account)
- [ ] Demo credentials are confirmed to work on a clean device
- [ ] App Review Notes explain any non-obvious features, region-locked content, or special setup
- [ ] Backend services are live and accessible (not behind IP restrictions that block Apple)
- [ ] Any hardware requirements are noted

### Legal and Privacy

- [ ] App Privacy Nutrition Labels are filled in accurately in App Store Connect
- [ ] Privacy policy is linked from within the app (accessible without login if possible)
- [ ] Account deletion feature is in the app and works
- [ ] All third-party data sharing is disclosed in privacy policy
- [ ] Sign in with Apple is offered if any third-party login (Google, Facebook) is offered

---

## 21. Release Readiness Criteria

A build is ready for App Store submission when all of the following are true:

**Stability**
- Crash-free rate > 99.5% across TestFlight internal testing sessions
- Zero P1 (app-crashing or data-loss) bugs open
- Zero regression bugs in core flows from the previous release

**Functional Coverage**
- All new features have been tested end-to-end on at least two physical devices
- All modified flows have passed regression testing
- All edge cases documented in this checklist have been verified for affected areas

**App Store Readiness**
- "Reviewer run" completed successfully on a clean physical device
- All App Store metadata reviewed and up to date
- Demo credentials verified and documented in App Review Notes
- Privacy policy current and linked correctly

**Performance**
- Cold launch < 2 seconds on target device tier
- No memory warnings during 30-minute standard use session
- No ANR (Application Not Responding) events during testing

**Accessibility**
- VoiceOver walk-through of all primary flows completed without broken announcements
- Dynamic Type tested at max size setting without layout breakage
- Touch targets verified at 44×44pt minimum for all interactive elements

---

## 22. Sources

Research conducted March 2026. All sources accessed directly.

### Official Documentation

- [App Store Review Guidelines — Apple Developer](https://developer.apple.com/app-store/review/guidelines/) — Full official guidelines, all five categories and sub-guidelines
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/) — Touch target sizing, VoiceOver, accessibility design
- [Testing — React Native Official Docs](https://reactnative.dev/docs/testing-overview)

### Mobile QA Methodology

- [Mobile App Testing Checklist: Essential Tips for 2025 — NextNative](https://nextnative.dev/blog/mobile-app-testing-checklist)
- [Mobile App QA Guide: A Full Testing Checklist — Perpetio](https://perpet.io/blog/mobile-app-qa-guide-tips-checklist-and/)
- [Mobile App Testing Checklist for Devs & QAs — TestGrid](https://testgrid.io/blog/mobile-app-testing-checklist/)
- [12 Critical Mobile App Testing Scenarios Every QA Team Should Use — TestEvolve](https://www.testevolve.com/blog/critical-mobile-app-testing-scenarios-every-qa-team-should-use)
- [The Only Mobile App Testing Checklist You Need — Mobot](https://www.mobot.io/blog/mobile-app-testing-the-only-checklist-you-need)
- [Mobile App Testing Checklist: 183 Points — SpaceO Technologies](https://www.spaceotechnologies.com/templates/mobile-app-testing-checklist/)
- [Mobile App Testing Strategy: The Ultimate 9-Step Checklist — Testlio](https://testlio.com/blog/mobile-app-testing-strategy/)
- [Mobile App Quality Assurance Checklist for 2025 — Ailoitte](https://www.ailoitte.com/blog/mobile-app-quality-assurance-checklist/)
- [20 QA Best Practices to Broaden Testing Strategy in 2025 — BrowserStack](https://www.browserstack.com/guide/qa-best-practices)

### App Store Rejection and Review

- [App Store Review Guidelines (2025): Checklist + Top Rejection Reasons — NextNative](https://nextnative.dev/blog/app-store-review-guidelines)
- [Apple App Store Rejection Reasons In 2025 (And Fixes) — Twinr](https://twinr.dev/blogs/apple-app-store-rejection-reasons-2025/)
- [App Store Review Checklist for 2025 — AppInstitute](https://appinstitute.com/app-store-review-checklist/)
- [iOS App Store Review Guidelines 2026 — The App Launchpad](https://theapplaunchpad.com/blog/app-store-review-guidelines)
- [App Store Rejection: Top 20 Reasons & How to Avoid Them — Mindster](https://mindster.com/mindster-blogs/app-store-rejection-reasons/)

### Performance Testing

- [Mobile App Performance Testing: Checklist, Tools & Best Practices — BrowserStack](https://www.browserstack.com/guide/mobile-app-performance-testing-checklist)
- [Top iOS App Performance Testing Tools in 2025 — BrowserStack](https://www.browserstack.com/guide/ios-app-performance-testing-tools)
- [Key Metrics To Measure Mobile App Performance in 2025 — Survicate](https://survicate.com/blog/app-performance/)

### Network and Error Handling

- [How to Test Mobile Apps in Offline Mode — BrowserStack](https://www.browserstack.com/guide/test-mobile-apps-in-offline-mode)
- [Error Handling in Mobile Apps: Best Practices — Maestro](https://maestro.dev/insights/error-handling-mobile-apps-best-practices)
- [Mobile Network Testing: 5G Simulation, Poor Networks & Offline Mode](https://inadeem.me/blogs/how_to_do_mobile_network_testing__5g_simulation/)

### Authentication and Security

- [Testing Login & Authentication Flows, Edge Cases People Forget — Frugal Testing](https://www.frugaltesting.com/blog/testing-login-authentication-flows-edge-cases-people-forget)
- [Mobile App Authentication Architectures — OWASP MASTG](https://mas.owasp.org/MASTG/0x04e-Testing-Authentication-and-Session-Management/)
- [Authenticated Mobile App Security Testing Finds 78% More Sensitive Data Risk — NowSecure (2026)](https://www.nowsecure.com/blog/2026/02/25/authenticated-mobile-app-security-testing-finds-78-more-sensitive-data-risk/)
- [Mobile App Security Testing: Best Practices & Tools — Quash](https://quashbugs.com/blog/mobile-app-security-testing)

### Accessibility

- [Mobile Accessibility Testing Checklist for Native & Web Apps (2025 Edition) — A11Y Pros](https://a11ypros.com/blog/mobile-accessibility-testing-checklist-2025-edition)
- [Accessibility Testing for Mobile Apps: A 2025 Guide — AudioEye](https://www.audioeye.com/post/accessibility-testing-for-mobile-apps/)
- [The Ultimate Mobile Accessibility Checklist For Android And iOS — Requestly](https://requestly.com/blog/mobile-accessibility-checklist/)
- [Testing the accessibility of an iOS application — Orange Digital Accessibility](https://a11y-guidelines.orange.com/en/articles/how-to-test-ios/)
- [Mobile Accessibility Testing — BrowserStack](https://www.browserstack.com/guide/accessibility-testing-for-mobile-apps)

### Permissions

- [How to Test Permissions on iOS — Mobot](https://www.mobot.io/blog/how-to-test-permissions-on-ios)
- [Guide to Permission Testing — Devzery](https://www.devzery.com/post/guide-to-permission-testing-handling-app-permissions)
- [Mobile Permission Requests: Timing, Strategy & Compliance — Dogtown Media](https://www.dogtownmedia.com/the-ask-when-and-how-to-request-mobile-app-permissions-camera-location-contacts/)

### React Native / Expo

- [What Are The Best React Native Testing Strategies In 2025? — Solution Squares](https://solutionsquares.com/react-native-testing-strategies/)
- [An Engineer's Guide to Automated Testing: React Native Apps — Povio](https://povio.com/blog/an-engineers-guide-to-automated-testing-react-native-apps/)
- [React Native Automation: Setup Guide — Maestro](https://maestro.dev/insights/react-native-automation-setup-guide)

### Regression and Edge Cases

- [Guide to Automated Mobile App E2E Regression Testing — QA Wolf](https://www.qawolf.com/guides/guide-to-automated-mobile-app-e2e-regression-testing)
- [Edge Case Testing Explained — Virtuoso QA](https://www.virtuosoqa.com/post/edge-case-testing)
- [Mobile App Testing Checklist: 25 Real-World Tests Before You Ship — Tech In Deep](https://www.techindeep.com/mobile-app-testing-checklist-75936)

### UX and Usability

- [How to Conduct a Heuristic Evaluation — Nielsen Norman Group](https://www.nngroup.com/articles/how-to-conduct-a-heuristic-evaluation/)
- [Step-by-Step UX Testing Checklist for Mobile & Web Apps — Frugal Testing](https://www.frugaltesting.com/blog/step-by-step-ux-testing-checklist-for-mobile-web-apps)
- [Mobile App Usability Testing — Userbrain](https://www.userbrain.com/blog/mobile-app-usability-testing-checklist/)
- [Dating App QA Challenges — Ubertesters](https://ubertesters.com/blog/dating-app-glitches-kill-matches-functional-ux-and-performance-challenges/)
