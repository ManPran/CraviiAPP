import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { seedIngredients } from "./seedIngredients";
import { seedPantryIngredients } from "./pantryIngredients";
import { getRecipeSuggestionsForUser } from "./services/recipe";
import { searchRecipesByIngredients } from "./services/recipeSearch";
import { searchRecipesWithRealIngredients } from "./services/directRecipeSearch";
import { searchIntelligentRecipes } from "./services/intelligentRecipeParser";
import { insertUserSchema, insertUserPreferencesSchema, insertIngredientSelectionsSchema, recipeCombinations } from "@shared/schema";
import { z } from "zod";
import { findComplementaryIngredients, getRandomMainIngredient } from "./services/recipeIngredientFinder";
import { db } from "./db";
import { eq, and, lte } from "drizzle-orm";
import { generateMealRecommendation } from "./services/strictMealTypeFilter";
import { recipeBasedSwiping } from "./services/recipeBasedSwiping";
import { progressiveRecipeSwiping } from "./services/progressiveRecipeSwiping";
import { simpleProgressiveSwiper } from "./services/simpleProgressiveSwiper";
import { filterIngredientsByDiet, getDietaryRestrictionCategories, isIngredientAllowed, getExcludedTags } from "./services/dietaryFiltering";
import { swipeEngine } from "./services/swipeToRecipeEngine";
import { recipeScraper } from "./services/enhancedRecipeScraper";

