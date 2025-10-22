import { db } from '../db';
import { recipeCombinations, type Ingredient } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

interface FilterCriteria {
  mealType?: string;
  tasteProfile?: string;
  cookTime?: number;
  appliances?: string[];
}

/**
 * Service that uses the recipe combinations database to determine
 * which ingredients are valid for given meal preferences
 */
export class RecipeFilteringService {
  
  /**
   * Get valid main ingredients for the given criteria
   */
  async getValidMainIngredients(criteria: FilterCriteria): Promise<string[]> {
    const { mealType, tasteProfile, cookTime, appliances } = criteria;
    
    let query = db.select({ mainIngredient: recipeCombinations.mainIngredient })
      .from(recipeCombinations);
    
    const conditions = [];
    
    if (mealType) {
      conditions.push(eq(recipeCombinations.mealType, mealType));
    }
    
    if (tasteProfile) {
      conditions.push(eq(recipeCombinations.tasteProfile, tasteProfile));
    }
    
    if (cookTime) {
      conditions.push(eq(recipeCombinations.cookTime, cookTime));
    }
    
    if (appliances && appliances.length > 0) {
      // For now, just check if any of the user's appliances match
      // Could be enhanced to be more sophisticated
      const applianceConditions = appliances.map(appliance => 
        eq(recipeCombinations.appliance, appliance)
      );
      // This would need to be an OR condition, but for simplicity, checking first appliance
      conditions.push(applianceConditions[0]);
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    const results = await query;
    
    // Return unique main ingredients
    const uniqueMainIngredients = [...new Set(results.map(r => r.mainIngredient))];
    return uniqueMainIngredients;
  }
  
  /**
   * Get valid supporting ingredients for a main ingredient and criteria
   */
  async getValidSupportingIngredients(
    mainIngredient: string, 
    criteria: FilterCriteria
  ): Promise<string[]> {
    const { mealType, tasteProfile, cookTime, appliances } = criteria;
    
    let query = db.select({ supportingIngredients: recipeCombinations.supportingIngredients })
      .from(recipeCombinations)
      .where(eq(recipeCombinations.mainIngredient, mainIngredient));
    
    const conditions = [eq(recipeCombinations.mainIngredient, mainIngredient)];
    
    if (mealType) {
      conditions.push(eq(recipeCombinations.mealType, mealType));
    }
    
    if (tasteProfile) {
      conditions.push(eq(recipeCombinations.tasteProfile, tasteProfile));
    }
    
    if (cookTime) {
      conditions.push(eq(recipeCombinations.cookTime, cookTime));
    }
    
    if (appliances && appliances.length > 0) {
      conditions.push(eq(recipeCombinations.appliance, appliances[0]));
    }
    
    query = query.where(and(...conditions));
    
    const results = await query;
    
    // Parse supporting ingredients from comma-separated strings
    const allSupportingIngredients = new Set<string>();
    
    for (const result of results) {
      const ingredients = result.supportingIngredients
        .split(',')
        .map(ingredient => ingredient.trim())
        .filter(ingredient => ingredient.length > 0);
      
      ingredients.forEach(ingredient => allSupportingIngredients.add(ingredient));
    }
    
    return Array.from(allSupportingIngredients);
  }
  
  /**
   * Check if an ingredient is valid for the given criteria
   */
  async isIngredientValid(
    ingredientName: string,
    criteria: FilterCriteria,
    isMainIngredient: boolean = false
  ): Promise<boolean> {
    if (isMainIngredient) {
      const validMainIngredients = await this.getValidMainIngredients(criteria);
      return validMainIngredients.some(main => 
        this.ingredientNamesMatch(main, ingredientName)
      );
    } else {
      // For supporting ingredients, we need to check against all valid combinations
      const { mealType, tasteProfile, cookTime, appliances } = criteria;
      
      let query = db.select({ supportingIngredients: recipeCombinations.supportingIngredients })
        .from(recipeCombinations);
      
      const conditions = [];
      
      if (mealType) {
        conditions.push(eq(recipeCombinations.mealType, mealType));
      }
      
      if (tasteProfile) {
        conditions.push(eq(recipeCombinations.tasteProfile, tasteProfile));
      }
      
      if (cookTime) {
        conditions.push(eq(recipeCombinations.cookTime, cookTime));
      }
      
      if (appliances && appliances.length > 0) {
        conditions.push(eq(recipeCombinations.appliance, appliances[0]));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      
      const results = await query;
      
      // Check if the ingredient appears in any supporting ingredients list
      for (const result of results) {
        const supportingIngredients = result.supportingIngredients
          .split(',')
          .map(ingredient => ingredient.trim());
        
        if (supportingIngredients.some(supporting => 
          this.ingredientNamesMatch(supporting, ingredientName)
        )) {
          return true;
        }
      }
      
      return false;
    }
  }
  
  /**
   * Helper method to check if ingredient names match (fuzzy matching)
   */
  private ingredientNamesMatch(dbIngredient: string, userIngredient: string): boolean {
    const db = dbIngredient.toLowerCase().trim();
    const user = userIngredient.toLowerCase().trim();
    
    // Exact match
    if (db === user) return true;
    
    // Check if one contains the other
    if (db.includes(user) || user.includes(db)) return true;
    
    // Check for common variations
    const dbWords = db.split(/\s+/);
    const userWords = user.split(/\s+/);
    
    // If any word matches, consider it a match
    for (const dbWord of dbWords) {
      for (const userWord of userWords) {
        if (dbWord === userWord && dbWord.length > 2) { // Avoid matching short words like "a", "an"
          return true;
        }
      }
    }
    
    return false;
  }
  
  /**
   * Filter ingredients based on criteria using the database
   */
  async filterIngredients(
    ingredients: Ingredient[],
    criteria: FilterCriteria
  ): Promise<Ingredient[]> {
    const validIngredients: Ingredient[] = [];
    
    for (const ingredient of ingredients) {
      const isMainIngredient = ingredient.priority === 'main';
      const isValid = await this.isIngredientValid(
        ingredient.name,
        criteria,
        isMainIngredient
      );
      
      if (isValid) {
        validIngredients.push(ingredient);
      }
    }
    
    return validIngredients;
  }
}

export const recipeFilteringService = new RecipeFilteringService();