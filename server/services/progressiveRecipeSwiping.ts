import { db } from "../db";
import { recipeCombinations, ingredients } from "@shared/schema";
import { eq, and, or, like, sql } from "drizzle-orm";

export interface ProgressiveRecipeMatch {
  id: string;
  mainIngredient: string;
  supportingIngredients: string[];
  mealType: string;
  tasteProfile: string;
  cookTime: number;
  appliance: string;
}

export interface ProgressiveIngredientSuggestion {
  ingredient: any;
  recipeMatches: number;
  flexibility: number; // how many different recipe types this ingredient fits
  stage: "broad" | "specific"; // whether this is a broad or specific ingredient
}

export class ProgressiveRecipeSwipingService {
  private MIN_RECIPES_THRESHOLD = 5;
  private BROAD_STAGE_COUNT = 4; // First 4 ingredients should be broad

  /**
   * Get a random main ingredient based on meal type
   */
  async getRandomMainIngredient(mealType: string): Promise<any | null> {
    try {
      // Get all main ingredients for this meal type
      const mainIngredientsQuery = await db
        .select({ mainIngredient: recipeCombinations.mainIngredient })
        .from(recipeCombinations)
        .where(eq(recipeCombinations.mealType, mealType))
        .groupBy(recipeCombinations.mainIngredient);

      if (mainIngredientsQuery.length === 0) {
        return null;
      }

      // Pick a random main ingredient
      const randomIndex = Math.floor(Math.random() * mainIngredientsQuery.length);
      const selectedMainIngredient = mainIngredientsQuery[randomIndex].mainIngredient;

      // Find this ingredient in our ingredients database - simplified to avoid array search issues
      const ingredientQuery = await db
        .select()
        .from(ingredients)
        .where(
          or(
            eq(ingredients.name, selectedMainIngredient),
            like(ingredients.name, `%${selectedMainIngredient}%`)
          )
        );

      if (ingredientQuery.length > 0) {
        return { ...ingredientQuery[0], priority: "main" };
      }

      // If not found in ingredients table, create a basic representation
      return {
        id: Math.random().toString(36).substr(2, 9),
        name: selectedMainIngredient,
        description: `${selectedMainIngredient} - a versatile main ingredient`,
        imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200",
        category: "protein",
        tags: ["main", "protein"],
        isCommon: true,
        searchTerms: [selectedMainIngredient.toLowerCase()],
        priority: "main"
      };
    } catch (error) {
      console.error("Error getting random main ingredient:", error);
      return null;
    }
  }