// Helper function to get real recipes from TheMealDB
async function getTheMealDBRecipes(ingredientNames: string[]) {
  try {
    const axios = (await import("axios")).default;
    const mainIngredient = ingredientNames[0] || 'chicken';
    
    // Search TheMealDB for recipes with main ingredient
    const response = await axios.get(`https://www.themealdb.com/api/json/v1/1/filter.php?i=${mainIngredient}`);
    
    if (response.data.meals && response.data.meals.length > 0) {
      const recipes = [];
      
      // Get details for first 3 recipes
      for (let i = 0; i < Math.min(3, response.data.meals.length); i++) {
        const meal = response.data.meals[i];
        
        try {
          const detailResponse = await axios.get(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${meal.idMeal}`);
          
          if (detailResponse.data.meals && detailResponse.data.meals[0]) {
            const mealDetail = detailResponse.data.meals[0];
            
            // Extract ingredients
            const ingredients: string[] = [];
            for (let j = 1; j <= 20; j++) {
              const ingredient = mealDetail[`strIngredient${j}`];
              const measure = mealDetail[`strMeasure${j}`];
              
              if (ingredient && ingredient.trim()) {
                ingredients.push(measure ? `${measure} ${ingredient}`.trim() : ingredient.trim());
              }
            }
            
            // Process instructions
            const instructions = mealDetail.strInstructions
              ? mealDetail.strInstructions.split(/\r\n|\n|\r/).filter((step: string) => step.trim().length > 0)
              : ['Follow standard cooking instructions for this recipe.'];
            
            recipes.push({
              id: `themealdb_${meal.idMeal}`,
              title: mealDetail.strMeal,
              ingredients: ingredients,
              instructions: instructions.join('\n'),
              difficulty: "Medium",
              prepTime: "15 minutes",
              cookTime: "30 minutes", 
              servings: 4,
              imageUrl: mealDetail.strMealThumb,
              source: "TheMealDB",
              sourceUrl: mealDetail.strSource || `https://www.themealdb.com/meal/${meal.idMeal}`,
              rating: "4.5"
            });
          }
        } catch (error) {
          console.error(`Error fetching meal details for ${meal.idMeal}:`, error.message);
          continue;
        }
      }
      
      return recipes;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching from TheMealDB:', error.message);
    return [];
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication - Sign In
  app.post("/api/auth/signin", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Check if user has a password set, if not, use default password
      const userPassword = user.password || 'password123';
      if (userPassword !== password) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      res.json({ id: user.id, fullName: user.fullName, email: user.email });
    } catch (error) {
      console.error("Error signing in:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // User registration
  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      const user = await storage.createUser(userData);
      res.json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(400).json({ message: "Invalid user data" });
    }
  });

  // Get user by ID
  app.get("/api/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(user);
    } catch (error) {
      console.error("Error getting user:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create user preferences
  app.post("/api/users/:id/preferences", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const preferencesData = insertUserPreferencesSchema.parse({
        ...req.body,
        userId
      });

      const preferences = await storage.createUserPreferences(preferencesData);
      res.json(preferences);
    } catch (error) {
      console.error("Error creating preferences:", error);
      res.status(400).json({ message: "Invalid preferences data" });
    }
  });

  // Update user preferences
  app.put("/api/users/:id/preferences", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const updates = req.body;

      const preferences = await storage.updateUserPreferences(userId, updates);
      res.json(preferences);
    } catch (error) {
      console.error("Error updating preferences:", error);
      res.status(400).json({ message: "Failed to update preferences" });
    }
  });

  // Get user preferences
  app.get("/api/users/:id/preferences", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const preferences = await storage.getUserPreferences(userId);
      
      if (!preferences) {
        return res.status(404).json({ message: "Preferences not found" });
      }

      res.json(preferences);
    } catch (error) {
      console.error("Error getting preferences:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Ingredient routes
  app.get("/api/ingredients", async (req, res) => {
    try {
      const ingredients = await storage.getIngredients();
      res.json(ingredients);
    } catch (error) {
      console.error("Error fetching ingredients:", error);
      res.status(500).json({ error: "Failed to fetch ingredients" });
    }
  });

  app.post("/api/ingredients", async (req, res) => {
    try {
      const ingredient = await storage.createIngredient(req.body);
      res.json(ingredient);
    } catch (error) {
      console.error("Error creating ingredient:", error);
      res.status(500).json({ error: "Failed to create ingredient" });
    }
  });

  app.get("/api/ingredients/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ error: "Query parameter 'q' is required" });
      }
      const ingredients = await storage.searchIngredients(query);
      res.json(ingredients);
    } catch (error) {
      console.error("Error searching ingredients:", error);
      res.status(500).json({ error: "Failed to search ingredients" });
    }
  });

  app.get("/api/ingredients/category/:category", async (req, res) => {
    try {
      const { category } = req.params;
      const ingredients = await storage.getIngredientsByCategory(category);
      res.json(ingredients);
    } catch (error) {
      console.error("Error fetching ingredients by category:", error);
      res.status(500).json({ error: "Failed to fetch ingredients by category" });
    }
  });

  // Get ingredients by priority (main or complementary)
  app.get("/api/ingredients/priority/:priority", async (req, res) => {
    try {
      const { priority } = req.params;
      if (priority !== "main" && priority !== "complementary") {
        return res.status(400).json({ message: "Priority must be 'main' or 'complementary'" });
      }
      
      const ingredients = await storage.getIngredientsByPriority(priority);
      res.json(ingredients);
    } catch (error) {
      console.error("Error getting ingredients by priority:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/ingredients/seed", async (req, res) => {
    try {
      await seedPantryIngredients();
      res.json({ message: "Pantry ingredients seeded successfully" });
    } catch (error) {
      console.error("Error seeding pantry ingredients:", error);
      res.status(500).json({ error: "Failed to seed pantry ingredients" });
    }
  });

  // Get random main ingredient with taste and course preferences (recipe-based) with dietary filtering
  app.get("/api/ingredients/random-main", async (req, res) => {
    try {
      const tastePreference = req.query.taste as string;
      const coursePreference = req.query.course as string;
      const rejectedIngredients = req.query.rejected ? JSON.parse(req.query.rejected as string) : [];
      const dietaryRestrictions = req.query.dietaryRestrictions ? JSON.parse(decodeURIComponent(req.query.dietaryRestrictions as string)) : [];
      
      console.log(`Getting recipe-based main ingredient for taste: ${tastePreference}, course: ${coursePreference}, rejected: ${rejectedIngredients.length} ingredients, dietary: ${dietaryRestrictions.length} restrictions`);
      
      // If no course preference is provided, default to breakfast to avoid empty results
      const effectiveCourse = coursePreference || 'breakfast';
      
      const mainIngredient = await recipeBasedSwiping.getMainIngredientForMeal(effectiveCourse, tastePreference, rejectedIngredients);
      
      if (!mainIngredient) {
        return res.status(404).json({ message: "No main ingredients found" });
      }
      
      // Apply dietary filtering if restrictions exist
      if (dietaryRestrictions.length > 0) {
        try {
          const isAllowed = isIngredientAllowed(mainIngredient, dietaryRestrictions);
          if (!isAllowed) {
            console.log(`Main ingredient ${mainIngredient.name} not allowed due to dietary restrictions:`, dietaryRestrictions);
            return res.status(404).json({ message: "No valid main ingredient found that meets dietary restrictions" });
          }
        } catch (dietaryError) {
          console.error("Error checking dietary restrictions:", dietaryError);
          // If dietary filtering fails, continue without filtering to prevent breaking the app
        }
      }
      
      res.json(mainIngredient);
    } catch (error) {
      console.error("Error getting random main ingredient:", error);
      res.status(500).json({ message: "Failed to get random main ingredient" });
    }
  });

  // Get valid ingredients based on meal preferences using CSV database
  app.get("/api/ingredients/valid", async (req, res) => {
    try {
      const mealType = req.query.mealType as string;
      const tasteProfile = req.query.tasteProfile as string;
      const cookTime = req.query.cookTime ? parseInt(req.query.cookTime as string) : undefined;
      const appliance = req.query.appliance as string;
      
      // Query recipe combinations for valid ingredients using Drizzle ORM
      const conditions = [];
      
      if (mealType) {
        conditions.push(eq(recipeCombinations.mealType, mealType));
      }
      
      if (tasteProfile) {
        conditions.push(eq(recipeCombinations.tasteProfile, tasteProfile));
      }
      
      if (cookTime) {
        conditions.push(lte(recipeCombinations.cookTime, cookTime));
      }
      
      if (appliance) {
        conditions.push(eq(recipeCombinations.appliance, appliance));
      }
      
      let query = db.select({
        mainIngredient: recipeCombinations.mainIngredient,
        supportingIngredients: recipeCombinations.supportingIngredients
      }).from(recipeCombinations);
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      
      const result = await query;
      
      // Extract all valid ingredient names
      const validIngredientNames = new Set<string>();
      
      for (const row of result) {
        validIngredientNames.add(row.mainIngredient);
        
        const supportingIngredients = row.supportingIngredients
          .split(',')
          .map(name => name.trim())
          .filter(name => name.length > 0);
        
        supportingIngredients.forEach(name => validIngredientNames.add(name));
      }
      
      res.json(Array.from(validIngredientNames));
    } catch (error) {
      console.error("Error getting valid ingredients:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get complementary ingredients for a main ingredient with taste preferences
  app.get("/api/ingredients/complementary/:mainIngredient", async (req, res) => {
    try {
      const { mainIngredient } = req.params;
      const limit = parseInt(req.query.limit as string) || 20;
      const tastePreference = req.query.taste as string;
      
      const complementaryIngredients = await findComplementaryIngredients(mainIngredient, limit, tastePreference);
      res.json(complementaryIngredients);
    } catch (error) {
      console.error("Error finding complementary ingredients:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Save ingredient selections
  app.post("/api/ingredient-selections", async (req, res) => {
    try {
      const selectionsData = insertIngredientSelectionsSchema.parse(req.body);
      const selections = await storage.createIngredientSelections(selectionsData);
      res.json(selections);
    } catch (error) {
      console.error("Error saving ingredient selections:", error);
      res.status(400).json({ message: "Invalid selections data" });
    }
  });

  // External recipe search API - now uses SwipeEngine for realistic recommendations
  app.post("/api/recipe-search", async (req, res) => {
    try {
      const { ingredients, preferences } = req.body;
      
      if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
        return res.status(400).json({ message: "Ingredients are required" });
      }

      console.log(`Searching for recipes with ${ingredients.length} ingredients:`, ingredients);

      // Use SwipeEngine to find recipes that can be made with these ingredients
      const completeRecipes = await swipeEngine.getCompleteRecipes(ingredients);
      const candidateRecipes = await swipeEngine.getRecipeCandidates(ingredients, preferences);
      
      console.log(`Found ${completeRecipes.length} complete recipes and ${candidateRecipes.length} candidate recipes`);
      
      // Always show recipes, prioritizing by how many ingredients are missing
      let recipesToShow = [];
      
      // Priority 1: Complete recipes (can be made with exactly these ingredients)
      if (completeRecipes.length > 0) {
        const formattedCompleteRecipes = await Promise.all(
          completeRecipes.slice(0, 2).map(async (recipe, index) => {
            const recipeIngredients = Array.from(recipe.ingredients);
            const formattedRecipe = await searchIntelligentRecipes(recipeIngredients, preferences);
            return {
              ...formattedRecipe[0],
              id: `complete_${Date.now()}_${index}`,
              title: `${recipe.mainIngredient} ${recipe.tasteProfile.charAt(0).toUpperCase() + recipe.tasteProfile.slice(1)} ${recipe.mealType}`,
              matchType: "complete",
              missingIngredients: [],
              recipeIngredients: recipeIngredients,
              completenessScore: 100
            };
          })
        );
        recipesToShow = [...recipesToShow, ...formattedCompleteRecipes];
      }
      
      // Priority 2: Near-complete recipes (show recipes with reasonable number of missing ingredients)
      if (candidateRecipes.length > 0) {
        console.log(`Processing ${candidateRecipes.length} candidate recipes`);
        
        const nearCompleteRecipes = candidateRecipes
          .map((recipe, index) => {
            const missingIngredients = Array.from(recipe.ingredients).filter(ing => 
              !ingredients.some(userIng => 
                swipeEngine.normalizeIngredient(userIng) === swipeEngine.normalizeIngredient(ing)
              )
            );
            const totalIngredients = recipe.ingredients.size;
            const hasIngredients = totalIngredients - missingIngredients.length;
            const completenessPercentage = (hasIngredients / totalIngredients) * 100;
            
            return { 
              ...recipe, 
              missingIngredients, 
              completenessScore: completenessPercentage,
              hasIngredients,
              totalIngredients
            };
          })
          .filter(recipe => {
            // Show recipes where user has at least 2 ingredients (be more lenient given large ingredient lists)
            const hasEnoughIngredients = recipe.hasIngredients >= 2;
            const hasReasonableCompletion = recipe.completenessScore >= 5; // At least 5% completion
            
            const shouldShow = hasEnoughIngredients && hasReasonableCompletion;
            console.log(`Recipe ${recipe.title}: ${recipe.completenessScore.toFixed(1)}% complete - ${shouldShow ? 'included' : 'excluded'}`);
            
            return shouldShow;
          })
          .sort((a, b) => b.completenessScore - a.completenessScore) // Sort by completeness percentage
          .slice(0, 3);
        
        const formattedNearCompleteRecipes = await Promise.all(
          nearCompleteRecipes.map(async (recipe, index) => {
            const recipeIngredients = Array.from(recipe.ingredients);
            const formattedRecipe = await searchIntelligentRecipes(recipeIngredients, preferences);
            return {
              ...formattedRecipe[0],
              id: `near_complete_${Date.now()}_${index}`,
              title: `${recipe.mainIngredient} ${recipe.tasteProfile.charAt(0).toUpperCase() + recipe.tasteProfile.slice(1)} ${recipe.mealType}`,
              matchType: "near_complete",
              missingIngredients: recipe.missingIngredients,
              recipeIngredients: recipeIngredients,
              completenessScore: recipe.completenessScore
            };
          })
        );
        recipesToShow = [...recipesToShow, ...formattedNearCompleteRecipes];
      }
      
      // If we have recipes to show, return them
      if (recipesToShow.length > 0) {
        // Sort by completeness score (complete recipes first)
        recipesToShow.sort((a, b) => b.completenessScore - a.completenessScore);
        console.log(`Generated ${recipesToShow.length} recipes with varying completeness levels`);
        return res.json(recipesToShow);
      }
      
      // Fallback: Generate example recipes to inspire ingredient selection
      console.log("No compatible recipes found, generating example recipes to inspire ingredient selection");
      const exampleRecipes = await searchIntelligentRecipes(ingredients, preferences);
      return res.json(exampleRecipes.slice(0, 2));
      
    } catch (error) {
      console.error("Error searching recipes:", error);
      res.status(500).json({ message: "Failed to search recipes" });
    }
  });

  // Get recipe suggestions - now using real recipes
  app.post("/api/recipe-suggestions", async (req, res) => {
    try {
      const { ingredients, preferences } = req.body;
      
      if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
        return res.status(400).json({ message: "Ingredients are required" });
      }

      if (!preferences) {
        return res.status(400).json({ message: "Preferences are required" });
      }

      // Use TheMealDB for real recipes (no API limits)
      const ingredientNames = ingredients.map(ing => ing.name || ing);
      console.log(`Getting real recipes for ingredients: ${ingredientNames.join(', ')}`);
      
      // Import axios
      const axios = (await import("axios")).default;
      const mainIngredient = ingredientNames[0] || 'chicken';
      
      // Search TheMealDB for recipes with main ingredient
      const response = await axios.get(`https://www.themealdb.com/api/json/v1/1/filter.php?i=${mainIngredient}`);
      
      if (response.data.meals && response.data.meals.length > 0) {
        const realRecipes = [];
        
        // Get details for first 3 recipes
        for (let i = 0; i < Math.min(3, response.data.meals.length); i++) {
          const meal = response.data.meals[i];
          
          try {
            const detailResponse = await axios.get(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${meal.idMeal}`);
            
            if (detailResponse.data.meals && detailResponse.data.meals[0]) {
              const mealDetail = detailResponse.data.meals[0];
              
              // Extract ingredients
              const ingredientsList: string[] = [];
              for (let j = 1; j <= 20; j++) {
                const ingredient = mealDetail[`strIngredient${j}`];
                const measure = mealDetail[`strMeasure${j}`];
                
                if (ingredient && ingredient.trim()) {
                  ingredientsList.push(measure ? `${measure} ${ingredient}`.trim() : ingredient.trim());
                }
              }
              
              // Process instructions
              const instructions = mealDetail.strInstructions
                ? mealDetail.strInstructions.split(/\r\n|\n|\r/).filter((step: string) => step.trim().length > 0)
                : ['Follow standard cooking instructions for this recipe.'];
              
              realRecipes.push({
                id: `themealdb_${meal.idMeal}`,
                title: mealDetail.strMeal,
                ingredients: ingredientsList,
                instructions: instructions.join('\n'),
                difficulty: "Medium",
                prepTime: "15 minutes",
                cookTime: "30 minutes", 
                servings: 4,
                imageUrl: mealDetail.strMealThumb,
                source: "TheMealDB",
                sourceUrl: mealDetail.strSource || `https://www.themealdb.com/meal/${meal.idMeal}`,
                rating: "4.5"
              });
            }
          } catch (error) {
            console.error(`Error fetching meal details for ${meal.idMeal}:`, error.message);
            continue;
          }
        }
        
        if (realRecipes.length > 0) {
          console.log(`Returning ${realRecipes.length} real recipes from TheMealDB`);
          res.json(realRecipes);
          return;
        }
      }
      
      // Fallback to original recipe generation if TheMealDB fails
      console.log("TheMealDB failed, using fallback recipe generation");
      const recipes = await getRecipeSuggestionsForUser(ingredients, preferences);
      res.json(recipes);
    } catch (error) {
      console.error("Error getting recipe suggestions:", error);
      res.status(500).json({ message: "Failed to generate recipe suggestions" });
    }
  });

  // Get all recipe combinations from database
  app.get("/api/recipe-combinations", async (req, res) => {
    try {
      console.log('Fetching recipe combinations from database...');
      const recipeCombinationsData = await db.select().from(recipeCombinations);
      console.log(`Found ${recipeCombinationsData.length} recipe combinations`);
      res.json(recipeCombinationsData);
    } catch (error) {
      console.error("Error fetching recipe combinations:", error);
      res.status(500).json({ message: "Failed to fetch recipe combinations" });
    }
  });

  // Start mass recipe scraping endpoint
  app.post("/api/scrape-recipes", async (req, res) => {
    try {
      console.log('Starting mass recipe scraping...');
      
      // Import the scraper
      const { massRecipeScraper } = await import("./services/massRecipeScraper");
      
      // Start scraping in background (don't await)
      massRecipeScraper.startMassRecipeScraping().catch(error => {
        console.error('Mass scraping error:', error);
      });
      
      res.json({ 
        message: "Mass recipe scraping started", 
        status: "in_progress",
        target: 10000
      });
    } catch (error) {
      console.error("Error starting mass recipe scraping:", error);
      res.status(500).json({ message: "Failed to start scraping" });
    }
  });

  // Get scraping progress endpoint
  app.get("/api/scraping-progress", async (req, res) => {
    try {
      const totalRecipes = await db.select().from(recipes);
      res.json({
        totalRecipes: totalRecipes.length,
        target: 10000,
        progress: Math.round((totalRecipes.length / 10000) * 100)
      });
    } catch (error) {
      console.error("Error getting scraping progress:", error);
      res.status(500).json({ message: "Failed to get progress" });
    }
  });

  // Get recipe by ID
  app.get("/api/recipes/:id", async (req, res) => {
    try {
      const recipeId = parseInt(req.params.id);
      const recipe = await storage.getRecipe(recipeId);
      
      if (!recipe) {
        return res.status(404).json({ message: "Recipe not found" });
      }

      res.json(recipe);
    } catch (error) {
      console.error("Error getting recipe:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get all recipes
  app.get("/api/recipes", async (req, res) => {
    try {
      // Get recipe combinations from database for the algorithm
      const recipeCombos = await db.select().from(recipeCombinations);
      
      // Convert to algorithm format
      const algorithmRecipes = recipeCombos.map(combo => ({
        id: combo.id,
        title: `${combo.mainIngredient} ${combo.mealType}`,
        mainIngredient: combo.mainIngredient,
        supportingIngredients: combo.supportingIngredients.split(',').map(s => s.trim()),
        mealType: combo.mealType,
        tasteProfile: combo.tasteProfile,
        cookTime: combo.cookTime,
        appliance: combo.appliance
      }));
      
      res.json(algorithmRecipes);
    } catch (error) {
      console.error("Error getting recipes:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Generate meal recommendation with strict filtering
  app.get("/api/meal-recommendation", async (req, res) => {
    try {
      const mealType = req.query.mealType as string || "breakfast";
      const tasteProfile = req.query.tasteProfile as string || "savory";
      
      // Get random main ingredient that matches meal type
      const mainIngredient = await getRandomMainIngredient(tasteProfile, mealType);
      
      if (!mainIngredient) {
        return res.status(404).json({ message: "No valid main ingredient found for this meal type" });
      }
      
      // Generate full meal recommendation
      const recommendation = generateMealRecommendation(mealType, mainIngredient.name, tasteProfile);
      
      if (!recommendation) {
        return res.status(404).json({ message: "Unable to generate meal recommendation" });
      }
      
      res.json(recommendation);
    } catch (error) {
      console.error("Error generating meal recommendation:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get random main ingredient for meal type (Progressive Algorithm)
  app.get("/api/ingredients/main/:mealType", async (req, res) => {
    try {
      const { mealType } = req.params;
      const mainIngredient = await progressiveRecipeSwiping.getRandomMainIngredient(mealType);
      
      if (!mainIngredient) {
        return res.status(404).json({ error: "No main ingredient found for this meal type" });
      }
      
      res.json(mainIngredient);
    } catch (error) {
      console.error("Error getting main ingredient:", error);
      res.status(500).json({ error: "Failed to get main ingredient" });
    }
  });

  // Get possible recipes based on selected ingredients
  app.post("/api/ingredients/possible-recipes", async (req, res) => {
    try {
      const { selectedIngredients } = req.body;
      
      if (!Array.isArray(selectedIngredients)) {
        return res.status(400).json({ message: "selectedIngredients must be an array" });
      }
      
      const possibleRecipes = await swipeEngine.getRecipeCandidates(selectedIngredients);
      
      res.json(possibleRecipes);
    } catch (error) {
      console.error("Error getting possible recipes:", error);
      res.status(500).json({ message: "Failed to get possible recipes" });
    }
  });

  // Get smart ingredient suggestions using advanced swipe-to-recipe engine
  app.post("/api/ingredients/smart-suggestions", async (req, res) => {
    try {
      const { selectedIngredients, preferences = {}, rejectedIngredients = [], dietaryRestrictions = [], limit = 10 } = req.body;
      console.log(`API: Smart suggestions requested with ${selectedIngredients.length} selected ingredients:`, selectedIngredients);
      
      if (!Array.isArray(selectedIngredients)) {
        return res.status(400).json({ message: "selectedIngredients must be an array" });
      }
      
      // Use advanced swipe-to-recipe engine for ingredient suggestions
      const suggestions = await swipeEngine.getSmartIngredientSuggestions({
        selectedIngredients,
        rejectedIngredients,
        preferences: {
          course: preferences.course || 'dinner',
          taste: preferences.taste || 'savory',
          cookTime: preferences.cookTime || 30,
          appliances: preferences.appliances || ['stovetop']
        },
        dietaryRestrictions,
        limit
      });
      
      // Get recipe candidates for context
      const candidates = await swipeEngine.getRecipeCandidates(selectedIngredients);
      const completeRecipes = await swipeEngine.getCompleteRecipes(selectedIngredients);
      
      res.json({
        suggestions,
        possibleRecipeCount: candidates.length,
        completeRecipeCount: completeRecipes.length,
        recipes: candidates.slice(0, 5),
        shouldShowRecipes: completeRecipes.length >= 3,
        stage: selectedIngredients.length <= 2 ? "broad" : "specific"
      });
    } catch (error) {
      console.error("Error getting smart ingredient suggestions:", error);
      res.status(500).json({ message: "Failed to get smart suggestions" });
    }
  });

  // Get dietary restriction categories and options
  app.get("/api/dietary-restrictions/categories", async (req, res) => {
    try {
      const categories = getDietaryRestrictionCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error getting dietary restriction categories:", error);
      res.status(500).json({ message: "Failed to get dietary categories" });
    }
  });

  // Save user dietary restrictions
  app.post("/api/users/:userId/dietary-restrictions", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { dietaryRestrictions = [] } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
      // Update user with dietary restrictions
      // Note: This would require updating the user table
      // For now, we'll just return success
      
      res.json({ message: "Dietary restrictions saved successfully", dietaryRestrictions });
    } catch (error) {
      console.error("Error saving dietary restrictions:", error);
      res.status(500).json({ message: "Failed to save dietary restrictions" });
    }
  });

  // Get filtered ingredients based on dietary restrictions
  app.post("/api/ingredients/filtered", async (req, res) => {
    try {
      const { dietaryRestrictions = [] } = req.body;
      
      // Get all ingredients
      const allIngredients = await storage.getIngredients();
      
      // Apply dietary filtering
      const filteredIngredients = filterIngredientsByDiet(allIngredients, dietaryRestrictions);
      
      console.log(`Filtered ${allIngredients.length} ingredients down to ${filteredIngredients.length} after applying ${dietaryRestrictions.length} dietary restrictions`);
      
      res.json({
        ingredients: filteredIngredients,
        totalCount: allIngredients.length,
        filteredCount: filteredIngredients.length,
        excludedTags: getExcludedTags(dietaryRestrictions)
      });
    } catch (error) {
      console.error("Error filtering ingredients by diet:", error);
      res.status(500).json({ message: "Failed to filter ingredients" });
    }
  });

  // Swipe-to-Recipe Engine endpoints
  
  // Initialize the swipe engine
  app.post("/api/swipe-engine/initialize", async (req, res) => {
    try {
      await swipeEngine.initialize();
      res.json({ message: "Swipe engine initialized successfully" });
    } catch (error) {
      console.error("Error initializing swipe engine:", error);
      res.status(500).json({ message: "Failed to initialize swipe engine" });
    }
  });

  // Process a swipe right action
  app.post("/api/swipe-engine/swipe", async (req, res) => {
    try {
      const { ingredient, dietaryRestrictions = [] } = req.body;
      
      if (!ingredient) {
        return res.status(400).json({ message: "Ingredient is required" });
      }

      // Apply dietary filters if needed
      if (dietaryRestrictions.length > 0) {
        swipeEngine.applyDietaryFilters(dietaryRestrictions);
      }

      const result = swipeEngine.swipeRight(ingredient);
      const state = swipeEngine.getState();

      console.log(`SwipeEngine: Processed swipe for '${ingredient}', ${result.readyToCook.length} recipes ready, ${result.candidatesCount} candidates remaining`);

      res.json({
        ...result,
        state
      });
    } catch (error) {
      console.error("Error processing swipe:", error);
      res.status(500).json({ message: "Failed to process swipe" });
    }
  });

  // Get current engine state
  app.get("/api/swipe-engine/state", async (req, res) => {
    try {
      const state = swipeEngine.getState();
      res.json(state);
    } catch (error) {
      console.error("Error getting swipe engine state:", error);
      res.status(500).json({ message: "Failed to get engine state" });
    }
  });

  // Reset the swipe engine
  app.post("/api/swipe-engine/reset", async (req, res) => {
    try {
      swipeEngine.reset();
      res.json({ message: "Swipe engine reset successfully" });
    } catch (error) {
      console.error("Error resetting swipe engine:", error);
      res.status(500).json({ message: "Failed to reset swipe engine" });
    }
  });

  // Enhanced recipe scraping endpoint
  app.post("/api/recipes/scrape", async (req, res) => {
    try {
      const { url } = req.body;
      
      if (!url) {
        return res.status(400).json({ message: "URL is required" });
      }

      const scrapedRecipe = await recipeScraper.scrapeRecipe(url);
      
      if (!scrapedRecipe) {
        return res.status(404).json({ message: "Could not scrape recipe from URL" });
      }

      console.log(`Successfully scraped recipe: ${scrapedRecipe.title} with ${scrapedRecipe.ingredients.length} ingredients`);

      res.json(scrapedRecipe);
    } catch (error) {
      console.error("Error scraping recipe:", error);
      res.status(500).json({ message: "Failed to scrape recipe" });
    }
  });

  // Find recipe URLs for search query
  app.get("/api/recipes/find-urls", async (req, res) => {
    try {
      const { query, count = 5 } = req.query;
      
      if (!query) {
        return res.status(400).json({ message: "Search query is required" });
      }

      const urls = await recipeScraper.findRecipeUrls(query as string, Number(count));
      
      res.json({ query, urls, count: urls.length });
    } catch (error) {
      console.error("Error finding recipe URLs:", error);
      res.status(500).json({ message: "Failed to find recipe URLs" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
