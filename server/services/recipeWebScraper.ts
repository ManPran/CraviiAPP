import axios from 'axios';
import * as cheerio from 'cheerio';

interface ScrapedRecipeData {
  title: string;
  ingredients: string[];
  instructions: string[];
  servings?: number;
  cookTime?: number;
  rating?: number;
}

export async function scrapeRecipeDetails(url: string): Promise<ScrapedRecipeData> {
  try {
    console.log(`Scraping recipe details from: ${url}`);
    
    // Use multiple user agents and retry with different approaches
    const userAgents = [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
    ];

    let response;
    let lastError;

    for (let attempt = 0; attempt < userAgents.length; attempt++) {
      try {
        response = await axios.get(url, {
          headers: {
            'User-Agent': userAgents[attempt],
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'max-age=0',
          },
          timeout: 15000,
          maxRedirects: 5,
        });
        break; // Success, exit the retry loop
      } catch (error) {
        lastError = error;
        console.log(`Attempt ${attempt + 1} failed for ${url}, trying different user agent...`);
        
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (!response) {
      throw lastError || new Error('All scraping attempts failed');
    }

    const $ = cheerio.load(response.data);
    
    // Try to extract structured data (JSON-LD) first
    const jsonLdData = extractJsonLdRecipe($);
    if (jsonLdData) {
      return jsonLdData;
    }

    // Fallback to HTML parsing for different recipe sites
    if (url.includes('allrecipes.com')) {
      return scrapeAllRecipes($);
    } else if (url.includes('foodnetwork.com')) {
      return scrapeFoodNetwork($);
    } else if (url.includes('bonappetit.com')) {
      return scrapeBonAppetit($);
    } else if (url.includes('epicurious.com')) {
      return scrapeEpicurious($);
    } else {
      // Generic recipe scraping
      return scrapeGenericRecipe($);
    }

  } catch (error) {
    console.error(`Error scraping recipe from ${url}:`, error);
    // Return minimal fallback data
    return {
      title: 'Recipe from ' + new URL(url).hostname,
      ingredients: [],
      instructions: [],
      servings: 4,
      cookTime: 30
    };
  }
}

// Extract recipe data from JSON-LD structured data
function extractJsonLdRecipe($: cheerio.CheerioAPI): ScrapedRecipeData | null {
  try {
    const jsonLdScript = $('script[type="application/ld+json"]').first();
    if (!jsonLdScript.length) return null;

    const jsonData = JSON.parse(jsonLdScript.html() || '{}');
    const recipe = Array.isArray(jsonData) ? 
      jsonData.find(item => item['@type'] === 'Recipe') : 
      (jsonData['@type'] === 'Recipe' ? jsonData : null);

    if (!recipe) return null;

    const ingredients = Array.isArray(recipe.recipeIngredient) ? 
      recipe.recipeIngredient.map((ing: any) => cleanIngredientText(ing)) : [];

    const instructions = Array.isArray(recipe.recipeInstructions) ? 
      recipe.recipeInstructions.map((inst: any) => {
        if (typeof inst === 'string') return inst;
        return inst.text || inst.name || '';
      }).filter(Boolean) : [];

    return {
      title: recipe.name || 'Recipe',
      ingredients,
      instructions,
      servings: parseInt(recipe.recipeYield) || 4,
      cookTime: parseCookTime(recipe.totalTime || recipe.cookTime),
      rating: parseFloat(recipe.aggregateRating?.ratingValue) || undefined
    };

  } catch (error) {
    console.error('Error parsing JSON-LD:', error);
    return null;
  }
}

// AllRecipes.com specific scraping
function scrapeAllRecipes($: cheerio.CheerioAPI): ScrapedRecipeData {
  const title = $('h1.entry-title, h1.recipe-summary__h1, h1[data-module="RecipeTitle"]').first().text().trim();
  
  // Extract ingredients
  const ingredients: string[] = [];
  $('span.recipe-ingred_txt, .recipe-ingred_txt, [data-ingredient], .ingredients li, .recipe-ingredient').each((_, elem) => {
    const text = $(elem).text().trim();
    if (text && text.length > 2) {
      ingredients.push(cleanIngredientText(text));
    }
  });

  // Extract instructions
  const instructions: string[] = [];
  $('.recipe-directions__list--item, .directions li, .instructions li, .recipe-instruction, [data-module="InstructionsText"]').each((_, elem) => {
    const text = $(elem).text().trim();
    if (text && text.length > 10) {
      instructions.push(text);
    }
  });

  return {
    title: title || 'AllRecipes Recipe',
    ingredients,
    instructions,
    servings: extractServings($),
    cookTime: extractCookTime($)
  };
}

// Food Network specific scraping
function scrapeFoodNetwork($: cheerio.CheerioAPI): ScrapedRecipeData {
  const title = $('h1.o-AssetTitle__a-HeadlineText, .recipe-title, h1').first().text().trim();
  
  const ingredients: string[] = [];
  $('.o-RecipeIngredient__a-Ingredient, .recipe-ingredient, .ingredients li').each((_, elem) => {
    const text = $(elem).text().trim();
    if (text && text.length > 2) {
      ingredients.push(cleanIngredientText(text));
    }
  });

  const instructions: string[] = [];
  $('.o-Method__m-Step, .recipe-instruction, .directions li').each((_, elem) => {
    const text = $(elem).text().trim();
    if (text && text.length > 10) {
      instructions.push(text);
    }
  });

  return {
    title: title || 'Food Network Recipe',
    ingredients,
    instructions,
    servings: extractServings($),
    cookTime: extractCookTime($)
  };
}

// Bon Appétit specific scraping
function scrapeBonAppetit($: cheerio.CheerioAPI): ScrapedRecipeData {
  const title = $('h1[data-testid="ContentHeaderHed"], .recipe-title, h1').first().text().trim();
  
  const ingredients: string[] = [];
  $('[data-testid="IngredientList"] li, .ingredients li, .recipe-ingredient').each((_, elem) => {
    const text = $(elem).text().trim();
    if (text && text.length > 2) {
      ingredients.push(cleanIngredientText(text));
    }
  });

  const instructions: string[] = [];
  $('[data-testid="InstructionsWrapper"] li, .instructions li, .recipe-instruction').each((_, elem) => {
    const text = $(elem).text().trim();
    if (text && text.length > 10) {
      instructions.push(text);
    }
  });

  return {
    title: title || 'Bon Appétit Recipe',
    ingredients,
    instructions,
    servings: extractServings($),
    cookTime: extractCookTime($)
  };
}

// Epicurious specific scraping
function scrapeEpicurious($: cheerio.CheerioAPI): ScrapedRecipeData {
  const title = $('h1[data-testid="ContentHeaderHed"], .recipe-title, h1').first().text().trim();
  
  const ingredients: string[] = [];
  $('.ingredient, .ingredients li, .recipe-ingredient').each((_, elem) => {
    const text = $(elem).text().trim();
    if (text && text.length > 2) {
      ingredients.push(cleanIngredientText(text));
    }
  });

  const instructions: string[] = [];
  $('.preparation-step, .instructions li, .recipe-instruction').each((_, elem) => {
    const text = $(elem).text().trim();
    if (text && text.length > 10) {
      instructions.push(text);
    }
  });

  return {
    title: title || 'Epicurious Recipe',
    ingredients,
    instructions,
    servings: extractServings($),
    cookTime: extractCookTime($)
  };
}

// Generic recipe scraping for unknown sites
function scrapeGenericRecipe($: cheerio.CheerioAPI): ScrapedRecipeData {
  const title = $('h1, .recipe-title, .entry-title').first().text().trim();
  
  const ingredients: string[] = [];
  $('.ingredient, .ingredients li, .recipe-ingredient, [itemprop="recipeIngredient"]').each((_, elem) => {
    const text = $(elem).text().trim();
    if (text && text.length > 2) {
      ingredients.push(cleanIngredientText(text));
    }
  });

  const instructions: string[] = [];
  $('.instruction, .instructions li, .recipe-instruction, [itemprop="recipeInstructions"]').each((_, elem) => {
    const text = $(elem).text().trim();
    if (text && text.length > 10) {
      instructions.push(text);
    }
  });

  return {
    title: title || 'Recipe',
    ingredients,
    instructions,
    servings: extractServings($),
    cookTime: extractCookTime($)
  };
}

// Helper functions
function cleanIngredientText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/^\d+\.\s*/, '') // Remove leading numbers
    .trim();
}

function extractServings($: cheerio.CheerioAPI): number {
  const servingsText = $('.recipe-yield, .servings, [itemprop="recipeYield"]').first().text();
  const match = servingsText.match(/(\d+)/);
  return match ? parseInt(match[1]) : 4;
}

function extractCookTime($: cheerio.CheerioAPI): number {
  const timeText = $('.recipe-time, .cook-time, [itemprop="cookTime"], [itemprop="totalTime"]').first().text();
  const match = timeText.match(/(\d+)/);
  return match ? parseInt(match[1]) : 30;
}

function parseCookTime(timeString: string): number {
  if (!timeString) return 30;
  
  // Parse ISO 8601 duration (PT30M)
  const isoMatch = timeString.match(/PT(\d+)M/);
  if (isoMatch) return parseInt(isoMatch[1]);
  
  // Parse regular text (30 minutes, 1 hour)
  const minuteMatch = timeString.match(/(\d+)\s*min/i);
  if (minuteMatch) return parseInt(minuteMatch[1]);
  
  const hourMatch = timeString.match(/(\d+)\s*hour/i);
  if (hourMatch) return parseInt(hourMatch[1]) * 60;
  
  return 30;
}