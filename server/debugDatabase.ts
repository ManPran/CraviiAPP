import { db } from './db';
import { recipeCombinations } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function debugDatabase() {
  console.log('=== Database Debug ===');
  
  // Get one Whole Wheat Pasta recipe
  const pastaRecipes = await db.select()
    .from(recipeCombinations)
    .where(eq(recipeCombinations.mainIngredient, 'Whole Wheat Pasta'))
    .limit(1);
  
  if (pastaRecipes.length > 0) {
    const recipe = pastaRecipes[0];
    console.log('Recipe:', recipe);
    console.log('Main ingredient:', recipe.mainIngredient);
    console.log('Supporting ingredients type:', typeof recipe.supportingIngredients);
    console.log('Supporting ingredients value:', recipe.supportingIngredients);
    console.log('Is array:', Array.isArray(recipe.supportingIngredients));
    
    if (Array.isArray(recipe.supportingIngredients)) {
      console.log('Array length:', recipe.supportingIngredients.length);
      console.log('First 5 items:', recipe.supportingIngredients.slice(0, 5));
    }
  } else {
    console.log('No Whole Wheat Pasta recipes found');
  }
}

debugDatabase().catch(console.error);