# Bridge - Complete Developer Guide

**Welcome to Bridge!** This guide will help you download all dependencies, understand the codebase, and get the app running on your machine.

---

## Table of Contents
1. [Quick Start (5 Minutes)](#quick-start-5-minutes)
2. [What is Bridge?](#what-is-bridge)
3. [Prerequisites](#prerequisites)
4. [Frontend Setup](#frontend-setup)
5. [Backend Setup](#backend-setup)
6. [Project Structure](#project-structure)
7. [Development Workflow](#development-workflow)
8. [Troubleshooting](#troubleshooting)
9. [Additional Resources](#additional-resources)

---

## Quick Start (5 Minutes)

Get the app running in under 5 minutes:

```bash
# 1. Install Node.js v24.11.0 (use nvm for version management)
nvm install 24.11.0
nvm use 24.11.0

# 2. Clone the repository (if not already done)
git clone <repository-url>
cd Bridge-Version1-Mock

# 3. Install all dependencies
npm install

# 4. Start the development server
npm start

# 5. Run on iOS (recommended for development)
npm run ios

# Or run on Android
npm run android

# Or run in web browser
npm run web
```

**That's it!** The app will launch with all data mocked - no backend required.

---

## What is Bridge?

**Bridge** is a community-driven dating app built with React Native and Expo.

### Key Features:
- **Community-Driven Matching**: Your friends help find your matches
- **Deep Questions**: Get to know people beyond surface-level
- **Privacy-First**: No swiping, no endless browsing
- **Real Connections**: Quality over quantity

### Tech Stack:
- **Frontend**: React Native + Expo
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **Navigation**: React Navigation
- **State**: React hooks + Context
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Current Mode**: Fully mocked (no backend connection)

### Project Versions:
- **Bridge-Version1-Mock** (this project): Frontend-only with mocked data
- **Bridge-Version1**: Full-stack version with Supabase backend

---

## Prerequisites

### Required Software

#### 1. Node.js v24.11.0
We use a specific Node.js version to ensure consistency across the team.

```bash
# Install nvm (Node Version Manager) if you don't have it
# macOS/Linux:
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Windows: Download from https://github.com/coreybutler/nvm-windows

# Install and use the correct Node.js version
nvm install 24.11.0
nvm use 24.11.0

# Verify installation
node --version  # Should show v24.11.0
npm --version   # Should show v11.6.1
```

#### 2. Platform-Specific Tools

**For iOS Development (macOS only):**
```bash
# Install Xcode from the Mac App Store (required for iOS development)
# Then install Xcode Command Line Tools
xcode-select --install

# Install CocoaPods (dependency manager for iOS)
sudo gem install cocoapods

# Navigate to iOS directory and install pods
cd ios && pod install && cd ..
```

**For Android Development (all platforms):**
- Download and install [Android Studio](https://developer.android.com/studio)
- During setup, make sure to install:
  - Android SDK
  - Android SDK Platform
  - Android Virtual Device (AVD)
- Set up the ANDROID_HOME environment variable

**For Web Development:**
- No additional setup required - works out of the box!

#### 3. Git
```bash
# Verify git is installed
git --version

# If not installed:
# macOS: Installed with Xcode Command Line Tools
# Windows: https://git-scm.com/download/win
# Linux: sudo apt-get install git
```

---

## Frontend Setup

### Step 1: Install Dependencies

```bash
# Install all npm packages (63 direct dependencies)
npm install
```

This will install:
- **React Native**: Core framework (v0.81.5)
- **Expo**: Development tools and modules (~54.0.0)
- **Navigation**: @react-navigation/* packages
- **Styling**: nativewind + tailwindcss
- **UI Components**: Expo modules (image picker, location, file system, etc.)
- **State Management**: React hooks and context
- **Utilities**: date-fns, zod, etc.

### Step 2: Configure Environment Variables

The project includes a pre-configured `.env` file with mock credentials:

```bash
# .env file (already present)
EXPO_PUBLIC_SUPABASE_URL=mock-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=mock-key
```

**You don't need to change these** unless you're connecting to a real backend (see Backend Setup section).

### Step 3: Start Development Server

```bash
# Start the Metro bundler
npm start

# This will open Expo DevTools in your browser
# Scan the QR code with Expo Go app on your phone
# Or press 'i' for iOS simulator, 'a' for Android emulator, 'w' for web
```

### Step 4: Run on a Platform

Choose your preferred platform:

```bash
# iOS (macOS only)
npm run ios

# Android
npm run android

# Web browser
npm run web

# Start with cache cleared (if you encounter issues)
npm start -- --clear
```

### Key Frontend Files

Understanding the codebase structure:

```
src/
├── components/         # Reusable UI components
│   ├── ui/            # Base UI components (Button, Card, etc.)
│   ├── community/     # Community-specific components
│   └── profile/       # Profile-related components
├── screens/           # Screen components (one per route)
│   ├── auth/          # Login, signup screens
│   ├── onboarding/    # Onboarding flow
│   ├── main/          # Main app screens
│   └── profile/       # Profile management
├── navigation/        # Navigation configuration
├── services/          # API services (currently mocked)
├── hooks/             # Custom React hooks
├── utils/             # Utility functions
├── types/             # TypeScript type definitions
├── lib/               # Third-party library configs
└── config/            # App configuration
```

---

## Backend Setup

### Understanding the Backend

Bridge uses **Supabase** as its backend - a complete Backend-as-a-Service platform.

**What Supabase Provides:**
- PostgreSQL database with full SQL access
- Built-in authentication (email/phone)
- Real-time WebSocket subscriptions
- File storage for photos
- Auto-generated REST and GraphQL APIs
- Row-level security policies

### Current State: Mocked Backend

The current project (`Bridge-Version1-Mock`) **does NOT connect to a real backend**. All data is mocked in the `src/services/` directory.

**Why?**
- Faster development without backend dependencies
- Test UI/UX without database setup
- Easy onboarding for frontend developers

### Option 1: Continue with Mock Data (Recommended for Frontend Work)

No setup required! Just use the app as-is. All services return fake data.

### Option 2: Connect to Real Supabase Backend

If you want to test with real backend functionality:

#### Step 1: Get Supabase Credentials

**Option A: Use Existing Hosted Project**

Ask the project owner for access to the Bridge Supabase project and get these credentials:

```
EXPO_PUBLIC_SUPABASE_URL=https://ikyiwnydgedwbmcdzgbe.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_... (for admin scripts)
```

1. Project owner invites you to the Supabase project
2. Accept invitation at https://supabase.com
3. Navigate to Project Settings > API to view keys

**Option B: Run Local Supabase (Advanced)**

For offline development or if you want full control:

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize Supabase in your project
supabase init

# Start local Supabase (requires Docker Desktop)
supabase start

# Services will be available at:
# - Studio UI: http://localhost:54323
# - API: http://localhost:54321
# - Database: postgresql://postgres:postgres@localhost:54322/postgres
```

#### Step 2: Configure Environment Variables

Update your `.env` file:

```bash
# For hosted Supabase
EXPO_PUBLIC_SUPABASE_URL=https://ikyiwnydgedwbmcdzgbe.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_actual_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# For local Supabase
EXPO_PUBLIC_SUPABASE_URL=http://localhost:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_local_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_local_service_role_key
```

#### Step 3: Switch from Mock to Real Client

Replace the mock Supabase client with the real one:

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

#### Step 4: Update Service Files

Modify services in `src/services/` to use real Supabase queries instead of returning mock data.

#### Step 5: Test Connection

```bash
# Install tsx for running TypeScript scripts
npm install -D tsx

# Test backend connection
npx tsx Bridge-Version1/scripts/test-backend-connection.ts
```

Expected output:
```
✅ Connected to Supabase
✅ Database is accessible
✅ Authentication is working
```

### Database Scripts

Useful scripts for managing test data (in `Bridge-Version1/scripts/`):

```bash
# Test backend connection
npx tsx Bridge-Version1/scripts/test-backend-connection.ts

# Create a development user
npx tsx Bridge-Version1/scripts/create-dev-user.ts

# Seed database with test users
npx tsx Bridge-Version1/scripts/seed-test-users.ts

# Verify test data
npx tsx Bridge-Version1/scripts/check-test-data.ts

# Generate daily matching grids
npx tsx Bridge-Version1/scripts/generate-daily-grids-manual.ts
```

### Database Schema Overview

Main tables you'll work with:

**user_profiles**
- User profile information (demographics, bio, photos)
- Links to auth.users

**matches**
- Match proposals and voting results
- Match state progression

**friendships**
- Friend connections and requests

**votes**
- Community votes on potential matches

**daily_grids**
- Daily matching grids for users

**questions**
- Deep questions and user responses

---

## Project Structure

```
Bridge-Version1-Mock/
├── src/                      # Source code
│   ├── components/           # UI components
│   ├── screens/              # Screen components
│   ├── navigation/           # React Navigation setup
│   ├── services/             # API services (mocked)
│   ├── hooks/                # Custom hooks
│   ├── utils/                # Utility functions
│   ├── types/                # TypeScript types
│   ├── lib/                  # Third-party configs
│   └── config/               # App configuration
├── assets/                   # Images, fonts, etc.
├── ios/                      # iOS native code
├── android/                  # Android native code
├── Bridge-Version1/          # Backend version (reference)
├── .env                      # Environment variables
├── package.json              # Dependencies
├── tsconfig.json             # TypeScript config
├── tailwind.config.js        # Tailwind CSS config
└── app.json                  # Expo configuration
```

---

## Development Workflow

### Daily Development

```bash
# 1. Pull latest changes
git pull origin main

# 2. Install any new dependencies
npm install

# 3. Start development server
npm start

# 4. Run on your preferred platform
npm run ios  # or android, or web

# 5. Make changes and see them reload automatically
# Hot reload is enabled by default!
```

### Common Commands

```bash
# Development
npm start                    # Start Metro bundler
npm run ios                  # Run on iOS simulator
npm run android              # Run on Android emulator
npm run web                  # Run in web browser
npm start -- --clear         # Clear cache and start

# Testing
npm test                     # Run tests
npm run lint                 # Run ESLint

# Cleaning
rm -rf node_modules          # Remove dependencies
npm install                  # Reinstall dependencies
npm start -- --clear         # Clear Metro cache

# iOS specific
cd ios && pod install && cd .. # Reinstall iOS dependencies
```

### Feature Development Flow

1. **Create a new branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make changes**
   - Edit files in `src/`
   - App will hot-reload automatically

3. **Test your changes**
   - Test on iOS and Android
   - Verify UI matches designs
   - Test edge cases

4. **Commit and push**
   ```bash
   git add .
   git commit -m "Add your feature description"
   git push origin feature/your-feature-name
   ```

5. **Create Pull Request**
   - Open PR on GitHub
   - Request code review
   - Address feedback

---

## Troubleshooting

### Common Issues

#### 1. Metro Bundler Issues

**Problem**: "Unable to resolve module" or cache issues

```bash
# Solution: Clear cache and restart
npm start -- --clear

# Or clear cache manually
rm -rf node_modules/.cache
npm start
```

#### 2. Module Not Found

**Problem**: "Module not found" errors

```bash
# Solution: Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

#### 3. iOS Build Fails

**Problem**: Build errors on iOS

```bash
# Solution: Reinstall CocoaPods dependencies
cd ios
rm -rf Pods Podfile.lock
pod install
cd ..
npm run ios
```

#### 4. Android Build Fails

**Problem**: Gradle or Android build errors

```bash
# Solution: Clean and rebuild
cd android
./gradlew clean
cd ..
npm run android
```

#### 5. Wrong Node Version

**Problem**: "Node version incompatible" warnings

```bash
# Solution: Use correct Node version
nvm use 24.11.0
# Or install if not present
nvm install 24.11.0
nvm use 24.11.0
```

#### 6. Expo Go App Issues

**Problem**: App won't load in Expo Go

```bash
# Solution: Update Expo Go app on your phone
# Download latest version from App Store or Play Store

# Or use a simulator/emulator instead
npm run ios     # iOS simulator
npm run android # Android emulator
```

### Backend Connection Issues

#### 1. Environment Variables Not Working

**Problem**: "Missing environment variables" error

```bash
# Solution: Verify .env file exists and is correctly formatted
cat .env

# Variables must be prefixed with EXPO_PUBLIC_ for frontend access
EXPO_PUBLIC_SUPABASE_URL=your_url_here
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_key_here
```

#### 2. Supabase Connection Failed

**Problem**: Cannot connect to Supabase

- Verify URL is correct (no trailing slash)
- Check API keys are valid (not expired)
- Ensure internet connection (for hosted Supabase)
- Check firewall/VPN settings

#### 3. Local Supabase Won't Start

**Problem**: `supabase start` fails

```bash
# Check Docker is running
docker ps

# If not, start Docker Desktop

# Then try again
supabase stop
supabase start
```

#### 4. Database Scripts Fail

**Problem**: TypeScript scripts won't run

```bash
# Install required dependencies
npm install -D tsx @types/pg pg

# Then try again
npx tsx Bridge-Version1/scripts/test-backend-connection.ts
```

### Platform-Specific Issues

#### macOS/iOS
- **Xcode not found**: Install from Mac App Store
- **CocoaPods errors**: Update with `sudo gem install cocoapods`
- **Simulator won't launch**: Open Xcode > Preferences > Locations > Set Command Line Tools

#### Windows/Android
- **ANDROID_HOME not set**: Add to system environment variables
- **Java version issues**: Install JDK 11 or newer
- **Gradle daemon fails**: Increase heap size in `android/gradle.properties`

---

## Additional Resources

### Documentation
- **Project Vision**: `BRIDGE_VISION.md` - Product goals and roadmap
- **Onboarding Flow**: `ACTUAL_ONBOARDING_FLOW.md` - User onboarding process
- **Field Audit**: `FIELD_AUDIT_REPORT.md` - Database field documentation
- **Mandatory Fields**: `MANDATORY_FIELDS_FINAL.md` - Required profile fields

### External Documentation
- [React Native Docs](https://reactnative.dev/docs/getting-started)
- [Expo Documentation](https://docs.expo.dev/)
- [React Navigation](https://reactnavigation.org/)
- [NativeWind](https://www.nativewind.dev/)
- [Supabase Docs](https://supabase.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

### Community
- Ask questions in team chat
- Review existing PRs for code patterns
- Check `BRIDGE_VISION.md` for product context

---

## Next Steps

Now that you're set up, here's what to do next:

1. **Explore the App**
   - Run the app and click through all screens
   - Understand the user flow
   - Try all features

2. **Read the Code**
   - Start with `src/navigation/AppNavigator.tsx` to see screen structure
   - Look at `src/screens/` to understand each screen
   - Review `src/services/` to see how data is mocked

3. **Understand the Architecture**
   - Read `BRIDGE_VISION.md` for product context
   - Review `src/types/index.ts` for data models
   - Check `src/utils/` for shared logic

4. **Pick Your First Task**
   - Check the project board for beginner-friendly issues
   - Ask the team which area needs help
   - Start with small UI improvements

5. **Set Up Your Editor**
   - Install ESLint extension
   - Install Prettier extension
   - Configure auto-format on save

---

## Summary Checklist

Before you start developing, make sure you have:

- [ ] Node.js v24.11.0 installed (`node --version`)
- [ ] npm v11.6.1 or higher (`npm --version`)
- [ ] Dependencies installed (`npm install` completed successfully)
- [ ] iOS/Android/Web platform tools installed
- [ ] App running on at least one platform
- [ ] `.env` file present (with mock or real credentials)
- [ ] Understand project structure (`src/` directory layout)
- [ ] Read `BRIDGE_VISION.md` for product context

---

## Getting Help

Stuck? Here's how to get help:

1. **Check this guide** - Most common issues are covered above
2. **Search the docs** - Check other `.md` files in the repository
3. **Ask the team** - Post in team chat with:
   - What you were trying to do
   - What error you got (include screenshots)
   - What you've already tried
4. **Check GitHub Issues** - Someone may have had the same problem

---

**Welcome to the Bridge team! Happy coding!** 🌉
