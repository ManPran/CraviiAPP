import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar, SafeAreaView } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Import screens
import LoadingScreen from './screens/LoadingScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import AuthScreen from './screens/AuthScreen';
import RegistrationScreen from './screens/RegistrationScreen';
import DietaryRestrictionsScreen from './screens/DietaryRestrictionsScreen';
import MainTabNavigator from './navigation/MainTabNavigator';
import IngredientSwipeScreen from './screens/IngredientSwipeScreen';
import RecipeResultsScreen from './screens/RecipeResultsScreen';
import RecipeDetailScreen from './screens/RecipeDetailScreen';

// Types
type AppState = 
  | "loading"
  | "onboarding"
  | "auth"
  | "registration"
  | "dietary-restrictions"
  | "main"
  | "ingredient-swipe"
  | "recipe-results"
  | "recipe-detail";

export interface User {
  id: number;
  email: string;
  dietaryRestrictions: string[];
  religionDietaryRestrictions: string[];
}

export interface UserPreferences {
  course: string;
  taste: string;
  prepTime: number;
  appliances: string[];
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  image: string;
  readyInMinutes: number;
  servings: number;
  ingredients: string[];
  instructions: string[];
  difficulty: "easy" | "medium" | "hard";
  tags: string[];
  sourceUrl?: string;
  rating?: number;
  missingIngredients?: string[];
  completenessScore?: number;
}

const Stack = createStackNavigator();

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null);
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
    // Initialize app
    const initializeApp = async () => {
      // Simulate loading time
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if user is already logged in (implement your auth logic here)
      const savedUser = null; // Load from AsyncStorage
      
      if (savedUser) {
        setUser(savedUser);
        setAppState("main");
      } else {
        setAppState("onboarding");
      }
    };

    initializeApp();
  }, []);

  const handleAuth = (userData: User) => {
    setUser(userData);
    setAppState("dietary-restrictions");
  };

  const handlePreferences = (preferences: UserPreferences) => {
    setUserPreferences(preferences);
    setAppState("main");
  };

  const handleStartSwiping = () => {
    setSelectedIngredients([]);
    setAppState("ingredient-swipe");
  };

  const handleIngredientSelection = (ingredients: string[]) => {
    setSelectedIngredients(ingredients);
    setAppState("recipe-results");
  };

  const handleSelectRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setAppState("recipe-detail");
  };

  const handleBackToMain = () => {
    setAppState("main");
  };

  const getInitialRouteName = () => {
    switch (appState) {
      case "loading": return "Loading";
      case "onboarding": return "Onboarding";
      case "auth": return "Auth";
      case "registration": return "Registration";
      case "dietary-restrictions": return "DietaryRestrictions";
      case "main": return "MainTabs";
      case "ingredient-swipe": return "IngredientSwipe";
      case "recipe-results": return "RecipeResults";
      case "recipe-detail": return "RecipeDetail";
      default: return "Loading";
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar barStyle="light-content" backgroundColor="#DC2626" />
        <NavigationContainer>
          <Stack.Navigator 
            initialRouteName={getInitialRouteName()}
            screenOptions={{ headerShown: false }}
          >
            <Stack.Screen name="Loading" component={LoadingScreen} />
            <Stack.Screen name="Onboarding">
              {() => <OnboardingScreen onComplete={() => setAppState("auth")} />}
            </Stack.Screen>
            <Stack.Screen name="Auth">
              {() => <AuthScreen 
                onLogin={handleAuth} 
                onSwitchToRegister={() => setAppState("registration")} 
              />}
            </Stack.Screen>
            <Stack.Screen name="Registration">
              {() => <RegistrationScreen 
                onRegister={handleAuth}
                onSwitchToLogin={() => setAppState("auth")} 
              />}
            </Stack.Screen>
            <Stack.Screen name="DietaryRestrictions">
              {() => <DietaryRestrictionsScreen 
                user={user!}
                onComplete={handlePreferences} 
              />}
            </Stack.Screen>
            <Stack.Screen name="MainTabs">
              {() => <MainTabNavigator 
                user={user!}
                userPreferences={userPreferences!}
                onStartSwiping={handleStartSwiping}
              />}
            </Stack.Screen>
            <Stack.Screen name="IngredientSwipe">
              {() => <IngredientSwipeScreen 
                userPreferences={userPreferences!}
                onComplete={handleIngredientSelection}
                onBack={handleBackToMain}
              />}
            </Stack.Screen>
            <Stack.Screen name="RecipeResults">
              {() => <RecipeResultsScreen 
                ingredients={selectedIngredients}
                userPreferences={userPreferences!}
                onSelectRecipe={handleSelectRecipe}
                onBack={handleBackToMain}
              />}
            </Stack.Screen>
            <Stack.Screen name="RecipeDetail">
              {() => <RecipeDetailScreen 
                recipe={selectedRecipe!}
                onBack={() => setAppState("recipe-results")}
              />}
            </Stack.Screen>
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

export default App;