  /**
   * Get possible recipes that contain all selected ingredients
   */
  async getPossibleRecipes(selectedIngredients: string[]): Promise<ProgressiveRecipeMatch[]> {
    try {
      console.log(`getPossibleRecipes: Looking for recipes containing all: ${selectedIngredients.join(', ')}`);

      // Get all recipes from database
      const allRecipes = await db.select().from(recipeCombinations);
      console.log(`getPossibleRecipes: Found ${allRecipes.length} total recipes in database`);

      const matchingRecipes: ProgressiveRecipeMatch[] = [];

      let testCounter = 0;
      let pastaRecipeFound = false;
      
      for (const recipe of allRecipes) {
        // Supporting ingredients should now be properly returned as arrays from Drizzle
        const supportingIngredients = Array.isArray(recipe.supportingIngredients) 
          ? recipe.supportingIngredients 
          : [];
        
        // Debug: Count Whole Wheat Pasta recipes when searching for Spaghetti pasta
        if (selectedIngredients.includes('Spaghetti pasta') && recipe.mainIngredient === 'Whole Wheat Pasta') {
          if (!pastaRecipeFound) {
            console.log(`getPossibleRecipes: Found Whole Wheat Pasta recipe when searching for Spaghetti pasta`);
            console.log(`getPossibleRecipes: Supporting ingredients count: ${supportingIngredients.length}`);
            console.log(`getPossibleRecipes: Supporting ingredients type: ${typeof supportingIngredients}`);
            console.log(`getPossibleRecipes: First 5 supporting ingredients: ${supportingIngredients.slice(0, 5).join(', ')}`);
            pastaRecipeFound = true;
          }
        }

        // Create full ingredient list (main + supporting)
        const allRecipeIngredients = [recipe.mainIngredient, ...supportingIngredients];

        // Check if ALL selected ingredients are present in this recipe
        const allIngredientsMatch = selectedIngredients.every(selectedIng => {
          const found = allRecipeIngredients.some(recipeIng => 
            this.ingredientNamesMatch(recipeIng, selectedIng)
          );
          
          // Debug logging for pasta issue - let's test specific cases
          if (selectedIng.toLowerCase().includes('pasta') || selectedIng.toLowerCase().includes('spaghetti')) {
            if (recipe.mainIngredient === 'Whole Wheat Pasta') {
              console.log(`getPossibleRecipes: Testing "${selectedIng}" against "${recipe.mainIngredient}"`);
              console.log(`getPossibleRecipes: Supporting ingredients: ${supportingIngredients.slice(0, 5).join(', ')}...`);
              console.log(`getPossibleRecipes: All recipe ingredients: ${allRecipeIngredients.slice(0, 10).join(', ')}...`);
              console.log(`getPossibleRecipes: Match found: ${found}`);
              
              // Test direct matching
              const directMatch = this.ingredientNamesMatch('Whole Wheat Pasta', selectedIng);
              console.log(`getPossibleRecipes: Direct match test: ${directMatch}`);
            }
          }
          
          return found;
        });

        if (allIngredientsMatch) {
          matchingRecipes.push({
            id: recipe.id.toString(),
            mainIngredient: recipe.mainIngredient,
            supportingIngredients,
            mealType: recipe.mealType,
            tasteProfile: recipe.tasteProfile,
            cookTime: recipe.cookTime,
            appliance: recipe.appliance
          });
        }
      }

      console.log(`getPossibleRecipes: ${matchingRecipes.length} recipes match all selected ingredients`);
      return matchingRecipes;
    } catch (error) {
      console.error("Error getting possible recipes:", error);
      return [];
    }
  }

  /**
   * Get progressive ingredient suggestions based on current selections
   */
  async getProgressiveIngredientSuggestions(
    selectedIngredients: string[],
    limit: number = 10
  ): Promise<ProgressiveIngredientSuggestion[]> {
    try {
      // Get current possible recipes
      const possibleRecipes = await this.getPossibleRecipes(selectedIngredients);
      
      if (possibleRecipes.length === 0) {
        return [];
      }

      // Determine if we're in broad or specific stage
      const iseBroadStage = selectedIngredients.length <= this.BROAD_STAGE_COUNT;
      
      // Collect all ingredients from possible recipes
      const ingredientCounts = new Map<string, number>();
      const ingredientRecipeTypes = new Map<string, Set<string>>();

      possibleRecipes.forEach(recipe => {
        const allIngredients = [recipe.mainIngredient, ...recipe.supportingIngredients];
        
        allIngredients.forEach(ingredient => {
          if (!selectedIngredients.some(selected => this.ingredientNamesMatch(selected, ingredient))) {
            // Count occurrences
            ingredientCounts.set(ingredient, (ingredientCounts.get(ingredient) || 0) + 1);
            
            // Track recipe types this ingredient appears in
            if (!ingredientRecipeTypes.has(ingredient)) {
              ingredientRecipeTypes.set(ingredient, new Set());
            }
            ingredientRecipeTypes.get(ingredient)!.add(`${recipe.mealType}-${recipe.tasteProfile}-${recipe.appliance}`);
          }
        });
      });

      // Define broad vs specific ingredients
      const broadIngredients = new Set([
        "olive oil", "garlic", "onion", "onions", "bell peppers", "bell pepper", "rice", "brown rice",
        "lemon", "lemon juice", "tomato", "tomatoes", "spinach", "salt", "black pepper", "pepper",
        "milk", "cheese", "butter", "cilantro", "parsley", "basil", "oregano"
      ]);

      // Convert to suggestions
      const suggestions: ProgressiveIngredientSuggestion[] = [];
      
      for (const [ingredientName, count] of Array.from(ingredientCounts.entries())) {
        // Create ingredient representation without database lookup to avoid SQL errors
        const ingredient = {
          id: Math.random().toString(36).substr(2, 9),
          name: ingredientName,
          description: `${ingredientName} - a versatile cooking ingredient`,
          imageUrl: this.getIngredientImageUrl(ingredientName),
          category: this.getIngredientCategory(ingredientName),
          tags: this.getIngredientTags(ingredientName),
          isCommon: true,
          searchTerms: [ingredientName.toLowerCase()],
          priority: "complementary"
        };

        const flexibility = ingredientRecipeTypes.get(ingredientName)?.size || 0;
        const isBroad = broadIngredients.has(ingredientName.toLowerCase());
        
        // Filter based on stage
        if (iseBroadStage && !isBroad && flexibility < 3) {
          continue; // Skip specific ingredients in broad stage
        }
        
        if (!iseBroadStage && isBroad && count < possibleRecipes.length * 0.3) {
          continue; // Skip overly broad ingredients in specific stage
        }

        suggestions.push({
          ingredient,
          recipeMatches: count,
          flexibility,
          stage: isBroad ? "broad" : "specific"
        });
      }

      // Sort suggestions
      suggestions.sort((a, b) => {
        if (iseBroadStage) {
          // In broad stage, prioritize high flexibility and high match count
          return (b.flexibility * 10 + b.recipeMatches) - (a.flexibility * 10 + a.recipeMatches);
        } else {
          // In specific stage, balance flexibility and match count
          return (b.recipeMatches * 2 + b.flexibility) - (a.recipeMatches * 2 + a.flexibility);
        }
      });

      // Apply backup strategy if we're running low on recipes
      if (possibleRecipes.length < this.MIN_RECIPES_THRESHOLD) {
        // Prioritize ingredients that appear in more recipes
        suggestions.sort((a, b) => b.recipeMatches - a.recipeMatches);
      }

      return suggestions.slice(0, limit);
    } catch (error) {
      console.error("Error getting progressive ingredient suggestions:", error);
      return [];
    }
  }

