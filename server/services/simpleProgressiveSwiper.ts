import { db } from "../db";
import { recipeCombinations } from "@shared/schema";

export interface SimpleIngredientSuggestion {
  ingredient: {
    id: string;
    name: string;
    description: string;
    imageUrl: string;
    category: string;
    tags: string[];
    isCommon: boolean;
    searchTerms: string[];
    priority: string;
  };
  recipeMatches: number;
  flexibility: number;
  stage: "broad" | "specific";
}

export class SimpleProgressiveSwiper {
  private MIN_RECIPES_THRESHOLD = 5;
  private BROAD_STAGE_COUNT = 4;

  /**
   * Get possible recipes that contain all selected ingredients
   */
  async getPossibleRecipes(selectedIngredients: string[]) {
    try {
      console.log(`getPossibleRecipes: Looking for recipes containing all: ${selectedIngredients.join(', ')}`);

      const allRecipes = await db.select().from(recipeCombinations);
      console.log(`getPossibleRecipes: Found ${allRecipes.length} total recipes in database`);

      const matchingRecipes = [];

      for (const recipe of allRecipes) {
        // Parse supporting ingredients - now they're arrays from the database
        const supportingIngredients = Array.isArray(recipe.supportingIngredients) 
          ? recipe.supportingIngredients 
          : [];

        const allRecipeIngredients = [recipe.mainIngredient, ...supportingIngredients];

        const allIngredientsMatch = selectedIngredients.every(selectedIng => {
          const found = allRecipeIngredients.some(recipeIng => 
            this.ingredientNamesMatch(recipeIng, selectedIng)
          );
          
          // Debug logging can be enabled here if needed
          
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
   * Get progressive ingredient suggestions
   */
  async getProgressiveIngredientSuggestions(
    selectedIngredients: string[],
    rejectedIngredients: string[] = [],
    limit: number = 10
  ): Promise<SimpleIngredientSuggestion[]> {
    try {
      const possibleRecipes = await this.getPossibleRecipes(selectedIngredients);
      
      if (possibleRecipes.length === 0) {
        return [];
      }

      const iseBroadStage = selectedIngredients.length <= this.BROAD_STAGE_COUNT;
      
      // Collect all ingredients from possible recipes
      const ingredientCounts = new Map<string, number>();
      const ingredientRecipeTypes = new Map<string, Set<string>>();

      possibleRecipes.forEach(recipe => {
        const allIngredients = [recipe.mainIngredient, ...recipe.supportingIngredients];
        
        allIngredients.forEach(ingredient => {
          if (!selectedIngredients.some(selected => this.ingredientNamesMatch(selected, ingredient))) {
            ingredientCounts.set(ingredient, (ingredientCounts.get(ingredient) || 0) + 1);
            
            if (!ingredientRecipeTypes.has(ingredient)) {
              ingredientRecipeTypes.set(ingredient, new Set());
            }
            ingredientRecipeTypes.get(ingredient)!.add(`${recipe.mealType}-${recipe.tasteProfile}-${recipe.appliance}`);
          }
        });
      });

      // Define broad vs specific ingredients
      const broadIngredients = new Set([
        "olive oil", "garlic", "onions", "onion", "bell peppers", "bell pepper", "rice", "brown rice",
        "lemon", "lemon juice", "tomatoes", "tomato", "spinach", "salt", "black pepper", "pepper",
        "milk", "cheese", "butter", "cilantro", "parsley", "basil", "oregano", "mushrooms", "mushroom"
      ]);

      // Convert to suggestions
      const suggestions: SimpleIngredientSuggestion[] = [];
      
      Array.from(ingredientCounts.entries()).forEach(([ingredientName, count]) => {
        // Skip rejected ingredients
        if (rejectedIngredients.some(rejected => this.ingredientNamesMatch(ingredientName, rejected))) {
          return;
        }
        
        // Skip already selected ingredients  
        if (selectedIngredients.some(selected => this.ingredientNamesMatch(ingredientName, selected))) {
          console.log(`Skipping already selected ingredient: ${ingredientName}`);
          return;
        }
        
        const ingredient = this.createIngredient(ingredientName);
        const flexibility = ingredientRecipeTypes.get(ingredientName)?.size || 0;
        const isBroad = broadIngredients.has(ingredientName.toLowerCase());
        
        // Filter based on stage
        if (iseBroadStage && !isBroad && flexibility < 3) {
          return; // Skip specific ingredients in broad stage
        }
        
        if (!iseBroadStage && isBroad && count < possibleRecipes.length * 0.3) {
          return; // Skip overly broad ingredients in specific stage
        }

        suggestions.push({
          ingredient,
          recipeMatches: count,
          flexibility,
          stage: isBroad ? "broad" : "specific"
        });
      });

      // Sort suggestions
      suggestions.sort((a, b) => {
        if (iseBroadStage) {
          return (b.flexibility * 10 + b.recipeMatches) - (a.flexibility * 10 + a.recipeMatches);
        } else {
          return (b.recipeMatches * 2 + b.flexibility) - (a.recipeMatches * 2 + a.flexibility);
        }
      });

      // Apply backup strategy if we're running low on recipes
      if (possibleRecipes.length < this.MIN_RECIPES_THRESHOLD) {
        suggestions.sort((a, b) => b.recipeMatches - a.recipeMatches);
      }

      return suggestions.slice(0, limit);
    } catch (error) {
      console.error("Error getting progressive ingredient suggestions:", error);
      return [];
    }
  }

  /**
   * Create ingredient object without database lookup
   */
  private createIngredient(ingredientName: string) {
    // Clean the ingredient name - remove quotes and extra characters
    const cleanName = ingredientName.replace(/["{}\[\]]/g, '').trim();
    
    return {
      id: Math.random().toString(36).substr(2, 9),
      name: cleanName,
      description: this.getIngredientDescription(cleanName),
      imageUrl: this.getIngredientImageUrl(cleanName),
      category: this.getIngredientCategory(cleanName),
      tags: this.getIngredientTags(cleanName),
      isCommon: true,
      searchTerms: [cleanName.toLowerCase()],
      priority: "complementary"
    };
  }

  /**
   * Get appropriate description for ingredient
   */
  private getIngredientDescription(ingredientName: string): string {
    const name = ingredientName.toLowerCase();
    
    if (name.includes('oil')) return "High-quality cooking oil for sautéing and flavoring";
    if (name.includes('cheese')) return "Rich, creamy cheese perfect for melting and flavor";
    if (name.includes('pepper') || name.includes('spice')) return "Aromatic spice that adds depth and warmth";
    if (name.includes('onion')) return "Sweet, savory base ingredient for countless dishes";
    if (name.includes('garlic')) return "Pungent, flavorful bulb that enhances any recipe";
    if (name.includes('tomato')) return "Fresh, juicy tomatoes bursting with natural flavor";
    if (name.includes('spinach') || name.includes('lettuce')) return "Leafy green packed with nutrients and freshness";
    if (name.includes('basil') || name.includes('herbs')) return "Fresh aromatic herb that brightens any dish";
    if (name.includes('chicken') || name.includes('turkey')) return "Lean protein that's versatile and satisfying";
    if (name.includes('beef') || name.includes('meat')) return "Rich, hearty protein perfect for substantial meals";
    if (name.includes('fish') || name.includes('salmon')) return "Fresh seafood rich in omega-3 and flavor";
    if (name.includes('rice') || name.includes('grain')) return "Wholesome grain that pairs well with many dishes";
    if (name.includes('pasta')) return "Classic Italian staple perfect for hearty meals";
    if (name.includes('nuts') || name.includes('almond')) return "Crunchy, nutritious nuts that add texture and flavor";
    if (name.includes('avocado')) return "Creamy, healthy fruit perfect for modern cuisine";
    if (name.includes('lemon') || name.includes('citrus')) return "Bright, zesty citrus that adds fresh acidity";
    if (name.includes('honey') || name.includes('sweet')) return "Natural sweetener that adds complexity";
    if (name.includes('salt')) return "Essential seasoning that enhances all flavors";
    
    return `Fresh ${ingredientName.toLowerCase()} that adds great flavor to your cooking`;
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
   * Check if we should show recipes
   */
  shouldShowRecipes(selectedIngredients: string[], possibleRecipes: any[]): boolean {
    return selectedIngredients.length >= 6 && possibleRecipes.length <= 10 && possibleRecipes.length > 0;
  }

  /**
   * Helper method to check if ingredient names match (fuzzy matching)
   */
  private ingredientNamesMatch(dbIngredient: string, userIngredient: string): boolean {
    const normalize = (str: string) => str.toLowerCase().trim();
    
    const dbNorm = normalize(dbIngredient);
    const userNorm = normalize(userIngredient);
    
    if (dbNorm === userNorm) return true;
    
    // Handle common variations
    const variations: { [key: string]: string[] } = {
      "greek yogurt": ["yogurt", "greek yogurt"],
      "yogurt": ["greek yogurt", "yogurt"],
      "chicken breast": ["chicken", "chicken breast", "frozen chicken"],
      "chicken": ["chicken breast", "chicken", "frozen chicken"],
      "frozen chicken": ["chicken breast", "chicken", "frozen chicken"],
      "ground beef": ["beef", "ground beef", "frozen beef", "beef strips"],
      "beef": ["ground beef", "beef", "frozen beef", "beef strips"],
      "frozen beef": ["ground beef", "beef", "frozen beef", "beef strips"],
      "beef strips": ["ground beef", "beef", "frozen beef", "beef strips"],
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
      "whole wheat pasta": ["pasta", "spaghetti pasta", "spaghetti", "whole wheat pasta"],
      "spaghetti pasta": ["pasta", "spaghetti pasta", "spaghetti", "whole wheat pasta"],
      "pasta": ["spaghetti pasta", "spaghetti", "whole wheat pasta"],
      "spaghetti": ["spaghetti pasta", "pasta", "whole wheat pasta"],
      "turkey breast": ["turkey", "turkey breast", "ground turkey"],
      "turkey": ["turkey breast", "turkey", "ground turkey"],
      "ground turkey": ["turkey breast", "turkey", "ground turkey"],
      "canned tuna": ["tuna", "canned tuna"],
      "tuna": ["canned tuna", "tuna"]
    };
    
    const userVariations = variations[userNorm] || [userNorm];
    const dbVariations = variations[dbNorm] || [dbNorm];
    
    return userVariations.some(uVar => 
      dbVariations.some(dVar => 
        uVar === dVar || uVar.includes(dVar) || dVar.includes(uVar)
      )
    );
  }
}

export const simpleProgressiveSwiper = new SimpleProgressiveSwiper();