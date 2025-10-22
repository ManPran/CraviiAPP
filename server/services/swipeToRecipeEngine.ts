/**
 * Swipe-to-Recipe Engine
 * 
 * Concept:
 * 1. User swipes right on ingredients they have/want
 * 2. Each swipe updates two dynamic recipe pools:
 *    • candidates - recipes still compatible with ALL swiped ingredients
 *    • complete - recipes whose entire ingredient list ⊆ swiped set
 * 3. If complete is non-empty, show those recipes immediately
 * 4. If complete is empty, suggest the ONE missing ingredient that would
 *    complete the largest number of near-matches
 */

import { db } from "../db";
import { recipeCombinations } from "@shared/schema";

interface RecipeCandidate {
  id: number;
  title: string;
  ingredients: Set<string>;
  mealType: string;
  tasteProfile: string;
  cookTime: number;
  appliance: string;
  mainIngredient: string;
  supportingIngredients: string[];
}

interface SwipeEngineState {
  swiped: Set<string>;
  candidates: RecipeCandidate[];
  readyToCook: RecipeCandidate[];
}

class SwipeToRecipeEngine {
  private state: SwipeEngineState;
  private allRecipes: RecipeCandidate[] = [];

  constructor() {
    this.state = {
      swiped: new Set(),
      candidates: [],
      readyToCook: []
    };
  }

  /**
   * Initialize the engine with recipes from database
   */
  async initialize() {
    try {
      const dbRecipes = await db.select().from(recipeCombinations);
      
      this.allRecipes = dbRecipes.map(recipe => ({
        id: recipe.id,
        title: `${recipe.mainIngredient} ${recipe.tasteProfile} ${recipe.mealType}`,
        ingredients: this.parseIngredients(recipe.mainIngredient, recipe.supportingIngredients),
        mealType: recipe.mealType,
        tasteProfile: recipe.tasteProfile,
        cookTime: recipe.cookTime,
        appliance: recipe.appliance,
        mainIngredient: recipe.mainIngredient,
        supportingIngredients: Array.isArray(recipe.supportingIngredients) 
          ? recipe.supportingIngredients 
          : []
      }));

      this.state.candidates = [...this.allRecipes];
      console.log(`SwipeEngine: Initialized with ${this.allRecipes.length} recipes`);
    } catch (error) {
      console.error("Failed to initialize SwipeToRecipeEngine:", error);
    }
  }

  /**
   * Parse ingredients into a normalized set
   */
  private parseIngredients(mainIngredient: string, supportingIngredients: string[]): Set<string> {
    const ingredients = new Set<string>();
    
    // Add main ingredient (normalized)
    ingredients.add(this.normalizeIngredient(mainIngredient));
    
    // Add supporting ingredients (normalized)
    supportingIngredients.forEach(ing => {
      if (ing && ing.trim()) {
        ingredients.add(this.normalizeIngredient(ing));
      }
    });
    
    return ingredients;
  }