  /**
   * Check if we should show recipes (when narrowed down enough)
   */
  shouldShowRecipes(selectedIngredients: string[], possibleRecipes: ProgressiveRecipeMatch[]): boolean {
    // Show recipes if we have a good number of ingredients and reasonable recipe count
    return selectedIngredients.length >= 6 && possibleRecipes.length <= 10 && possibleRecipes.length > 0;
  }

  /**
   * Get ingredient image URL based on ingredient type
   */
  private getIngredientImageUrl(ingredientName: string): string {
    const name = ingredientName.toLowerCase();
    
    if (name.includes('oil')) return "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200";
    if (name.includes('cheese')) return "https://images.unsplash.com/photo-1447279506476-3faec8071eee?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200";
    if (name.includes('pepper') || name.includes('spice')) return "https://images.unsplash.com/photo-1596040033229-a06c4d68e1ba?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200";
    if (name.includes('onion') || name.includes('garlic')) return "https://images.unsplash.com/photo-1518977676601-b53f82aba655?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200";
    if (name.includes('tomato')) return "https://images.unsplash.com/photo-1546094096-0df4bcaaa337?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200";
    if (name.includes('spinach') || name.includes('leaf')) return "https://images.unsplash.com/photo-1576045057995-568f588f82fb?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200";
    if (name.includes('milk') || name.includes('dairy')) return "https://images.unsplash.com/photo-1447279506476-3faec8071eee?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200";
    
    return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200";
  }

  /**
   * Get ingredient category based on ingredient type
   */
  private getIngredientCategory(ingredientName: string): string {
    const name = ingredientName.toLowerCase();
    
    if (name.includes('oil') || name.includes('butter')) return "oil";
    if (name.includes('cheese') || name.includes('milk') || name.includes('yogurt')) return "dairy";
    if (name.includes('pepper') || name.includes('salt') || name.includes('spice') || name.includes('sauce')) return "spice";
    if (name.includes('onion') || name.includes('garlic') || name.includes('spinach') || name.includes('tomato') || name.includes('mushroom')) return "vegetable";
    if (name.includes('rice') || name.includes('pasta') || name.includes('bread') || name.includes('toast')) return "grain";
    if (name.includes('chicken') || name.includes('beef') || name.includes('pork') || name.includes('bacon')) return "protein";
    
    return "ingredient";
  }

