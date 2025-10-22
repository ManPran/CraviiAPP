# Cravii Mobile App Setup Guide

## Quick Setup Instructions

Your React Native mobile app has been created! Here's how to get it running:

### 1. Install Dependencies
```bash
cd mobile
npm install
```

### 2. Backend Configuration
Make sure your backend is running on `http://localhost:5000`. The mobile app is configured to connect to your existing Express.js server.

### 3. Development Environment

#### For Android Development:
1. Install Android Studio
2. Set up Android SDK and emulator
3. Run: `npm run android`

#### For iOS Development (macOS only):
1. Install Xcode from App Store
2. Install CocoaPods: `sudo gem install cocoapods`
3. Navigate to iOS folder and install pods: `cd ios && pod install && cd ..`
4. Run: `npm run ios`

### 4. Testing Without Device Setup
You can test the mobile app structure by examining the code in:
- `mobile/src/App.tsx` - Main app navigation
- `mobile/src/screens/` - All screen components
- `mobile/src/navigation/` - Navigation configuration

## Key Features Converted

✅ **Loading Screen** - Brand introduction with animations
✅ **Onboarding** - 3-step feature introduction
✅ **Authentication** - Login and registration screens
✅ **Preferences Setup** - Dietary restrictions and cooking preferences
✅ **Home Screen** - Main dashboard with quick actions
✅ **Ingredient Swiping** - Tinder-style ingredient selection with gestures
✅ **Recipe Results** - Shows recipes with missing ingredients
✅ **Recipe Details** - Full recipe view with instructions
✅ **Navigation** - Bottom tabs for Home, Recipes, Profile

## Mobile-Specific Enhancements

- **Native gesture handling** for ingredient swiping
- **Touch-optimized UI** with proper spacing and button sizes
- **Mobile navigation patterns** with stack and tab navigators
- **Responsive design** that works on various screen sizes
- **Native animations** for smooth user experience
- **Vector icons** for consistent mobile UI

## API Integration

The mobile app connects to your existing backend:
- Recipe search: `POST /api/recipe-search`
- Ingredient suggestions: `GET /api/ingredients/smart-suggestions`
- Random ingredients: `GET /api/ingredients/random-main`
- User preferences: Uses the same preference system

## Development Notes

1. **API Base URL**: Update `API_BASE_URL` in screen files if your backend runs on a different address
2. **State Management**: Uses React hooks (useState, useEffect)
3. **Styling**: React Native StyleSheet with mobile-optimized designs
4. **Type Safety**: Full TypeScript support throughout the app
5. **Cross-Platform**: Single codebase works on both iOS and Android

## Next Steps

1. Test the app structure by running `npm start` in the mobile directory
2. Set up your preferred mobile development environment (Android Studio or Xcode)
3. Customize the styling and branding to match your preferences
4. Add additional features like recipe saving, favorites, or offline support

Your web app continues to work unchanged - this mobile app is a separate implementation that shares the same backend!