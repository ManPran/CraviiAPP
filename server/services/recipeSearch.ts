import { searchHighRatedRecipes } from './serpRecipeSearch';

interface RecipeSearchResult {
  id: string;
  title: string;
  description: string;
  image: string;
  readyInMinutes: number;
  servings: number;
  usedIngredients: Array<{
    name: string;
    amount: number;
    unit: string;
  }>;
  missedIngredients: Array<{
    name: string;
    amount: number;
    unit: string;
  }>;
  sourceUrl: string;
  difficulty: "easy" | "medium" | "hard";
  tags: string[];
  instructions?: string[];
}

export async function searchRecipesByIngredients(
  ingredients: string[], 
  preferences: any
): Promise<RecipeSearchResult[]> {
  try {
    // Use SERP API to find real high-rated recipes from cooking websites
    console.log('Searching SERP for high-rated recipes with ingredients:', ingredients);
    const serpRecipes = await searchHighRatedRecipes(ingredients, preferences);
    console.log('Found', serpRecipes.length, 'high-rated recipes from SERP');
    
    // Recipes already include scraped ingredients and instructions
    const recipesWithInstructions = serpRecipes;
    
    // Convert to our format
    const recipes: RecipeSearchResult[] = recipesWithInstructions.map(recipe => ({
      id: recipe.id,
      title: recipe.title,
      description: recipe.description,
      image: recipe.image,
      readyInMinutes: recipe.readyInMinutes,
      servings: recipe.servings,
      usedIngredients: recipe.usedIngredients,
      missedIngredients: recipe.missedIngredients,
      sourceUrl: recipe.sourceUrl,
      difficulty: recipe.difficulty,
      tags: recipe.tags,
      instructions: recipe.instructions
    }));
    
    console.log('Returning', recipes.length, 'high-rated recipes with cooking instructions');
    return recipes;
    
  } catch (error) {
    console.error("Error searching SERP API:", error);
    throw error;
  }
}