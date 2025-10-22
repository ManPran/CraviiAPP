import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// Pages
import Loading from "@/pages/loading";
import Onboarding from "@/pages/onboarding";
import Auth from "@/pages/auth";
import Registration from "@/pages/registration";
import DietaryRestrictions from "@/pages/dietary-restrictions";

import MainScreen from "@/pages/main";
import IngredientSwipe from "@/pages/ingredient-swipe";
import { RealRecipeResults } from "@/components/RealRecipeResults";
import RecipeSuggestions from "@/pages/recipe-suggestions";
import RecipeDetail from "@/pages/recipe-detail";
import SearchPage from "@/pages/search";
import ProfilePage from "@/pages/profile";
import AdminScraping from "@/pages/admin-scraping";
import NotFound from "@/pages/not-found";
import { BottomNav } from "@/components/bottom-nav";

import type { Recipe, Ingredient } from "@shared/schema";

type AppState = 
  | "loading"
  | "onboarding"
  | "auth"
  | "registration"
  | "dietary-restrictions"
  | "main"
  | "ingredient-swipe"
  | "recipe-results"
  | "recipe-suggestions"
  | "recipe-detail"
  | "search"
  | "profile";

function AppContent() {
  const [currentState, setCurrentState] = useState<AppState>("loading");
  const [userId, setUserId] = useState<number | null>(null);
  const [currentPreferences, setCurrentPreferences] = useState<any>(null);
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
  const [selectedIngredients, setSelectedIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  const getRecipesMutation = useMutation({
    mutationFn: async ({ ingredients, preferences }: { ingredients: Ingredient[], preferences: any }) => {
      const response = await apiRequest("POST", "/api/recipe-suggestions", {
        ingredients,
        preferences
      });
      return response.json();
    },
    onSuccess: (recipes: Recipe[]) => {
      setRecipes(recipes);
      setCurrentState("recipe-suggestions");
    },
    onError: (error) => {
      console.error("Error getting recipes:", error);
    },
  });

  const handleLoadingComplete = () => {
    setCurrentState("onboarding");
  };

  const handleOnboardingComplete = () => {
    setCurrentState("dietary-restrictions");
  };

  const handleAuthComplete = (newUserId: number) => {
    setUserId(newUserId);
    setCurrentState("preferences");
  };

  const handleRegistrationComplete = (newUserId: number) => {
    setUserId(newUserId);
    setCurrentState("dietary-restrictions");
  };

  const handleDietaryRestrictionsComplete = (restrictions: string[]) => {
    setDietaryRestrictions(restrictions);
    setUserId(1); // Set a default user ID since we're skipping auth
    setCurrentState("main");
  };

  const handleDietaryRestrictionsBack = () => {
    setCurrentState("onboarding");
  };

  const handleGenerateRecipes = (preferences: any) => {
    setCurrentPreferences(preferences);
    setCurrentState("ingredient-swipe");
  };

  const handleIngredientSwipeBack = () => {
    setCurrentState("main");
  };

  const handleIngredientSwipeComplete = (ingredientLegacies: any[]) => {
    // Convert IngredientLegacy to Ingredient format for API
    const ingredients = ingredientLegacies.map((legacy: any) => ({
      id: parseInt(legacy.id),
      name: legacy.name,
      description: legacy.description,
      imageUrl: legacy.imageUrl,
      category: legacy.category,
      tags: legacy.tags,
      isCommon: true,
      searchTerms: [legacy.name.toLowerCase()]
    }));
    
    setSelectedIngredients(ingredients);
    setCurrentState("recipe-results");
  };

  const handleRecipeResultsBack = () => {
    setCurrentState("ingredient-swipe");
  };

  const handleSelectRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setCurrentState("recipe-detail");
  };

  const handleRecipeDetailBack = () => {
    setCurrentState("recipe-results");
  };

  const handleNavigation = (screen: string) => {
    if (screen === "home") {
      setCurrentState("main");
    } else if (screen === "recipes") {
      setCurrentState("recipe-suggestions");
    } else if (screen === "search") {
      setCurrentState("search");
    } else if (screen === "profile") {
      setCurrentState("profile");
    }
  };

  const handleBackToMain = () => {
    setCurrentState("main");
  };

  const showBottomNav = ["main", "recipe-results", "recipe-suggestions", "recipe-detail", "search", "profile"].includes(currentState);

  return (
    <div className="relative">
      {currentState === "loading" && (
        <Loading onComplete={handleLoadingComplete} />
      )}
      
      {currentState === "onboarding" && (
        <Onboarding onComplete={handleOnboardingComplete} />
      )}
      

      {currentState === "dietary-restrictions" && (
        <DietaryRestrictions 
          onBack={handleDietaryRestrictionsBack}
          onContinue={handleDietaryRestrictionsComplete}
          initialRestrictions={dietaryRestrictions}
        />
      )}
      
      {currentState === "main" && (
        <MainScreen onGenerateRecipes={handleGenerateRecipes} />
      )}
      
      {currentState === "ingredient-swipe" && currentPreferences && (
        <IngredientSwipe 
          preferences={currentPreferences}
          dietaryRestrictions={dietaryRestrictions}
          onBack={handleIngredientSwipeBack}
          onComplete={handleIngredientSwipeComplete}
        />
      )}
      
      {currentState === "recipe-results" && (
        <RealRecipeResults 
          selectedIngredients={selectedIngredients.map(ing => ing.name)}
          onSelectRecipe={(recipe) => {
            // Convert real recipe to expected format
            handleSelectRecipe({
              id: recipe.id,
              title: recipe.title,
              description: recipe.instructions.substring(0, 200) + "...",
              image: recipe.imageUrl,
              readyInMinutes: parseInt(recipe.cookTime?.match(/\d+/)?.[0] || "30"),
              servings: recipe.servings,
              ingredients: recipe.ingredients,
              instructions: recipe.instructions.split('\n').filter(s => s.trim()),
              difficulty: recipe.difficulty as "easy" | "medium" | "hard",
              tags: ['authentic', 'real-recipe'],
              sourceUrl: recipe.sourceUrl,
              rating: parseFloat(recipe.rating)
            });
          }}
          onContinueSwiping={handleRecipeResultsBack}
        />
      )}
      
      {currentState === "recipe-suggestions" && (
        <RecipeSuggestions 
          recipes={recipes}
          onSelectRecipe={handleSelectRecipe}
        />
      )}
      
      {currentState === "recipe-detail" && selectedRecipe && (
        <RecipeDetail 
          recipe={selectedRecipe}
          onBack={handleRecipeDetailBack}
        />
      )}

      {currentState === "search" && (
        <SearchPage onBack={handleBackToMain} />
      )}

      {currentState === "profile" && (
        <ProfilePage onBack={handleBackToMain} />
      )}

      {showBottomNav && (
        <BottomNav 
          onNavigate={handleNavigation}
          currentScreen={currentState}
        />
      )}
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={AppContent} />
      <Route path="/admin/scraping" component={AdminScraping} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
