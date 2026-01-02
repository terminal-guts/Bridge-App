# Bridge Frontend Mock - Development Setup Guide

This document contains all the requirements and setup instructions for developers to replicate the Bridge frontend development environment.

## Project Overview

**Bridge** is a frontend-only React Native/Expo application with mocked backend data. This is a UI/UX prototype for testing and gathering user feedback before backend development begins.

## System Requirements

### Required Software

1. **Node.js**: v24.11.0 (specified in `.nvmrc`)
   - You can use [nvm](https://github.com/nvm-sh/nvm) to manage Node versions
   - Install nvm, then run: `nvm use` in the project directory

2. **npm**: v11.6.1 (comes with Node.js)

3. **Expo CLI**: Installed via project dependencies
   - No global installation needed

### Platform-Specific Requirements

#### For iOS Development (Primary Platform)
- **macOS** required
- **Xcode** (latest version recommended)
- **iOS Simulator** (included with Xcode)
- **CocoaPods**: `sudo gem install cocoapods`

#### For Android Development
- **Android Studio**
- **Android SDK**
- **Android Emulator** or physical device

## Installation Steps

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd Bridge-Version1-Mock
```

### 2. Install Node.js (using nvm - recommended)
```bash
# Install nvm if you haven't already
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install and use the correct Node version
nvm install
nvm use
```

### 3. Install Dependencies
```bash
npm install
```

This will install all dependencies listed in `package.json`, including:
- React Native 0.81.5
- Expo SDK 54
- React Navigation
- NativeWind (Tailwind CSS for React Native)
- And all other required packages

### 4. Environment Configuration

The `.env` file is already configured with mock values:
```
EXPO_PUBLIC_SUPABASE_URL=mock-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=mock-key
```

**Note:** This project uses mocked backend calls. No real backend configuration is needed for frontend-only testing.

### 5. Backend Setup (Optional)

**Current Status**: This mock project has NO backend connection. All data is mocked.

**If you need to test with a real backend**, see `BACKEND_SETUP.md` for detailed instructions.

**Backend Stack** (used in Bridge-Version1):
- **Platform**: Supabase (Backend-as-a-Service)
- **Database**: PostgreSQL
- **Authentication**: Supabase Auth
- **Client Library**: @supabase/supabase-js v2.81.1

**Quick Backend Test** (requires access to Supabase project):
```bash
# Add real Supabase credentials to .env
# Then test the connection
npx tsx Bridge-Version1/scripts/test-backend-connection.ts
```

See `BACKEND_SETUP.md` for complete backend setup instructions.

## Running the Application

### Start the Development Server
```bash
npm start
```

### Run on Specific Platform
```bash
# iOS (macOS only)
npm run ios

# Android
npm run android

# Web
npm run web
```

## Key Dependencies

### Core Framework
- **React**: 19.1.0
- **React Native**: 0.81.5
- **Expo**: ~54.0.0

### Navigation
- @react-navigation/native: ^7.1.19
- @react-navigation/stack: ^7.6.3
- @react-navigation/bottom-tabs: ^7.8.4

### UI & Styling
- nativewind: ^2.0.11
- tailwindcss: 3.3.2
- expo-linear-gradient: ~15.0.7
- react-native-svg: 15.12.1

### Expo Modules
- expo-image-picker: ~17.0.8
- expo-location: ~19.0.8
- expo-haptics: ~15.0.7
- expo-clipboard: ~8.0.7
- expo-file-system: ~19.0.18
- expo-sharing: ~14.0.7

### State & Storage
- @react-native-async-storage/async-storage: ^2.2.0

### Additional Features
- react-native-maps: 1.20.1
- react-native-toast-message: ^2.3.3
- @react-native-community/datetimepicker: ^8.5.1
- @react-native-community/slider: 5.0.1

### Development Tools
- TypeScript: ^5.9.3
- @types/react: ~19.1.10
- @babel/core: ^7.28.5

## Project Structure
```
Bridge-Version1-Mock/
├── src/
│   ├── components/      # Reusable UI components
│   ├── screens/         # App screens
│   ├── navigation/      # Navigation configuration
│   ├── contexts/        # React contexts
│   ├── services/        # Mock services
│   ├── types/           # TypeScript types
│   └── utils/           # Utility functions
├── assets/              # Images, fonts, etc.
├── App.tsx              # App entry point
├── package.json         # Dependencies
├── tsconfig.json        # TypeScript config
└── tailwind.config.js   # Tailwind CSS config
```

## Testing

Run tests with:
```bash
npm test
```

## Linting

Run ESLint:
```bash
npm run lint
```

## Important Notes

1. **Frontend Only**: This project has NO backend. All data is mocked in the frontend.
2. **Primary Platform**: iOS is the primary testing platform.
3. **Mock Data**: All backend calls are intercepted and return mock data.
4. **No Authentication**: User authentication is mocked - no real auth needed.

## Troubleshooting

### Clear Cache
If you encounter issues, try clearing the Expo cache:
```bash
npm start -- --clear
```

### Reset Dependencies
```bash
rm -rf node_modules package-lock.json
npm install
```

### iOS Specific Issues
```bash
cd ios
pod install
cd ..
```

## Backend Integration (When Ready)

**Bridge-Version1** already has a fully configured Supabase backend. To integrate:

1. **Get Supabase Credentials**: Ask project owner for access to the Supabase project
2. **Update .env**: Replace mock values with real Supabase URL and keys
3. **Replace Mock Client**: Update `src/lib/supabase.ts` with real Supabase client
4. **Update Services**: Replace mocked service calls with real Supabase queries
5. **Test Connection**: Run `npx tsx Bridge-Version1/scripts/test-backend-connection.ts`

See `BACKEND_SETUP.md` for complete integration instructions and database schema details.

---

## Additional Resources

- [React Native Documentation](https://reactnative.dev/)
- [Expo Documentation](https://docs.expo.dev/)
- [React Navigation](https://reactnavigation.org/)
- [NativeWind](https://www.nativewind.dev/)

## Support

For questions or issues, please refer to the project documentation or contact the development team.
