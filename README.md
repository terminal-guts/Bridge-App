# Bridge - Community-Driven Dating App

**The first-ever community-driven dating experience**

> "The community finds the fit. We Bridge the gap."

---

## Project Overview

**Bridge** is a mobile dating application that uses community-driven matching instead of traditional swiping. Friends help friends find meaningful connections.

**This is the production codebase for Bridge** -- the app being deployed to the App Store.

This repository contains both the frontend and backend:
- **Frontend** (current directory): React Native/Expo app
- **supabase/** (subdirectory): Supabase edge functions and migrations
- **scripts/** (subdirectory): Database management and testing utilities

---

## Quick Start

Get the app running in 5 minutes:

```bash
# 1. Install Node.js v24.11.0
nvm install 24.11.0 && nvm use 24.11.0

# 2. Install dependencies
npm install

# 3. Start the app
npm start

# 4. Run on iOS (primary platform)
npm run ios
```

---

## Documentation

- **[BRIDGE_VISION.md](./BRIDGE_VISION.md)** - Product vision, matching system, karma/streaks, and roadmap
- **[CLAUDE.md](./CLAUDE.md)** - Claude Code instructions (locked values, production rules)

---

## Tech Stack

### Frontend
- **Framework**: React Native 0.81.5
- **Platform**: Expo SDK 54
- **Language**: TypeScript 5.9.3
- **Navigation**: React Navigation 7
- **Styling**: NativeWind (Tailwind CSS)
- **State**: React Context API

### Backend
- **Platform**: Supabase (Backend-as-a-Service)
- **Database**: PostgreSQL
- **Authentication**: Supabase Auth (email/phone)
- **Real-time**: Supabase Realtime (WebSockets)
- **Storage**: Supabase Storage (user photos)
- **Edge Functions**: Deno-based serverless functions
- **Client**: @supabase/supabase-js v2.81.1

### Development
- **Node.js**: v24.11.0
- **Package Manager**: npm 11.6.1
- **Testing**: Jest
- **Linting**: ESLint

---

## Project Structure

```
Bridge-App/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ui/             # Base UI components (buttons, inputs, etc.)
│   │   ├── community/      # Community voting & friends area components
│   │   ├── matches/        # Match card components
│   │   ├── chat/           # Chat components (audio player/recorder)
│   │   ├── icons/          # Eva Icons integration
│   │   └── profile/        # Profile view components
│   ├── screens/            # App screens
│   │   ├── main/           # Main app screens (Profile, Community, etc.)
│   │   ├── match/          # Matching flow screens
│   │   ├── onboarding/     # Onboarding steps
│   │   ├── profile/        # Profile management screens
│   │   └── friends/        # Friend code & friend list screens
│   ├── navigation/         # Navigation configuration
│   ├── contexts/           # React Context providers
│   ├── hooks/              # Custom React hooks
│   ├── services/           # API services (Supabase backend + mock fallback)
│   ├── config/             # App configuration (guides, onboarding mapping)
│   ├── types/              # TypeScript type definitions
│   └── utils/              # Utility functions
├── supabase/
│   ├── functions/          # Edge functions (process-vote, proposal-lifecycle, etc.)
│   └── migrations/         # Database migrations
├── scripts/                # Database management and testing utilities
├── assets/                 # Images, fonts, icons
├── App.tsx                 # App entry point
├── package.json            # Dependencies
├── .nvmrc                  # Node.js version
└── .env.example            # Environment variables template
```

---

## Key Features

### Community Matching System
- Single-proposal model: one candidate pairing per user at a time
- 5-day voting window with relaxing approval thresholds
- Friends vote on each other's proposals
- 48-hour acceptance window after community approval

### Karma & Streaks
- Karma points for voting participation and accuracy
- Friend streaks for consecutive days of mutual voting
- Backend-weighted voting (higher karma = slightly stronger vote)

### Profile System
- Multi-step onboarding
- Photo management
- Deep questions (3 tiers)
- Profile strength tracking

### Match Flow
- Community-approved proposals
- Accept/decline decision phase
- In-match chat (text + voice notes)
- Match ending with reason collection

### Friends Area
- Friend connections via secure codes
- "Help Your Friends" / "Already Helped" split
- Friend chat messaging

---

## Getting Started

### Running the App

1. **Clone and install**:
   ```bash
   git clone <repo-url>
   cd Bridge-App
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Add your Supabase URL and keys to .env
   ```

3. **Run the app**:
   ```bash
   npm start
   npm run ios  # or npm run android
   ```

### Backend Setup

1. **Get Supabase credentials** from the project owner

2. **Test backend connection**:
   ```bash
   npx tsx scripts/test-backend-connection.ts
   ```

---

## Available Commands

```bash
# Development
npm start              # Start Expo development server
npm run ios            # Run on iOS simulator
npm run android        # Run on Android emulator
npm run web            # Run in web browser

# Testing & Quality
npm test               # Run Jest tests
npm run lint           # Run ESLint

# Troubleshooting
npm start -- --clear   # Clear Metro bundler cache

# Backend Scripts (requires Supabase access)
npx tsx scripts/test-backend-connection.ts
npx tsx scripts/seed-test-users.ts
npx tsx scripts/create-dev-user.ts
```

---

## Environment Variables

Create a `.env` file based on `.env.example`:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # For scripts only
```

---

## Platform Support

| Platform | Status | Notes |
|----------|--------|-------|
| iOS | Primary | Main development platform |
| Android | Supported | Tested but secondary |
| Web | Limited | Basic support via Expo |

---

## Troubleshooting

### Common Issues

**Metro bundler won't start?**
```bash
npm start -- --clear
```

**Module not found?**
```bash
rm -rf node_modules package-lock.json
npm install
```

**iOS build failing?**
```bash
cd ios && pod install && cd ..
```

**Can't connect to backend?**
- Check `.env` file exists with correct credentials
- Verify Supabase project is accessible
- Run `npx tsx scripts/test-backend-connection.ts`

---

## Resources

- [React Native Docs](https://reactnative.dev/)
- [Expo Docs](https://docs.expo.dev/)
- [Supabase Docs](https://supabase.com/docs)
- [React Navigation](https://reactnavigation.org/)
- [NativeWind](https://www.nativewind.dev/)

---

## License

MIT
