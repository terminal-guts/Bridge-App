# Bridge - Community-Driven Dating App

**The first-ever community-driven dating experience**

> "The community finds the fit. We Bridge the gap."

---

## Project Overview

**Bridge** is a mobile dating application that uses community-driven matching instead of traditional swiping. Friends help friends find meaningful connections.

**This is the production codebase for Bridge** — the app being deployed to the App Store.

This repository contains both the frontend and backend:
- **Frontend** (current directory): React Native/Expo app
- **Bridge-Version1** (subdirectory): Supabase backend integration

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

See **[GETTING_STARTED.md](./GETTING_STARTED.md)** for complete setup instructions, troubleshooting, and backend configuration.

---

## Documentation

### Setup & Development
- **[GETTING_STARTED.md](./GETTING_STARTED.md)** - **Complete developer guide** (start here!)
  - All dependencies and prerequisites
  - Frontend & backend setup
  - Troubleshooting
  - Development workflow

### Project Information
- **[BRIDGE_VISION.md](./BRIDGE_VISION.md)** - Product vision and roadmap
- **[ACTUAL_ONBOARDING_FLOW.md](./ACTUAL_ONBOARDING_FLOW.md)** - User onboarding flow
- **[MANDATORY_FIELDS_FINAL.md](./MANDATORY_FIELDS_FINAL.md)** - Required profile fields
- **[FIELD_AUDIT_REPORT.md](./FIELD_AUDIT_REPORT.md)** - Database field documentation

### Technical Documentation
- **[CONSOLE_LOG_MIGRATION.md](./CONSOLE_LOG_MIGRATION.md)** - Logging migration strategy
- **[BANNER_FIX_TEST_REPORT.md](./BANNER_FIX_TEST_REPORT.md)** - Profile banner fix testing
- **[BANNER_TEST_SCENARIOS.md](./BANNER_TEST_SCENARIOS.md)** - Banner test scenarios

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
│   │   ├── ProfileCompletionBanner.tsx
│   │   └── ProfileStrengthDashboard.tsx
│   ├── screens/            # App screens
│   │   ├── main/           # Main app screens (Profile, Community, etc.)
│   │   ├── match/          # Matching flow screens
│   │   ├── onboarding/     # Onboarding steps
│   │   └── profile/        # Profile management screens
│   ├── navigation/         # Navigation configuration
│   ├── contexts/           # React Context providers
│   ├── services/           # Mock API services
│   ├── types/              # TypeScript type definitions
│   └── utils/              # Utility functions
├── assets/                 # Images, fonts, icons
├── Bridge-Version1/        # Full app with Supabase backend
│   └── scripts/           # Database management scripts
├── App.tsx                 # App entry point
├── package.json            # Dependencies
├── .nvmrc                  # Node.js version
├── .env.example            # Environment variables template
└── Documentation files
```

---

## Current Status

### This Repository (Production App)
- **Status**: Production codebase — deploying to App Store
- **Frontend**: React Native/Expo (this directory)
- **Backend**: Supabase (Bridge-Version1 subdirectory)
- **Database**: PostgreSQL via Supabase
- **Authentication**: Supabase Auth
- **Scripts**: TypeScript utilities for database management

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
   npx tsx Bridge-Version1/scripts/test-backend-connection.ts
   ```

3. **See [GETTING_STARTED.md](./GETTING_STARTED.md)** for complete setup

---

## Key Features

### Community Matching System
- Friends vote on potential matches
- Daily curated match grids
- Match progression tracking
- Community involvement rewards

### Profile System
- Multi-step onboarding
- Photo verification
- Compatibility questions
- Profile strength tracking

### Match Flow
- Match proposals
- 3-day voting periods
- Match acceptance/rejection
- Chat initiation

### Friends Area
- Friend connections
- Friend matching suggestions
- Community participation

---

## Development Workflow

### Adding New Features
1. Create components in `src/components/`
2. Add screens in `src/screens/`
3. Update navigation in `src/navigation/`
4. Update services in `src/services/`
5. Test on iOS simulator

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
npx tsx Bridge-Version1/scripts/test-backend-connection.ts
npx tsx Bridge-Version1/scripts/seed-test-users.ts
npx tsx Bridge-Version1/scripts/create-dev-user.ts
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
| iOS | ✅ Primary | Main development platform |
| Android | ✅ Supported | Tested but secondary |
| Web | ⚠️ Limited | Basic support via Expo |

---

## Contributing

1. Create a feature branch
2. Make your changes
3. Test on iOS simulator
4. Submit a pull request

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
- Run `npx tsx Bridge-Version1/scripts/test-backend-connection.ts`

See [GETTING_STARTED.md](./GETTING_STARTED.md) for comprehensive troubleshooting.

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

---

## Support

For questions or issues:
1. Check the documentation files
2. Review troubleshooting section
3. Contact the development team

---

