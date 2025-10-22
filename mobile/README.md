# Cravii Mobile App

A React Native mobile application for discovering recipes based on available ingredients.

## Features

- **Ingredient Swiping**: Tinder-style interface for selecting ingredients
- **AI-Powered Recipes**: Get personalized recipe suggestions based on your ingredients and preferences
- **Missing Ingredients**: Shows recipes you can partially make with missing ingredient lists
- **User Preferences**: Customizable dietary restrictions, taste preferences, and cooking time
- **Recipe Details**: Complete cooking instructions with step-by-step guidance

## Tech Stack

- **React Native 0.74.5**: Mobile app framework
- **React Navigation**: Navigation and routing
- **TypeScript**: Type-safe development
- **React Native Vector Icons**: Icon library
- **React Native Gesture Handler**: Touch gesture handling

## Backend Integration

The mobile app connects to the existing Express.js backend:
- Recipe search and generation
- Ingredient database and filtering
- User preferences and dietary restrictions
- AI-powered recipe formatting with OpenAI GPT-4o

## Getting Started

### Prerequisites

- Node.js 16+
- React Native development environment
- Android Studio (for Android development)
- Xcode (for iOS development on macOS)

### Installation

1. Navigate to the mobile directory:
   ```bash
   cd mobile
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. For iOS (macOS only):
   ```bash
   cd ios && pod install && cd ..
   ```

### Running the App

1. Start the Metro bundler:
   ```bash
   npm start
   ```

2. Run on Android:
   ```bash
   npm run android
   ```

3. Run on iOS (macOS only):
   ```bash
   npm run ios
   ```

### Backend Setup

Make sure your backend server is running on `http://localhost:5000`. Update the `API_BASE_URL` in the mobile app screens if your backend runs on a different address.

## Project Structure

```
mobile/
├── src/
│   ├── App.tsx                 # Main app component with navigation
│   ├── navigation/             # Navigation configuration
│   └── screens/                # Screen components
│       ├── LoadingScreen.tsx
│       ├── OnboardingScreen.tsx
│       ├── AuthScreen.tsx
│       ├── RegistrationScreen.tsx
│       ├── DietaryRestrictionsScreen.tsx
│       ├── HomeScreen.tsx
│       ├── IngredientSwipeScreen.tsx
│       ├── RecipeResultsScreen.tsx
│       ├── RecipeDetailScreen.tsx
│       ├── RecipesScreen.tsx
│       └── ProfileScreen.tsx
├── android/                    # Android-specific files
├── ios/                        # iOS-specific files (when generated)
├── package.json
└── README.md
```

## Key Features

### Ingredient Swiping
- Gesture-based ingredient selection
- Smart suggestions based on selected ingredients
- Dietary restriction filtering

### Recipe Discovery
- Shows recipes with missing ingredients
- Completion percentage for each recipe
- Detailed ingredient lists and cooking instructions

### User Experience
- Onboarding flow for new users
- Preference setup for personalized recommendations
- Intuitive navigation with bottom tabs

## Development Notes

- The app is designed to work with the existing backend API
- All networking is handled through standard fetch APIs
- State management uses React hooks (useState, useEffect)
- Responsive design optimized for mobile devices

## Future Enhancements

- Recipe saving and favorites
- Cooking history tracking
- Shopping list generation
- Social features (recipe sharing)
- Offline mode support