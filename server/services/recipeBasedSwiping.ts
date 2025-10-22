import { db } from "../db";
import { recipeCombinations, ingredients } from "@shared/schema";
import { eq, and, like, sql } from "drizzle-orm";
import { storage } from "../storage";

export interface RecipeMatch {
  id: string;
  mainIngredient: string;
  supportingIngredients: string[];
  mealType: string;
  tasteProfile: string;
  cookTime: number;
  appliance: string;
}

export interface SmartIngredientSuggestion {
  ingredient: any;
  recipeMatches: number;
  commonality: number;
}

export class RecipeBasedSwipingService {
  
  /**
   * Get the first main ingredient for a meal type
   */
  async getMainIngredientForMeal(mealType: string, tasteProfile?: string, rejectedIngredients: string[] = []): Promise<any | null> {
    try {
      console.log(`Looking for recipes with mealType: ${mealType}, tasteProfile: ${tasteProfile}`);
      
      // Capitalize first letter to match database format (Breakfast, Lunch, Dinner)
      const capitalizedMealType = mealType.charAt(0).toUpperCase() + mealType.slice(1).toLowerCase();
      console.log(`Querying with capitalizedMealType: ${capitalizedMealType}`);
      
      // Get all possible recipes for this meal type
      const possibleRecipes = await db.select()
        .from(recipeCombinations)
        .where(eq(recipeCombinations.mealType, capitalizedMealType));
      
      console.log(`Found ${possibleRecipes.length} recipes for meal type: ${capitalizedMealType}`);
      
      if (possibleRecipes.length === 0) return null;
      
      // Get unique main ingredients from these recipes
      const mainIngredients = [...new Set(possibleRecipes.map(r => r.mainIngredient))];
      
      // Filter by taste profile if provided
      let filteredRecipes = possibleRecipes;
      if (tasteProfile) {
        filteredRecipes = possibleRecipes.filter(r => r.tasteProfile === tasteProfile);
        if (filteredRecipes.length === 0) {
          filteredRecipes = possibleRecipes; // Fallback if no taste matches
        }
      }
      
      // Get the most common main ingredients
      const mainIngredientCounts = filteredRecipes.reduce((acc, recipe) => {
        acc[recipe.mainIngredient] = (acc[recipe.mainIngredient] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Sort by frequency and pick one
      const sortedMainIngredients = Object.entries(mainIngredientCounts)
        .sort(([,a], [,b]) => b - a)
        .map(([ingredient]) => ingredient);
      
      // Filter out rejected ingredients
      const availableIngredients = sortedMainIngredients.filter(ingredient => {
        return !rejectedIngredients.some(rejected => 
          ingredient.toLowerCase().includes(rejected.toLowerCase()) ||
          rejected.toLowerCase().includes(ingredient.toLowerCase())
        );
      });
      
      if (availableIngredients.length === 0) {
        console.log("No available ingredients after filtering rejected ones");
        return null;
      }
      
      // Get random from top 3 most common available ingredients
      const topIngredients = availableIngredients.slice(0, 3);
      const selectedMainIngredient = topIngredients[Math.floor(Math.random() * topIngredients.length)];
      
      // Find the actual ingredient record
      const allIngredients = await storage.getIngredients();
      
      // Create a mapping for common ingredient name variations
      const ingredientMapping: Record<string, string> = {
        'greek yogurt': 'yogurt',
        'chicken breast': 'chicken',
        'chicken thighs': 'chicken',
        'ground beef': 'beef',
        'whole wheat pasta': 'pasta',
        'smoothie base': 'protein powder'
      };
      
      const normalizedRecipeIngredient = selectedMainIngredient.toLowerCase();
      const mappedIngredient = ingredientMapping[normalizedRecipeIngredient] || normalizedRecipeIngredient;
      
      const foundIngredient = allIngredients.find(ing => {
        const normalizedIngName = ing.name.toLowerCase();
        return normalizedIngName.includes(mappedIngredient) ||
               mappedIngredient.includes(normalizedIngName) ||
               normalizedIngName.includes(normalizedRecipeIngredient) ||
               normalizedRecipeIngredient.includes(normalizedIngName);
      });
      
      if (foundIngredient) {
        return {
          ...foundIngredient,
          priority: "main"
        };
      }
      
      return null;
    } catch (error) {
      console.error("Error getting main ingredient:", error);
      return null;
    }
  }
  
  /**
   * Get possible recipes based on selected ingredients
   */
  async getPossibleRecipes(selectedIngredients: string[]): Promise<RecipeMatch[]> {
    try {
      // Get ALL recipes from the database, not just filtered by main ingredient
      const query = db.select().from(recipeCombinations);
      const allRecipes = await query;
      console.log(`getPossibleRecipes: Found ${allRecipes.length} total recipes in database`);
      console.log(`getPossibleRecipes: Looking for recipes containing all: ${selectedIngredients.join(', ')}`);
      
      // Filter recipes that contain ALL selected ingredients (strict matching)
      const matchingRecipes = allRecipes.filter(recipe => {
        const recipeIngredients = [
          recipe.mainIngredient,
          ...recipe.supportingIngredients.split(',').map(s => s.trim())
        ];
        
        const matches = selectedIngredients.every(selectedIng => 
          recipeIngredients.some(recipeIng => {
            const selectedNorm = selectedIng.toLowerCase().replace(/s$/, ''); // Remove plural 's'
            const recipeNorm = recipeIng.toLowerCase().replace(/s$/, ''); // Remove plural 's'
            
            // Direct matching
            if (recipeIng.toLowerCase().includes(selectedIng.toLowerCase()) ||
                selectedIng.toLowerCase().includes(recipeIng.toLowerCase()) ||
                recipeNorm.includes(selectedNorm) ||
                selectedNorm.includes(recipeNorm)) {
              return true;
            }
            
            // Specific ingredient name mappings
            const ingredientMappings: { [key: string]: string } = {
              'almond': 'almond butter',
              'granola bar': 'granola',
              'granola bars': 'granola',
              'banana': 'banana',
              'bananas': 'banana',
              'strawberry': 'strawberries',
              'strawberries': 'strawberries',
              'blueberry': 'blueberries',
              'blueberries': 'blueberries',
              'walnut': 'walnuts',
              'walnuts': 'walnuts',
              'yogurt': 'greek yogurt',
              'greek yogurt': 'greek yogurt'
            };
            
            const mappedSelected = ingredientMappings[selectedNorm] || selectedNorm;
            const mappedRecipe = ingredientMappings[recipeNorm] || recipeNorm;
            
            return mappedSelected === mappedRecipe ||
                   recipeNorm.includes(mappedSelected) ||
                   mappedRecipe.includes(selectedNorm);
          })
        );
        
        if (!matches && selectedIngredients.length > 6) {
          console.log(`Recipe ${recipe.id} rejected - ingredients: [${recipeIngredients.join(', ')}]`);
        }
        
        return matches;
      });
      
      console.log(`getPossibleRecipes: ${matchingRecipes.length} recipes match all selected ingredients`);
      
      return matchingRecipes.map(recipe => ({
        id: recipe.id.toString(),
        mainIngredient: recipe.mainIngredient,
        supportingIngredients: recipe.supportingIngredients.split(',').map(s => s.trim()),
        mealType: recipe.mealType,
        tasteProfile: recipe.tasteProfile,
        cookTime: recipe.cookTime,
        appliance: recipe.appliance
      }));
    } catch (error) {
      console.error("Error getting possible recipes:", error);
      return [];
    }
  }
  
  /**
   * Get next best ingredient suggestion based on remaining recipes
   */
  async getNextIngredientSuggestion(
    selectedIngredients: string[], 
    possibleRecipes: RecipeMatch[]
  ): Promise<SmartIngredientSuggestion | null> {
    try {
      if (possibleRecipes.length === 0) return null;
      
      // Get all supporting ingredients from remaining recipes
      const supportingIngredients = possibleRecipes.flatMap(recipe => 
        recipe.supportingIngredients
      );
      
      // Remove already selected ingredients
      const availableIngredients = supportingIngredients.filter(ingredient => 
        !selectedIngredients.some(selected => 
          selected.toLowerCase().includes(ingredient.toLowerCase()) ||
          ingredient.toLowerCase().includes(selected.toLowerCase())
        )
      );
      
      // Count frequency of each ingredient
      const ingredientCounts = availableIngredients.reduce((acc, ingredient) => {
        acc[ingredient] = (acc[ingredient] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Sort by frequency (most common first)
      const sortedIngredients = Object.entries(ingredientCounts)
        .sort(([,a], [,b]) => b - a)
        .map(([ingredient, count]) => ({ ingredient, count }));
      
      if (sortedIngredients.length === 0) return null;
      
      // Get the most common ingredient that appears in multiple recipes
      const bestIngredient = sortedIngredients[0];
      
      // Find the actual ingredient record
      const allIngredients = await storage.getIngredients();
      const foundIngredient = allIngredients.find(ing => 
        ing.name.toLowerCase().includes(bestIngredient.ingredient.toLowerCase()) ||
        bestIngredient.ingredient.toLowerCase().includes(ing.name.toLowerCase())
      );
      
      if (foundIngredient) {
        return {
          ingredient: {
            ...foundIngredient,
            priority: "complementary"
          },
          recipeMatches: bestIngredient.count,
          commonality: bestIngredient.count / possibleRecipes.length
        };
      }
      
      return null;
    } catch (error) {
      console.error("Error getting next ingredient suggestion:", error);
      return null;
    }
  }
  
  /**
   * Get multiple ingredient suggestions for variety
   */
  async getIngredientSuggestions(
    selectedIngredients: string[],
    possibleRecipes: RecipeMatch[],
    limit: number = 10
  ): Promise<SmartIngredientSuggestion[]> {
    try {
      if (possibleRecipes.length === 0) return [];
      
      // Get all supporting ingredients from remaining recipes
      const supportingIngredients = possibleRecipes.flatMap(recipe => 
        recipe.supportingIngredients
      );
      
      console.log(`Selected ingredients: ${selectedIngredients.join(', ')}`);
      console.log(`Supporting ingredients from recipes: ${supportingIngredients.slice(0, 10).join(', ')}...`);
      
      // Remove already selected ingredients
      const availableIngredients = supportingIngredients.filter(ingredient => 
        !selectedIngredients.some(selected => 
          selected.toLowerCase().includes(ingredient.toLowerCase()) ||
          ingredient.toLowerCase().includes(selected.toLowerCase())
        )
      );
      
      console.log(`Available ingredients after filtering: ${availableIngredients.slice(0, 10).join(', ')}...`);
      
      // Count frequency of each ingredient
      const ingredientCounts = availableIngredients.reduce((acc, ingredient) => {
        acc[ingredient] = (acc[ingredient] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Sort by frequency and take top suggestions
      const sortedIngredients = Object.entries(ingredientCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, limit)
        .map(([ingredient, count]) => ({ ingredient, count }));
      
      // Find actual ingredient records
      const allIngredients = await storage.getIngredients();
      const suggestions: SmartIngredientSuggestion[] = [];
      
      for (const { ingredient, count } of sortedIngredients) {
        const foundIngredient = allIngredients.find(ing => 
          ing.name.toLowerCase().includes(ingredient.toLowerCase()) ||
          ingredient.toLowerCase().includes(ing.name.toLowerCase())
        );
        
        if (foundIngredient) {
          suggestions.push({
            ingredient: {
              ...foundIngredient,
              priority: "complementary"
            },
            recipeMatches: count,
            commonality: count / possibleRecipes.length
          });
        }
      }
      
      return suggestions;
    } catch (error) {
      console.error("Error getting ingredient suggestions:", error);
      return [];
    }
  }
}

export const recipeBasedSwiping = new RecipeBasedSwipingService();