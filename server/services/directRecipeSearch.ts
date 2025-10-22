import axios from 'axios';
import { scrapeRecipeDetails } from './recipeWebScraper';

interface DirectRecipeResult {
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
  instructions: string[];
  rating?: number;
  source?: string;
}

export async function searchRecipesWithRealIngredients(
  ingredients: string[], 
  preferences: any
): Promise<DirectRecipeResult[]> {
  try {
    if (!process.env.SERP_API_KEY) {
      throw new Error('SERP_API_KEY is required');
    }

    const mainIngredients = ingredients.slice(0, 3).join(' ');
    const course = preferences.course || 'dinner';
    
    // Search for high-rated recipes
    const query = `${mainIngredients} ${course} recipe 4.5 stars site:allrecipes.com OR site:foodnetwork.com OR site:bonappetit.com OR site:epicurious.com`;
    
    console.log(`Direct SERP search for: ${query}`);

    const response = await axios.get('https://serpapi.com/search', {
      params: {
        engine: 'google',
        q: query,
        api_key: process.env.SERP_API_KEY,
        num: 6,
        gl: 'us',
        hl: 'en'
      },
      timeout: 10000
    });

    const results = response.data.organic_results || [];
    const recipes: DirectRecipeResult[] = [];

    console.log(`Found ${results.length} recipe URLs to scrape`);

    for (let i = 0; i < Math.min(results.length, 6); i++) {
      const result = results[i];
      
      try {
        console.log(`Scraping full recipe from: ${result.link}`);
        const scrapedData = await scrapeRecipeDetails(result.link);
        
        if (!scrapedData.ingredients || scrapedData.ingredients.length === 0) {
          console.log(`No ingredients found for ${result.title}, skipping`);
          continue;
        }

        // Convert scraped ingredients to the expected format
        const scrapedUsedIngredients = scrapedData.ingredients.map(ing => ({
          name: ing,
          amount: 1,
          unit: 'piece'
        }));

        // Determine source from URL
        const source = result.link.includes('allrecipes') ? 'AllRecipes' :
                      result.link.includes('foodnetwork') ? 'Food Network' :
                      result.link.includes('bonappetit') ? 'Bon Appétit' :
                      result.link.includes('epicurious') ? 'Epicurious' :
                      'Recipe Site';

        const recipe: DirectRecipeResult = {
          id: `direct_${Date.now()}_${i}`,
          title: scrapedData.title || result.title.replace(/\s*\|\s*.*$/, ''),
          description: result.snippet || `Delicious ${course} recipe from ${source}`,
          image: result.thumbnail || `https://images.unsplash.com/photo-1546833999-b9f581a1996d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80`,
          readyInMinutes: scrapedData.cookTime || 30,
          servings: scrapedData.servings || 4,
          usedIngredients: scrapedUsedIngredients,
          missedIngredients: [], // No missed ingredients since we have the real recipe
          sourceUrl: result.link,
          difficulty: estimateDifficulty(scrapedData.cookTime || 30, scrapedData.ingredients.length),
          tags: [source.toLowerCase(), course, 'authentic', 'web-scraped'].filter(Boolean),
          instructions: scrapedData.instructions || [],
          rating: scrapedData.rating || 4.5,
          source
        };

        recipes.push(recipe);
        console.log(`Successfully scraped ${scrapedData.ingredients.length} real ingredients from "${scrapedData.title}"`);
        
      } catch (error) {
        console.error(`Failed to scrape recipe ${result.link}:`, error);
        // Skip this recipe and continue with the next one
        continue;
      }
    }
    
    console.log(`Returning ${recipes.length} recipes with authentic scraped ingredients`);
    return recipes;

  } catch (error) {
    console.error('Error in direct recipe search:', error);
    throw new Error(`Failed to search recipes: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function estimateDifficulty(cookTime: number, ingredientCount: number): "easy" | "medium" | "hard" {
  if (cookTime <= 20 && ingredientCount <= 6) return "easy";
  if (cookTime <= 45 && ingredientCount <= 10) return "medium";
  return "hard";
}