  /**
   * Get ingredient tags based on ingredient type
   */
  private getIngredientTags(ingredientName: string): string[] {
    const name = ingredientName.toLowerCase();
    
    if (name.includes('oil')) return ["cooking", "healthy", "essential"];
    if (name.includes('cheese')) return ["dairy", "protein", "melting"];
    if (name.includes('pepper')) return ["spicy", "seasoning", "versatile"];
    if (name.includes('onion') || name.includes('garlic')) return ["aromatic", "base", "essential"];
    if (name.includes('spinach')) return ["leafy", "nutritious", "mild"];
    if (name.includes('tomato')) return ["fresh", "acidic", "versatile"];
    
    return ["cooking", "versatile"];
  }

  /**
   * Helper method to check if ingredient names match (fuzzy matching)
   */
  private ingredientNamesMatch(dbIngredient: string, userIngredient: string): boolean {
    const normalize = (str: string) => str.toLowerCase().trim();
    
    const dbNorm = normalize(dbIngredient);
    const userNorm = normalize(userIngredient);
    
    // Debug pasta matching
    if (userIngredient.toLowerCase().includes('pasta') || userIngredient.toLowerCase().includes('spaghetti')) {
      console.log(`ingredientNamesMatch: Comparing "${dbIngredient}" vs "${userIngredient}"`);
      console.log(`ingredientNamesMatch: Normalized: "${dbNorm}" vs "${userNorm}"`);
    }
    
    // Direct match
    if (dbNorm === userNorm) {
      if (userIngredient.toLowerCase().includes('pasta') || userIngredient.toLowerCase().includes('spaghetti')) {
        console.log(`ingredientNamesMatch: Direct match found!`);
      }
      return true;
    }
    
    // Handle common variations
    const variations: { [key: string]: string[] } = {
      "greek yogurt": ["yogurt", "greek yogurt"],
      "yogurt": ["greek yogurt", "yogurt"],
      "chicken breast": ["chicken", "chicken breast", "frozen chicken"],
      "chicken": ["chicken breast", "chicken", "frozen chicken"],
      "frozen chicken": ["chicken breast", "chicken", "frozen chicken"],
      "bell peppers": ["bell pepper", "bell peppers"],
      "bell pepper": ["bell peppers", "bell pepper"],
      "onions": ["onion", "onions"],
      "onion": ["onions", "onion"],
      "tomatoes": ["tomato", "tomatoes"],
      "tomato": ["tomatoes", "tomato"],
      "almonds": ["almond", "almonds", "almond butter"],
      "almond": ["almonds", "almond", "almond butter"],
      "bananas": ["banana", "bananas"],
      "banana": ["bananas", "banana"],
      "granola bars": ["granola", "granola bars"],
      "granola": ["granola bars", "granola"],
      "whole wheat pasta": ["pasta", "spaghetti pasta", "spaghetti", "whole wheat pasta"],
      "spaghetti pasta": ["pasta", "spaghetti pasta", "spaghetti", "whole wheat pasta"],
      "pasta": ["spaghetti pasta", "spaghetti", "whole wheat pasta"],
      "spaghetti": ["spaghetti pasta", "pasta", "whole wheat pasta"],
      "turkey breast": ["turkey", "turkey breast"],
      "turkey": ["turkey breast", "turkey"],
      "canned tuna": ["tuna", "canned tuna"],
      "tuna": ["canned tuna", "tuna"]
    };
    
    // Check variations
    const userVariations = variations[userNorm] || [userNorm];
    const dbVariations = variations[dbNorm] || [dbNorm];
    
    return userVariations.some(uVar => 
      dbVariations.some(dVar => 
        uVar === dVar || uVar.includes(dVar) || dVar.includes(uVar)
      )
    );
  }
}

export const progressiveRecipeSwiping = new ProgressiveRecipeSwipingService();