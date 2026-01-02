# Bridge - Developer Quick Start

## TL;DR - Get Running in 5 Minutes

```bash
# 1. Install Node.js v24.11.0
nvm install 24.11.0
nvm use 24.11.0

# 2. Install dependencies
npm install

# 3. Start the app
npm start

# 4. Run on iOS (primary platform)
npm run ios
```

## What You're Getting

- **Frontend**: React Native + Expo application
- **Backend**: None - all data is mocked
- **Platform**: iOS primary, Android/Web supported
- **Node.js**: v24.11.0
- **npm**: v11.6.1

## Files to Share with Developers

Send these files to other developers:
- `package.json` + `package-lock.json` - Frontend dependencies
- `.nvmrc` - Node.js version specification
- `SETUP.md` - Full frontend setup instructions
- `BACKEND_SETUP.md` - Backend setup and integration guide
- `requirements.txt` - Backend requirements (Supabase, not Python)
- `.env.example` - Environment variable template

## System Requirements

### macOS (for iOS development)
- macOS with Xcode installed
- Node.js v24.11.0
- CocoaPods: `sudo gem install cocoapods`

### Windows/Linux (Android only)
- Node.js v24.11.0
- Android Studio with Android SDK

## Dependencies Summary

**Total npm packages**: 63 direct dependencies

**Key packages**:
- react-native: ^0.81.5
- expo: ~54.0.0
- @react-navigation/*: Navigation
- nativewind + tailwindcss: Styling
- expo-*: Various Expo modules (image picker, location, etc.)

## Backend Status

**Current Project (Bridge-Version1-Mock)**: No backend - all mocked
**Bridge-Version1**: Fully configured Supabase backend available

**Backend Stack**:
- Platform: Supabase (PostgreSQL + Auth + Real-time)
- Client: @supabase/supabase-js v2.81.1
- Scripts: TypeScript utilities for database management

**To test backend**: See `BACKEND_SETUP.md` for complete setup instructions

## Commands Cheat Sheet

```bash
npm start              # Start development server
npm run ios            # Run on iOS simulator
npm run android        # Run on Android emulator
npm run web            # Run in web browser
npm test               # Run tests
npm run lint           # Run linter
npm start -- --clear   # Start with cache cleared
```

## Environment Variables

Located in `.env` (already configured):
```
EXPO_PUBLIC_SUPABASE_URL=mock-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=mock-key
```

## Troubleshooting

**Metro bundler issues?**
```bash
npm start -- --clear
```

**Module not found?**
```bash
rm -rf node_modules package-lock.json
npm install
```

**iOS build issues?**
```bash
cd ios && pod install && cd ..
```

## Documentation

- **Frontend Setup**: `SETUP.md` - Complete frontend setup guide
- **Backend Setup**: `BACKEND_SETUP.md` - Supabase backend configuration
- **Quick Start**: `DEVELOPER_QUICKSTART.md` - This file
- **Dependencies**: `requirements.txt` - Backend requirements explanation
- **Project Vision**: `BRIDGE_VISION.md` - Product vision and goals

## Support

Questions? Check `SETUP.md` for detailed instructions or contact the development team.
