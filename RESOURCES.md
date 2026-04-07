# Bridge — Design & Product Resources

> **Quick reference for agents:** Jump to the section that matches your task.
>
> | If you're working on... | Read |
> |-------------------------|------|
> | Screens, layouts, components | [UI/UX Design](#uiux-design) |
> | First-run experience | [Onboarding & First-Time UX](#onboarding--first-time-ux) |
> | Icons, visual assets | [Icon Design & Visual Language](#icon-design--visual-language) |
> | Shadows, elevation, depth | [Shadow, Depth & Elevation](#shadow-depth--elevation) |
> | Animations, transitions, haptics | [Animation, Motion & Haptics](#animation-motion--haptics) |
> | Streaks, karma, notifications, engagement | [Gamification & Engagement](#gamification--engagement) |
> | Product decisions, matching model | [Building Dating Apps](#building-dating-apps) |
> | Network effects, growth, virality | [Building Social Apps](#building-social-apps) |
> | Retention, churn, metrics | [Retention & Growth](#retention--growth) |
> | Invite copy, referral flow | [Referral & Invite Psychology](#referral--invite-psychology) |
> | Rice beta, campus rollout | [Campus Launch & College Market](#campus-launch--college-market) |
> | Moderation, safety, trust | [Community, Trust & Safety](#community-trust--safety) |
> | RN performance, Expo, optimization | [React Native, Expo & Performance](#react-native-expo--performance) — JS thread, memory leaks, FlatList, images, bundle size |
> | Supabase, edge functions, infra | [Backend & Infrastructure](#backend--infrastructure) |
> | Local dev, env switching, staging | [Local Development & Environment Switching](#local-development--environment-switching) — physical device testing, feature flags, OTA rollouts |
> | Jest, E2E, pgTAP | [Testing](#testing) |
> | App Store submission, ASO | [App Store & Distribution](#app-store--distribution) |

---

## UI/UX Design

- [Laws of UX](https://lawsofux.com/) — Key principles (Fitts's Law, Hick's Law, etc.) with visual examples
- [Refactoring UI](https://www.refactoringui.com/) — Practical design tips from the Tailwind CSS creators
- [Nielsen Norman Group](https://www.nngroup.com/articles/) — Gold standard for usability research and UX guidelines
- [Mobbin](https://mobbin.com/) — Real-world mobile UI patterns from top apps (searchable by flow/screen type)
- [UI Patterns](https://ui-patterns.com/) — Common interaction patterns with pros/cons
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/) — iOS-specific design principles (essential for Bridge's iOS-first approach)
- [Material Design 3](https://m3.material.io/) — Google's design system — useful for component patterns even on iOS
- [Checklist Design](https://www.checklist.design/) — Best practices checklists for common UI components
- [Little Big Details](https://littlebigdetails.com/) — Micro-interaction inspiration from real products
- [Pttrns](https://www.pttrns.com/) — Mobile design patterns organized by user flow
- [Mobile App UX Best Practices (Baymard Institute)](https://baymard.com/blog/mobile-ux) — Research-backed mobile UX findings across 400+ studies

## Onboarding & First-Time UX

- [Appcues — Mobile Onboarding Guide](https://www.appcues.com/blog/essential-guide-mobile-user-onboarding-ui-ux) — Onboarding UI/UX patterns: welcome screens, tooltips, checklists, getting users to the "aha moment"
- [How the Biggest Consumer Apps Got Their First 1,000 Users (Lenny's Newsletter)](https://www.lennysnewsletter.com/p/how-the-biggest-consumer-apps-got) — Seven strategies major consumer apps (Tinder, Uber, Dropbox) used for early traction

## Icon Design & Visual Language

- [Eva Icons Official](https://akveo.github.io/eva-icons/) — Bridge's primary icon set — open-source with outline and fill variants
- [SF Symbols (Apple)](https://developer.apple.com/sf-symbols/) — Apple's official 5,000+ symbol library for iOS/macOS
- [UseAnimations (Lottie)](https://useanimations.com/) — Animated micro-interaction icons for loading states, toggles, feedback
- [Solid vs. Outline Icons (UX Movement)](https://uxmovement.com/mobile/solid-vs-outline-icons-which-are-faster-to-recognize/) — Research: outline for edge features, solid for silhouettes. Never mix styles.
- [Icon Usability (Nielsen Norman Group)](https://www.nngroup.com/articles/icon-usability/) — Icons + labels dramatically outperform icons alone

## Shadow, Depth & Elevation

- [Material Design 3 — Elevation](https://m3.material.io/styles/elevation/overview) — Tonal color + shadow, 5 levels, dark mode depth via surface tint
- [iOS Shadow Design Patterns (Medium)](https://medium.com/lookup-design/a-guide-to-shadows-in-ios-d2e0f537a2e5) — shadowColor warmth, offset direction, opacity ranges, layered shadows
- [Designing Depth in UI (UX Collective)](https://uxdesign.cc/the-ultimate-guide-to-shadows-in-ui-design-8e0d0b17b6a7) — Shadow psychology, depth hierarchy, ambient vs key shadows, dark mode
- [React Native Shadow Props (Official)](https://reactnative.dev/docs/shadow-props) — iOS shadowColor/Offset/Opacity/Radius, Android elevation limitations

## Animation, Motion & Haptics

### Design Patterns & Inspiration

- [Mobile App Animations Guide (Justinmind)](https://www.justinmind.com/ui-design/mobile-app-animations) — Animation types: micro-interactions, transitions, loading, gestural feedback, state changes, onboarding
- [Mobile-First Animation: Finding the Sweet Spot (Medium)](https://medium.com/@Alekseidesign/mobile-first-animation-finding-the-sweet-spot-0ca99999b1e1) — Duration sweet spots, performance tips, easing function recommendations
- [Mobile UI Animations: Types & Best Practices (SVGator)](https://www.svgator.com/blog/what-are-mobile-ui-animations/) — Timing: micro-interactions (100-200ms), transitions (250-350ms), emphasis (400-600ms). Accessibility with "Reduce Motion"
- [7 Rules for Mobile UI Button Design (UX Planet)](https://uxplanet.org/7-rules-for-mobile-ui-button-design-e9cf2ea54556) — 44pt touch targets, visual feedback (scale, color, haptics), states, micro-interactions
- [Transition Animations: A Practical Guide (UX Design)](https://uxdesign.cc/transition-animations-a-practical-guide-5dba4d42f659) — Slide vs fade vs scale, entrance/exit patterns, staggered reveals, easing curves
- [Apple WWDC23 — Animate with Springs](https://developer.apple.com/videos/play/wwdc2023/10158/) — Apple's definitive guide to spring animations in native apps
- [Apple HIG — Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons) — Visual feedback on press, spring animations, accessibility
- [Duolingo Streak Animation Engineering](https://blog.duolingo.com/how-we-built-streaks/) — Technical deep dive into streak system and animations
- [Duolingo Micro-Interactions (Mobbin)](https://mobbin.com/apps/duolingo) — Frame-by-frame analysis of celebration and feedback animations
- [Duolingo Gamification Secrets (Product School)](https://productschool.com/blog/strategy/duolingo-gamification) — Motion reinforcing habit loops
- [Hinge Design Deep Dive](https://gregorydocherty.substack.com/p/shag-marry-kill-part-1-hinge-design) — Hinge's visual design system, interaction patterns, iconography
- [Bumble Design Deep Dive](https://gregorydocherty.substack.com/p/shag-marry-kill-part-2-bumble-design) — Bumble's design language, animation style, brand consistency

### React Native Animation Tools

- [Reanimated Documentation](https://docs.swmansion.com/react-native-reanimated/) — Shared values, worklets, layout animations
- [Reanimated Performance Best Practices](https://docs.swmansion.com/react-native-reanimated/docs/guides/best-practices) — UI thread animation, avoiding JS bridge
- [withSpring API Reference](https://docs.swmansion.com/react-native-reanimated/docs/animations/withSpring) — Spring config: damping, stiffness, mass, velocity — used for press interactions
- [Reanimated Accessibility (useReducedMotion)](https://docs.swmansion.com/react-native-reanimated/docs/device/useReducedMotion) — Respecting system reduced motion preferences
- [React Native Gesture Handler](https://docs.swmansion.com/react-native-gesture-handler/docs/) — Pan, Tap, Pinch, Fling gesture handling with Reanimated integration
- [expo-haptics Documentation](https://docs.expo.dev/versions/latest/sdk/haptics/) — Haptic feedback API for iOS and Android

### Haptics & Accessibility

- [Apple HIG — Playing Haptics](https://developer.apple.com/design/human-interface-guidelines/playing-haptics) — Haptic feedback design patterns
- [React Native AccessibilityInfo](https://reactnative.dev/docs/accessibilityinfo) — Screen reader, reduced motion, accessibility preference detection
- [Building Accessible Animations (Medium)](https://medium.com/accessibility-in-ux/accessible-animations-in-react-native-are-easier-than-you-think-4479e6a02e3e) — Graceful animation degradation patterns

## Gamification & Engagement

### Psychology & Habit Formation

- [Nir Eyal — Hooked: How to Build Habit-Forming Products](https://www.nirandfar.com/hooked/) — The Hook Model (Trigger → Action → Variable Reward → Investment) — foundational for Bridge's karma/streak loops
- [Amplitude — The Hook Model Guide](https://amplitude.com/blog/hook-model) — Practical guide to implementing the Hook Model
- [UND — Addictive App Design Research](https://commons.und.edu/theses/2584/) — Academic research on psychological mechanisms in app engagement
- [Variable Reinforcement in Digital Interfaces (PMC)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6502660/) — Variable reward schedules driving engagement (slot machine effect)

### Notifications & Push Strategy

- [Push Notification Best Practices (Braze)](https://www.braze.com/resources/articles/push-notifications-best-practices) — Opt-in strategy, personalization, timing, frequency — critical for Bridge's vote reminders and match alerts
- [Push Notification Psychology (Braze)](https://www.braze.com/resources/articles/the-psychology-behind-push-notifications) — Behavioral science behind notification timing and variable reinforcement
- [Hinge + Braze Case Study](https://www.braze.com/customers/hinge) — How Hinge uses multi-channel engagement to drive meaningful connections

### Gamification Patterns

- [Gamification of Social Apps](https://thetechtrends.tech/gamification-of-social-apps/) — Streaks, karma systems, badges, dopamine loops, loss aversion — directly relevant to Bridge

## Matchmaking & Compatibility Research

- [Similarity-Attraction Effect Meta-Analysis (Montoya & Horton, 2013)](https://psycnet.apa.org/record/2012-33628-001) — Most comprehensive meta-analysis of similarity-attraction. Attitude/value similarity has strongest effect (r=0.40-0.50). Validates weighting interests and values heavily in scoring.
- [Jaccard Index vs Overlap Coefficient (Wikipedia)](https://en.wikipedia.org/wiki/Jaccard_index) — Set similarity metrics. Bridge switched from overlap coefficient to modified Jaccard for interests/values scoring to fix small-set inflation bias.

## Building Dating Apps

- [Hinge — Designed to Be Deleted](https://hinge.co/press) — Hinge's product philosophy, press releases, and research
- [Logan Ury — How Not to Die Alone](https://www.loganury.com/) — Behavioral science applied to dating (Hinge's Director of Relationship Science)
- [Choice Overload in Dating (Psychology Today)](https://www.psychologytoday.com/us/blog/romantically-attached/202410/too-many-fish-in-the-sea-choice-overload-in-dating) — Excessive options create decision paralysis — validates Bridge's single-proposal model

## Building Social Apps

- [The Cold Start Problem — Andrew Chen](https://www.coldstart.com/) — Starting and scaling network effects — directly relevant to Bridge's campus launch
- [NFX — Network Effects Bible](https://www.nfx.com/post/network-effects-bible/) — Comprehensive guide to 16 types of network effects
- [Reforge — Growth Loops](https://www.reforge.com/blog/growth-loops) — Why loops beat funnels — the canonical growth loops framework

## Retention & Growth

- [What is Good Retention (Lenny's Newsletter)](https://www.lennysnewsletter.com/p/what-is-good-retention-issue-29) — Retention benchmarks by app category
- [Amplitude — Mastering Retention](https://amplitude.com/mastering-retention) — Free playbook on measuring and improving retention

## Referral & Invite Psychology

- [Referral Marketing Psychology (ReferralCandy)](https://www.referralcandy.com/blog/referral-marketing-psychology) — Social currency, reciprocity, curiosity gap — directly applicable to Bridge's SMS invite copy
- [The Psychology of Sharing (NYT Customer Insight Group)](https://www.iab.com/wp-content/uploads/2015/07/POSWhitePaper.pdf) — Why people share: self-expression, relationship nurturing, social currency
- [Dropbox Referral Program Case Study (Viral Loops)](https://viral-loops.com/blog/dropbox-referral-program) — Two-sided referral grew signups 60% — patterns for incentive-free referral
- [SMS Marketing Best Practices (Twilio)](https://www.twilio.com/blog/sms-marketing-best-practices) — 160-char limit, personalization, CTA placement — critical for Bridge's SMS invite flow

## Community, Trust & Safety

- [Designing for Trust (Joe Gebbia / Airbnb, TED)](https://www.ted.com/talks/joe_gebbia_how_airbnb_designs_for_trust) — How design overcomes stranger-danger bias
- [Dating App Safety & Chat Moderation (Stream)](https://getstream.io/blog/dating-app-safety/) — Content filtering, keyword detection, ML threat detection

## React Native, Expo & Performance

### Core References

- [React Native Performance (Official)](https://reactnative.dev/docs/performance) — 60 FPS targets, JS/UI thread profiling, FlatList optimization, `useNativeDriver`
- [React Native Optimization (Callstack)](https://www.callstack.com/ebooks/the-ultimate-guide-to-react-native-optimization) — Comprehensive ebook from the leading RN consultancy
- [Expo — Dev vs Production Mode](https://docs.expo.dev/workflow/development-mode/) — Always profile in release builds; dev mode is 10–20× slower
- [Expo — Asset Optimization](https://docs.expo.dev/eas-update/optimize-assets/) — Image compression and asset optimization for EAS Update
- [Hidden Performance Killers in React Native (Medium)](https://medium.com/@nomanakram1999/the-hidden-performance-killers-in-react-native-apps-and-how-i-fixed-them-in-production-f7877268b861) — Production case studies: memory leaks, re-renders, heavy useEffects
- [Why Your Mobile App Is Slow (TopDevs)](https://topdevs.org/blog/why-your-mobile-app-is-slow-and-how-to-fix-it-topdevs-blog) — Root causes by category: network, UI rendering, memory, background processes
- [Why Apps Run Slowly and How to Fix It (Glance)](https://thisisglance.com/learning-centre/why-is-my-app-running-slowly-and-how-do-i-fix-it) — 1-second delay = 16% drop in satisfaction; image compression, caching, thread blocking overview

### JS Thread / InteractionManager

- [Overcoming Single-Threaded Limitations (LogRocket)](https://blog.logrocket.com/overcoming-single-threaded-limitations-in-react-native/) — `InteractionManager.runAfterInteractions`, background threads, batching patterns — essential for navigation transitions
- [React Native — When JS Is Too Busy (DEV)](https://dev.to/matteoboschi/react-native-when-js-is-too-busy-5fhn) — Diagnosing JS thread saturation, yielding with `setTimeout(fn, 0)`, breaking loops into chunks

### Memory Leaks

- [React Native Memory Leak Fixes (instamobile)](https://instamobile.io/blog/react-native-memory-leak-fixes/) — Flipper heap snapshots, Hermes profiling, component-level fixes
- [Memory Leaks: How to Find and Fix (DEV Community)](https://dev.to/rushilbhuptani/react-native-memory-leaks-how-to-find-and-fix-your-apps-biggest-performance-issue-1pak) — `useEffect` cleanup patterns, `setState` after unmount, FlatList virtualization
- Key patterns: always return cleanup from `useEffect`, cancel async operations with a mounted ref, remove Supabase realtime channels on unmount

### List Performance (FlatList / ScrollView)

- [Optimizing FlatList Configuration (Official)](https://reactnative.dev/docs/optimizing-flatlist-configuration) — `getItemLayout`, `removeClippedSubviews`, `initialNumToRender`, `maxToRenderPerBatch`, `windowSize`
- [Guide to Optimizing FlatLists (obytes)](https://www.obytes.com/blog/a-guide-to-optimizing-flatlists-in-react-native) — Practical guide including FlashList migration; `React.memo` on item components reduces re-renders 40–70%
- [Large List Optimization Techniques (Medium)](https://gabrielvrl.medium.com/large-list-optimization-techniques-with-flatlist-in-react-native-ab7c651746a5) — `keyExtractor` with stable IDs, cell recycling, batch rendering tuning
- [FlashList by Shopify](https://github.com/shopify/flash-list) — Drop-in FlatList replacement; recycles cell components like RecyclerView. `npx expo install @shopify/flash-list`

### Image Optimization

- [expo-image Documentation](https://docs.expo.dev/versions/latest/sdk/image/) — `cachePolicy`, `priority`, BlurHash/ThumbHash placeholders, WebP format support
- [React Native Image Optimization Essentials (Medium)](https://medium.com/@engin.bolat/react-native-image-optimization-performance-essentials-9e8ce6a1193e) — Resize to display dimensions before delivery, WebP (25–35% smaller than JPEG), memory vs disk caching
- Key: `cachePolicy="memory-disk"` → RAM first (sub-ms) → disk → network. `priority="high"` on above-the-fold images. `backgroundColor` in style eliminates white flash before load.

### Bundle Size and Startup

- [Customizing Metro (Expo Docs)](https://docs.expo.dev/guides/customizing-metro/) — Tree shaking, platform shaking (~8% size reduction), `resolver.sourceExts`
- [Optimize React Native JS Bundle (Callstack)](https://www.callstack.com/blog/optimize-react-native-apps-javascript-bundle) — Barrel import cost, dead code elimination, `npx react-native-bundle-visualizer`
- Hermes (`"jsEngine": "hermes"` in app.json) pre-compiles JS to bytecode at build time → 15–25% smaller bundle, near-zero parse time at runtime, ~50% lower peak memory
- Strip `console.log` in production: add `babel-plugin-transform-remove-console` under `env.production.plugins` in `babel.config.js`

### Accessibility

- [React Native Accessibility (Official)](https://reactnative.dev/docs/accessibility) — VoiceOver/TalkBack support, accessibility properties
- [Reanimated — useReducedMotion](https://docs.swmansion.com/react-native-reanimated/docs/device/useReducedMotion) — Respect system "Reduce Motion" preference in animations

## Backend & Infrastructure

- [Supabase Production Checklist](https://supabase.com/docs/guides/deployment/going-into-prod) — RLS, SSL enforcement, MFA, indexing, load testing, backups, rate limiting
- [Supabase Local Development Overview](https://supabase.com/docs/guides/local-development/overview) — Full local stack: Postgres, Auth, Storage, Realtime, Edge Runtime, Studio, Inbucket
- [Supabase CLI Getting Started](https://supabase.com/docs/guides/local-development/cli/getting-started) — `supabase start`, `supabase db reset`, `supabase functions serve`
- [Supabase CLI Config Reference (config.toml)](https://supabase.com/docs/guides/local-development/cli/config) — All config options for local dev (auth, storage, edge runtime, seeds, test OTPs)
- [Supabase Managing Environments](https://supabase.com/docs/guides/deployment/managing-environments) — Dev/staging/prod environment separation, linked projects, migration workflow
- [Supabase Database Migrations](https://supabase.com/docs/guides/deployment/database-migrations) — `supabase db diff`, migration files, applying to remote projects
- [Supabase Maturity Model](https://supabase.com/docs/guides/deployment/maturity-model) — Progression from hobby to enterprise: environments, CI/CD, monitoring
- [The Vibe Coder's Guide to Supabase Environments](https://supabase.com/blog/the-vibe-coders-guide-to-supabase-environments) — Practical walkthrough of local → staging → prod workflow
- [Supabase Branching](https://supabase.com/docs/guides/deployment/branching) — Git-based preview environments (creates a Supabase project per branch)
- [Supabase Edge Functions Quickstart](https://supabase.com/docs/guides/functions/quickstart) — Writing, testing, and deploying edge functions
- [Supabase Edge Functions Dev Tips](https://supabase.com/docs/guides/functions/development-tips) — Hot reload with `functions serve`, env vars, debugging
- [Troubleshooting Edge Functions Locally](https://supabase.com/docs/guides/troubleshooting/issues-serving-edge-functions-locally) — Common local dev issues and fixes
- [Managing Config and Secrets (Local)](https://supabase.com/docs/guides/local-development/managing-config) — `.env` files for edge functions, secrets injection

## Local Development & Environment Switching

### Expo Environment Variables
- [Expo Environment Variables (Official)](https://docs.expo.dev/guides/environment-variables/) — `EXPO_PUBLIC_` prefix, `.env` loading order, build-time substitution
- [Expo EAS Environment Variables](https://docs.expo.dev/eas/environment-variables/) — `eas env:create`, `eas env:pull`, per-environment secrets on EAS servers
- [Expo + Supabase Guide](https://docs.expo.dev/guides/using-supabase/) — Official integration guide for Expo with Supabase

### Physical Device Testing
- [Running Expo on Device with Local Backend](https://dev.to/katkelly/running-your-react-native-expo-app-on-a-device-with-local-backend-k8l) — Using LAN IP to connect physical device to local server
- [Expo React Native Local Network with Bonjour](https://bleepingswift.com/blog/expo-react-native-local-network-bonjour) — Network discovery for local dev servers
- [Connecting Local Supabase from Android Emulators](https://www.pranavkhandelwal.com/blog/2025/6/9/connecting-to-supabase-running-locally-from-android-emulators) — `10.0.2.2` for Android emulator, `adb reverse` for physical Android

### Multi-Environment Strategy
- [Supabase Managing Multiple Environments (DEV.to)](https://dev.to/parth24072001/supabase-managing-database-migrations-across-multiple-environments-local-staging-production-4emg) — Migration workflow across local/staging/prod
- [GitHub Discussion: Multiple Environments](https://github.com/orgs/supabase/discussions/542) — Community patterns for environment management
- [Testing Supabase Magic Login with Playwright](https://www.bekapod.dev/articles/supabase-magic-login-testing-with-playwright/) — Automated auth testing using Inbucket API

### Feature Flags & Staged Rollouts
- [Feature Toggles (Martin Fowler)](https://martinfowler.com/articles/feature-toggles.html) — Canonical reference on feature flag types, lifecycle, and best practices
- [Feature Flags for Mobile Apps (DevCycle)](https://devcycle.com/blog/how-can-mobile-teams-best-use-feature-flags) — Mobile-specific patterns: kill switches, percentage rollouts, A/B testing
- [Feature Flag Testing (LaunchDarkly)](https://launchdarkly.com/blog/testing-with-feature-flags/) — Testing strategies when using feature flags
- [Mobile Feature Flags (Statsig)](https://www.statsig.com/perspectives/mobile-feature-flags-ios-android) — iOS/Android implementation patterns and pitfalls

### OTA Updates & Staged Deployment
- [Expo EAS Update — How It Works](https://docs.expo.dev/eas-update/how-it-works/) — Channel-based OTA updates, runtime version pinning
- [Expo — Preview Updates](https://docs.expo.dev/eas-update/preview/) — Testing OTA updates before rolling out to all users
- [5 OTA Update Best Practices (Expo Blog)](https://expo.dev/blog/5-ota-update-best-practices-every-mobile-team-should-know) — Channels, rollbacks, runtime versioning
- [The Production Playbook for OTA Updates (Expo Blog)](https://expo.dev/blog/the-production-playbook-for-ota-updates) — Staged rollouts, monitoring, rollback strategies

### Industry Testing Patterns
- [Tinder's Move to Kubernetes](https://medium.com/tinder/tinders-move-to-kubernetes-cda2a6372f44) — How Tinder containerized ~200 services for testing/staging parity
- [Building Resiliency at Scale at Tinder (AWS)](https://aws.amazon.com/blogs/database/building-resiliency-at-scale-at-tinder-with-amazon-elasticache/) — Staging environment strategy at scale
- [It's Time to Kill Staging (The New Stack)](https://thenewstack.io/its-time-to-kill-staging-the-case-for-testing-in-production/) — Counterargument: testing in production with feature flags and observability

## Testing

### Unit & Component Testing

- [Expo Unit Testing Guide](https://docs.expo.dev/develop/unit-testing/) — Official Jest setup for Expo apps
- [React Native Testing Overview](https://reactnative.dev/docs/testing-overview) — Unit, component, and integration testing layers
- [Jest + React Native Testing Library Guide](https://www.creolestudios.com/react-native-testing-with-jest-and-rtl/) — Practical 2025 guide with examples
- [React Native Testing Library Repo](https://github.com/callstack/react-native-testing-library) — RNTL API docs and migration guides
- [Advanced RNTL Techniques](https://yrkan.com/blog/react-native-testing-library/) — Custom render wrappers, async testing, mocking navigation

### E2E Testing

- [Expo + Maestro E2E](https://docs.expo.dev/eas/workflows/examples/e2e-tests/) — Official guide for Maestro E2E on EAS Workflows CI
- [Detox vs Maestro](https://www.getpanto.ai/blog/detox-vs-maestro) — Detailed comparison: setup, flakiness, speed, learning curve

### Supabase Backend Testing

- [Supabase Edge Function Unit Tests](https://supabase.com/docs/guides/functions/unit-test) — Deno-based edge function testing
- [Supabase pgTAP Database Testing](https://supabase.com/docs/guides/database/testing) — Testing RLS, triggers, and functions with pgTAP
- [Advanced pgTAP Patterns](https://supabase.com/docs/guides/local-development/testing/pgtap-extended) — Multi-tenant and complex RLS test scenarios
- [supabase-test-helpers](https://github.com/usebasejump/supabase-test-helpers) — `create_supabase_user()`, `authenticate_as()`, `rls_enabled()` helpers
- [Testing RLS with pgTAP (walkthrough)](https://blair-devmode.medium.com/testing-row-level-security-rls-policies-in-postgresql-with-pgtap-a-supabase-example-b435c1852602) — INSERT/SELECT/UPDATE RLS policy testing

### Social/Dating App QA

- [Dating App QA Challenges](https://ubertesters.com/blog/dating-app-glitches-kill-matches-functional-ux-and-performance-challenges/) — Functional, UX, and performance testing strategies
- [Dating App UX Testing](https://testlio.com/blog/6-ways-to-optimize-dating-app-ux-through-testing/) — 6 UX testing strategies specific to dating apps
- [Full-Stack Testing Strategy 2026](https://www.nucamp.co/blog/testing-in-2026-jest-react-testing-library-and-full-stack-testing-strategies) — Jest, RTL, MSW, layered testing approach

## App Store & Distribution

- [ASO Fundamentals Guide (GrowthByKev)](https://www.growthbykev.com/blog/aso-fundamentals-guide) — Keyword optimization, conversion rates, Apple Search Ads — practical 30-day framework