  /**
   * Normalize ingredient names for consistent matching
   */
  normalizeIngredient(ingredient: string): string {
    return ingredient.toLowerCase().trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '');
  }

  /**
   * Map user ingredient to database main ingredient
   */
  private mapUserIngredient(ingredient: string): string {
    const normalized = this.normalizeIngredient(ingredient);
    
    // Handle common ingredient variations and aliases for user inputs only
    const ingredientMap: { [key: string]: string[] } = {
      'chicken thighs': ['chicken', 'frozen chicken', 'chicken breast'],
      'ground beef': ['beef', 'frozen beef'],
      'salmon': ['fresh salmon', 'frozen salmon'],
      'shrimp': ['frozen shrimp', 'prawns'],
      'tofu': ['extra firm tofu', 'silken tofu'],
      'whole wheat pasta': ['pasta', 'noodles'],
      'quinoa': ['red quinoa', 'white quinoa'],
      'lentils': ['red lentils', 'green lentils', 'black lentils'],
      'tuna': ['canned tuna', 'fresh tuna', 'tuna fish'],
      'turkey': ['turkey breast', 'ground turkey', 'turkey bacon', 'turkey meatballs']
    };
    
    // Find the base ingredient for the normalized input
    for (const [baseIngredient, variations] of Object.entries(ingredientMap)) {
      if (variations.some(variation => this.normalizeIngredient(variation) === normalized)) {
        console.log(`SwipeEngine: Mapped user ingredient '${ingredient}' (normalized: '${normalized}') to database ingredient '${baseIngredient}'`);
        return this.normalizeIngredient(baseIngredient);
      }
    }
    
    console.log(`SwipeEngine: No mapping found for '${ingredient}' (normalized: '${normalized}'), using as-is`);
    return normalized;
  }

  /**
   * Process a swipe right action
   */
  swipeRight(ingredient: string): {
    readyToCook: RecipeCandidate[];
    suggestedNext?: string;
    candidatesCount: number;
  } {
    const mappedIngredient = this.mapUserIngredient(ingredient);
    this.state.swiped.add(mappedIngredient);

    console.log(`SwipeEngine: Swiped '${ingredient}' (mapped to: '${mappedIngredient}')`);
    console.log(`SwipeEngine: Total swiped ingredients: ${this.state.swiped.size}`);

    // 1. Keep only recipes that include every swiped ingredient
    this.state.candidates = this.allRecipes.filter(recipe => {
      return this.isSubset(this.state.swiped, recipe.ingredients);
    });

    console.log(`SwipeEngine: ${this.state.candidates.length} recipes remain as candidates`);

    // 2. Split into complete vs still-missing
    this.state.readyToCook = this.state.candidates.filter(recipe => {
      return this.isSubset(recipe.ingredients, this.state.swiped);
    });

    console.log(`SwipeEngine: ${this.state.readyToCook.length} recipes are ready to cook`);

    if (this.state.readyToCook.length > 0) {
      return {
        readyToCook: this.state.readyToCook,
        candidatesCount: this.state.candidates.length
      };
    } else {
      // 3. Suggest the single most common missing ingredient
      const suggestedNext = this.findBestNextIngredient();
      return {
        readyToCook: [],
        suggestedNext,
        candidatesCount: this.state.candidates.length
      };
    }
  }

  /**
   * Check if setA is a subset of setB
   */
  private isSubset(setA: Set<string>, setB: Set<string>): boolean {
    for (const item of setA) {
      if (!setB.has(item)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Find the most common missing ingredients across all candidate recipes
   */
  private findBestNextIngredients(limit: number = 5): string[] {
    const missingCounter = new Map<string, number>();

    for (const recipe of this.state.candidates) {
      const missing = new Set([...recipe.ingredients].filter(ing => !this.state.swiped.has(ing)));
      for (const ingredient of missing) {
        missingCounter.set(ingredient, (missingCounter.get(ingredient) || 0) + 1);
      }
    }

    if (missingCounter.size === 0) {
      return [];
    }

    // Sort ingredients by count and return top suggestions
    const sortedIngredients = Array.from(missingCounter.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([ingredient, count]) => {
        console.log(`SwipeEngine: Ingredient '${ingredient}' appears in ${count} recipes`);
        return ingredient;
      });

    console.log(`SwipeEngine: Top ${sortedIngredients.length} next ingredients: ${sortedIngredients.join(', ')}`);
    return sortedIngredients;
  }

  /**
   * Find the most common missing ingredient across all candidate recipes
   */
  private findBestNextIngredient(): string | undefined {
    const suggestions = this.findBestNextIngredients(1);
    return suggestions.length > 0 ? suggestions[0] : undefined;
  }

  /**
   * Get current engine state
   */
  getState(): {
    swipedIngredients: string[];
    candidatesCount: number;
    readyToCookCount: number;
  } {
    return {
      swipedIngredients: Array.from(this.state.swiped),
      candidatesCount: this.state.candidates.length,
      readyToCookCount: this.state.readyToCook.length
    };
  }

  /**
   * Reset the engine state
   */
  reset() {
    this.state = {
      swiped: new Set(),
      candidates: [...this.allRecipes],
      readyToCook: []
    };
    console.log('SwipeEngine: State reset');
  }

  /**
   * Get recipe candidates that match selected ingredients
   */
  getRecipeCandidates(selectedIngredients: string[], preferences?: any): any[] {
    // Reset and process ingredients
    this.reset();
    
    console.log(`SwipeEngine: getRecipeCandidates called with preferences:`, preferences);
    
    // Apply preference filtering if provided
    if (preferences) {
      console.log(`SwipeEngine: Applying preference filtering - taste: ${preferences.taste}, course: ${preferences.course}`);
      console.log(`SwipeEngine: Starting with ${this.allRecipes.length} total recipes`);
      
      let filteredRecipes = this.allRecipes.filter(recipe => {
        // Filter by meal type
        if (preferences.course) {
          const mealType = preferences.course.toLowerCase();
          const recipeMealType = recipe.mealType.toLowerCase();
          if (recipeMealType !== mealType) {
            return false;
          }
        }
        
        // Filter by taste preference
        if (preferences.taste) {
          const taste = preferences.taste.toLowerCase();
          const recipeTaste = recipe.tasteProfile.toLowerCase();
          if (recipeTaste !== taste) {
            return false;
          }
        }
        
        // Filter by cooking time
        if (preferences.cookTime) {
          if (recipe.cookTime > preferences.cookTime + 15) { // Allow 15min flexibility
            return false;
          }
        }
        
        return true;
      });
      
      console.log(`SwipeEngine: Filtered to ${filteredRecipes.length} recipes matching preferences (taste: ${preferences.taste}, course: ${preferences.course})`);
      this.state.candidates = filteredRecipes;
    }
    
    for (const ingredient of selectedIngredients) {
      this.swipeRight(ingredient);
    }
    return this.state.candidates;
  }

  /**
   * Get recipes that are ready to cook with current ingredients
   */
  getCompleteRecipes(selectedIngredients: string[]): any[] {
    // Reset and process ingredients
    this.reset();
    for (const ingredient of selectedIngredients) {
      this.swipeRight(ingredient);
    }
    return this.state.readyToCook;
  }

  /**
   * Filter candidates by dietary restrictions
   */
  applyDietaryFilters(dietaryRestrictions: string[]): void {
    // This would integrate with the existing dietary filtering system
    // For now, we'll keep it simple and let the existing system handle it
    console.log(`SwipeEngine: Dietary filters applied: ${dietaryRestrictions.join(', ')}`);
  }

  /**
   * Get smart ingredient suggestions based on current state and preferences
   * Now prioritizes ingredients that will complete the most recipes
   */
  async getSmartIngredientSuggestions(params: {
    selectedIngredients: string[];
    rejectedIngredients: string[];
    preferences: {
      course: string;
      taste: string;
      cookTime: number;
      appliances: string[];
    };
    dietaryRestrictions: string[];
    limit: number;
  }): Promise<any[]> {
    const { selectedIngredients, rejectedIngredients, preferences, dietaryRestrictions, limit } = params;
    
    console.log(`SwipeEngine: Getting smart suggestions for ${selectedIngredients.length} ingredients, course: ${preferences.course}`);
    
    // Reset and update state with selected ingredients
    this.reset();
    
    // Apply meal type and preference filtering to initial recipe pool
    let filteredRecipes = this.allRecipes.filter(recipe => {
      // Filter by meal type
      if (preferences.course) {
        const mealType = preferences.course.toLowerCase();
        const recipeMealType = recipe.mealType.toLowerCase();
        if (recipeMealType !== mealType) {
          return false;
        }
      }
      
      // Filter by taste preference
      if (preferences.taste) {
        const taste = preferences.taste.toLowerCase();
        const recipeTaste = recipe.tasteProfile.toLowerCase();
        if (recipeTaste !== taste) {
          return false;
        }
      }
      
      // Filter by cooking time
      if (preferences.cookTime) {
        if (recipe.cookTime > preferences.cookTime + 15) { // Allow 15min flexibility
          return false;
        }
      }
      
      return true;
    });
    
    console.log(`SwipeEngine: Filtered to ${filteredRecipes.length} recipes matching preferences`);
    this.state.candidates = filteredRecipes;
    
    // Process selected ingredients
    for (const ingredient of selectedIngredients) {
      console.log(`SwipeEngine: Processing ingredient: '${ingredient}'`);
      this.swipeRight(ingredient);
    }
    
    // Get many ingredient suggestions (more than needed for randomization)
    const nextIngredients = this.findBestNextIngredients(limit * 3);
    
    if (nextIngredients.length === 0) {
      console.log('SwipeEngine: No suggestions available');
      return [];
    }
    
    // Find the actual ingredient objects from the database
    const { storage } = await import('../storage');
    const allIngredients = await storage.getIngredients();
    const suggestions = [];
    
    // Create a mapping of common recipe ingredients to database ingredients
    const ingredientMappings = new Map<string, any>();
    
    for (const dbIngredient of allIngredients) {
      const normalizedName = dbIngredient.name.toLowerCase();
      ingredientMappings.set(normalizedName, dbIngredient);
      
      // Add common variations/mappings
      if (normalizedName.includes('pepper')) {
        ingredientMappings.set('black pepper', dbIngredient);
        ingredientMappings.set('bell pepper', dbIngredient);
        ingredientMappings.set('bell peppers', dbIngredient);
      }
      if (normalizedName.includes('cheese')) {
        ingredientMappings.set('cheddar cheese', dbIngredient);
        ingredientMappings.set('feta cheese', dbIngredient);
        ingredientMappings.set('parmesan', dbIngredient);
      }
      if (normalizedName.includes('oil')) {
        ingredientMappings.set('olive oil', dbIngredient);
        ingredientMappings.set('sesame oil', dbIngredient);
      }
      if (normalizedName.includes('seed')) {
        ingredientMappings.set('chia seeds', dbIngredient);
        ingredientMappings.set('flax seeds', dbIngredient);
      }
      if (normalizedName.includes('bean')) {
        ingredientMappings.set('green beans', dbIngredient);
        ingredientMappings.set('black beans', dbIngredient);
      }
      if (normalizedName.includes('herb') || normalizedName.includes('cilantro') || normalizedName.includes('parsley')) {
        ingredientMappings.set('cilantro', dbIngredient);
        ingredientMappings.set('parsley', dbIngredient);
        ingredientMappings.set('chili flakes', dbIngredient);
      }
      if (normalizedName.includes('ginger')) {
        ingredientMappings.set('ginger', dbIngredient);
      }
    }
    
    for (const nextIngredient of nextIngredients) {
      const normalizedIngredient = nextIngredient.toLowerCase();
      let foundIngredient = ingredientMappings.get(normalizedIngredient);
      
      // If no exact match, try partial matching
      if (!foundIngredient) {
        for (const [key, ingredient] of ingredientMappings.entries()) {
          if (key.includes(normalizedIngredient) || normalizedIngredient.includes(key)) {
            foundIngredient = ingredient;
            break;
          }
        }
      }
      
      if (!foundIngredient) {
        console.log(`SwipeEngine: Could not find ingredient object for '${nextIngredient}'`);
        continue;
      }
      
      // Apply dietary filtering
      const { isIngredientAllowed } = await import('./dietaryFiltering');
      if (dietaryRestrictions.length > 0 && !isIngredientAllowed(foundIngredient, dietaryRestrictions)) {
        console.log(`SwipeEngine: Ingredient '${nextIngredient}' filtered out by dietary restrictions`);
        continue;
      }
      
      // Count how many recipes this ingredient appears in
      const recipeMatches = this.state.candidates.filter(recipe => 
        recipe.ingredients.has(nextIngredient)
      ).length;
      
      suggestions.push({
        ingredient: {
          ...foundIngredient,
          priority: "complementary"
        },
        recipeMatches,
        commonality: recipeMatches / filteredRecipes.length
      });
    }
    
    // Shuffle the suggestions for variety and return requested limit
    if (suggestions.length > 1) {
      console.log(`SwipeEngine: Shuffling ${suggestions.length} suggestions for variety`);
      for (let i = suggestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [suggestions[i], suggestions[j]] = [suggestions[j], suggestions[i]];
      }
    }
    
    const finalSuggestions = suggestions.slice(0, limit);
    console.log(`SwipeEngine: Returning ${finalSuggestions.length} ingredient suggestions (randomized from ${suggestions.length} total)`);
    return finalSuggestions;
  }
}

// Export singleton instance
export const swipeEngine = new SwipeToRecipeEngine();