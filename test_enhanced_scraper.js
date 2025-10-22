// Test the enhanced scraper directly
import { recipeScraper } from './server/services/enhancedRecipeScraper.js';

async function testEnhancedScraper() {
  try {
    console.log('Testing enhanced scraper...');
    const result = await recipeScraper.scrapeRecipe('https://www.allrecipes.com/recipe/73993/monterey-chicken-with-potatoes/');
    
    if (result) {
      console.log('SUCCESS: Enhanced scraper found', result.ingredients.length, 'ingredients');
      console.log('First 5 ingredients:', result.ingredients.slice(0, 5));
    } else {
      console.log('FAILED: Enhanced scraper returned null');
    }
  } catch (error) {
    console.log('ERROR:', error.message);
  }
}

testEnhancedScraper();