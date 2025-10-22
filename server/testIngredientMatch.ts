import { progressiveRecipeSwiping } from './services/progressiveRecipeSwiping';
import { db } from './db';
import { recipeCombinations } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function testIngredientMatch() {
  console.log('Testing ingredient matching...');
  
  // Get one recipe with "Whole Wheat Pasta"
  const testRecipe = await db.select().from(recipeCombinations).where(
    eq(recipeCombinations.mainIngredient, 'Whole Wheat Pasta')
  ).limit(1);
  
  if (testRecipe.length > 0) {
    console.log('Test recipe:', testRecipe[0]);
    console.log('Main ingredient:', testRecipe[0].mainIngredient);
    console.log('Supporting ingredients type:', typeof testRecipe[0].supportingIngredients);
    console.log('Supporting ingredients:', testRecipe[0].supportingIngredients);
    console.log('Is array:', Array.isArray(testRecipe[0].supportingIngredients));
    
    // Test the match manually
    const service = progressiveRecipeSwiping as any;
    const matchResult = service.ingredientNamesMatch('Whole Wheat Pasta', 'Spaghetti pasta');
    console.log('Match result for "Whole Wheat Pasta" vs "Spaghetti pasta":', matchResult);
  }
}

testIngredientMatch().catch(console.error);