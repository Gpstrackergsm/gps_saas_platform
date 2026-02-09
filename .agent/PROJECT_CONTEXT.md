# Project Context & Development Workflow

## 🎯 PRIMARY GOAL
**The user wants to see results ONLINE, not locally.**

## Development Setup

### Mobile App (iOS)
- **Platform**: iOS app built with Expo/React Native
- **Development Environment**: Xcode on Mac
- **Testing Device**: Physical iPhone (not simulator)
- **Important**: The app runs on a physical device, testing real-world connectivity

### Backend Architecture
- **Production Backend**: Railway (https://gpssaasplatform-production.up.railway.app)
- **Production Database**: Railway MySQL
  - Host: `turntable.proxy.rlwy.net`
  - Port: `23429`
  - Database: `railway`
- **Local Backend**: Only for development/testing (port 4000)
- **Local Database**: MySQL on localhost (port 3306)

## 🚨 CRITICAL: Default Configuration

### Current Setup (as of 2026-02-09)
The mobile app is configured to connect to:
- **API URL**: `http://192.168.1.52:4000` (local backend) when in development mode
- **Production URL**: `https://gpssaasplatform-production.up.railway.app` when in production mode

### User's Preference
**The user wants the app to connect to the PRODUCTION/ONLINE backend by default**, not the local one.

## Configuration Files

### Mobile App Config
- **File**: `mobile/constants/Config.ts`
- **Current Behavior**: Uses local IP in `__DEV__` mode
- **User's Desired Behavior**: Should use production Railway URL even in development

### Backend Config
- **File**: `backend/.env`
- **Current Setup**: Connected to Railway production database
- **This is correct**: Backend should always use production database

## Development Workflow

1. **Mobile App Development**:
   - Build and run iOS app in Xcode
   - Test on physical iPhone
   - App should connect to **production Railway backend**
   - See real-time data from production database

2. **Backend Development**:
   - Backend runs locally but connects to **Railway production database**
   - Changes are tested against real production data
   - Deploy to Railway when ready

3. **Database**:
   - **Always use Railway production database**
   - No local database for testing
   - All data operations happen on production

## Important Notes

- 🔴 **DO NOT default to localhost/local development** unless explicitly requested
- 🟢 **Production-first approach**: User wants to see online results immediately
- 📱 **Physical device testing**: App runs on real iPhone, not simulator
- 🌐 **Network considerations**: Physical device needs network IP or production URL

## Quick Reference

### To Switch Mobile App to Production Backend
Edit `mobile/constants/Config.ts`:
```typescript
export const API_URL = __DEV__ 
  ? 'https://gpssaasplatform-production.up.railway.app'  // Use production even in dev
  : (extra.apiUrl || 'https://gpssaasplatform-production.up.railway.app');
```

### Current Vehicle
- **Device ID**: `359586018966098`
- **Name**: Professional TK103 Simulator / toyota
- **Purpose**: Main testing vehicle

## Common Mistakes to Avoid

1. ❌ Assuming user wants local development setup
2. ❌ Configuring app to use `localhost` or local IP
3. ❌ Setting up local database for testing
4. ✅ Always configure for production/online results first
5. ✅ Ask before switching to local development
