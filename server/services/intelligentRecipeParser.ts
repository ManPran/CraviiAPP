import axios from 'axios';
import * as cheerio from 'cheerio';
import { formatRecipeWithAI, type RawRecipeData } from './recipeFormatter.js';

interface IntelligentRecipeResult {
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

/**
 * Generate realistic cooking instructions based on recipe title and ingredients
 */
function generateRealisticInstructionsFromIngredients(title: string, usedIngredients: any[], missedIngredients: any[]): string[] {
  const allIngredients = [...usedIngredients, ...missedIngredients];
  
  // Detect recipe type based on title and ingredients
  const isOatmeal = title.toLowerCase().includes('oatmeal') || allIngredients.some(ing => ing.name.toLowerCase().includes('oat'));
  const isSmoothie = title.toLowerCase().includes('smoothie') || allIngredients.some(ing => ing.name.toLowerCase().includes('yogurt'));
  const isMuffin = title.toLowerCase().includes('muffin') || allIngredients.some(ing => ing.name.toLowerCase().includes('flour'));
  const isBreakfast = title.toLowerCase().includes('breakfast') || isOatmeal || isSmoothie;
  
  if (isOatmeal) {
    return [
      "In a medium saucepan, bring water or milk to a boil over medium-high heat.",
      "Add oats and reduce heat to medium. Cook for 5-7 minutes, stirring occasionally.",
      "Stir in any spices like cinnamon or vanilla extract.",
      "Add fruits, nuts, or sweeteners and mix well.",
      "Cook for another 2-3 minutes until desired consistency is reached.",
      "Remove from heat and let stand for 2 minutes before serving.",
      "Serve warm and enjoy!"
    ];
  }
  
  if (isSmoothie) {
    return [
      "Add all liquid ingredients to a blender first.",
      "Add frozen fruits and any fresh ingredients.",
      "Include protein powder, oats, or other dry ingredients.",
      "Blend on high speed for 60-90 seconds until smooth.",
      "Stop and scrape down sides if needed, then blend again.",
      "Taste and adjust sweetness or consistency as desired.",
      "Pour into glasses and serve immediately."
    ];
  }
  
  if (isMuffin) {
    return [
      "Preheat oven to 375°F (190°C). Line a muffin tin with paper liners.",
      "In a large bowl, whisk together flour, sugar, baking powder, and salt.",
      "In another bowl, combine wet ingredients: eggs, milk, oil, and vanilla.",
      "Pour wet ingredients into dry ingredients and stir until just combined.",
      "Fold in any fruits, nuts, or additional ingredients.",
      "Fill muffin cups about 2/3 full with batter.",
      "Bake for 18-22 minutes until a toothpick inserted in center comes out clean.",
      "Cool in pan for 5 minutes before transferring to wire rack."
    ];
  }
  
  // Generic cooking instructions for other recipes
  return [
    "Prepare all ingredients by washing, chopping, and measuring as needed.",
    "Heat oil or butter in a large skillet or saucepan over medium heat.",
    "Add aromatics like onions, garlic, or spices and cook until fragrant.",
    "Add main ingredients and cook according to their requirements.",
    "Season with salt, pepper, and other seasonings to taste.",
    "Continue cooking until all ingredients are tender and well combined.",
    "Taste and adjust seasonings as needed before serving.",
    "Serve hot and enjoy!"
  ];
}

/**
 * Scrape real ingredients and instructions from recipe websites
 */
async function scrapeRecipeContent(url: string): Promise<{
  ingredients: Array<{ name: string; amount: number; unit: string; }>;
  instructions: string[];
  servings: number;
  cookTime: number;
  title?: string;
  description?: string;
  difficulty?: string;
  tags?: string[];
} | null> {
  try {
    console.log(`Scraping recipe content from: ${url}`);
    
    // First try the enhanced scraper with better error handling
    try {
      const { recipeScraper } = await import('./enhancedRecipeScraper');
      const scrapedRecipe = await recipeScraper.scrapeRecipe(url);
      
      if (scrapedRecipe && scrapedRecipe.ingredients.length > 0) {
        console.log(`Enhanced scraper found ${scrapedRecipe.ingredients.length} ingredients and ${scrapedRecipe.instructions.length} instructions`);
        
        // Convert to the expected format
        const ingredients = scrapedRecipe.ingredients.map(ingredient => ({
          name: ingredient.name,
          amount: ingredient.amount || 1,
          unit: ingredient.unit || 'piece'
        }));
        
        // Format the scraped recipe with AI
        const rawRecipeData: RawRecipeData = {
          title: url.includes('allrecipes.com') ? url.split('/').pop()?.replace(/-/g, ' ') || 'Recipe' : 'Recipe',
          ingredients: ingredients.map(ing => ({
            name: ing.name,
            amount: ing.amount,
            unit: ing.unit
          })),
          instructions: scrapedRecipe.instructions,
          servings: scrapedRecipe.servings,
          cookTime: scrapedRecipe.cookTime,
          sourceUrl: url
        };

        const formattedRecipe = await formatRecipeWithAI(rawRecipeData);
        
        return {
          ingredients: formattedRecipe.ingredients,
          instructions: formattedRecipe.instructions,
          servings: formattedRecipe.servings,
          cookTime: formattedRecipe.cookTime,
          title: formattedRecipe.title,
          description: formattedRecipe.description,
          difficulty: formattedRecipe.difficulty,
          tags: formattedRecipe.tags
        };
      }
    } catch (enhancedError) {
      console.log(`Enhanced scraper failed for ${url}:`, enhancedError.message);
    }
    
    // Fallback to original scraping logic only if enhanced scraper fails
    const response = await axios.get(url, {
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });

    const $ = cheerio.load(response.data);
    
    // Extract ingredients with various selectors for different recipe sites
    const ingredients: Array<{ name: string; amount: number; unit: string; }> = [];
    
    // Common ingredient selectors for various recipe sites
    const ingredientSelectors = [
      '[itemProp="recipeIngredient"]', // Schema.org standard
      '.recipe-ingredient',
      '.ingredient',
      '.recipe-ingredients li',
      '.ingredients li',
      '.ingredient-list li',
      '[data-ingredient]',
      '.recipe-card__ingredient',
      '.ingredient-section li',
      '.recipe-summary__item',
      '.ingredients-item-name'
    ];
    
    // First try Schema.org structured data
    $('[itemProp="recipeIngredient"]').each((_, element) => {
      const text = $(element).text().trim();
      if (text && text.length > 0 && ingredients.length < 15) {
        const parsed = parseIngredientText(text);
        if (parsed) {
          ingredients.push(parsed);
        }
      }
    });

    // If no Schema.org data, try extracting from the page text more carefully
    if (ingredients.length === 0) {
      // Look for ingredient sections specifically instead of parsing the entire body
      const ingredientSectionSelectors = [
        '.recipe-ingredients', '.ingredients', '.ingredient-list', 
        '.recipe-card__ingredients', '.recipe-summary__ingredients'
      ];
      
      for (const selector of ingredientSectionSelectors) {
        const $section = $(selector);
        if ($section.length > 0) {
          const sectionText = $section.text();
          const lines = sectionText.split('\n');
          
          // Look for ingredient-like patterns in the ingredient section
          for (const line of lines) {
            const cleanLine = line.trim();
            if (cleanLine.length > 0 && ingredients.length < 15) {
              // Match patterns like "1 banana, broken in half" or "½ cup vanilla yogurt"
              // But exclude patterns like "400 Reviews" or "18 Photos"
              if (/^[\d½¼¾⅓⅔⅛⅜⅝⅞]\s/.test(cleanLine) || /^\d+[\.\d]*\s/.test(cleanLine)) {
                // Skip obvious non-ingredient patterns
                if (!/\d+\s*(reviews?|photos?|mins?|minutes?|hours?|servings?|portions?|comments?|ratings?)/i.test(cleanLine)) {
                  const parsed = parseIngredientText(cleanLine);
                  if (parsed && parsed.name.length > 2) {
                    ingredients.push(parsed);
                  }
                }
              }
            }
          }
          break; // Stop if we found an ingredient section
        }
      }
    }

    // Fallback to other selectors if still no ingredients
    if (ingredients.length === 0) {
      for (const selector of ingredientSelectors) {
        $(selector).each((_, element) => {
          const text = $(element).text().trim();
          if (text && text.length > 0 && ingredients.length < 15) {
            // Apply same filtering to avoid bad ingredients
            if (!/\d+\s*(reviews?|photos?|mins?|minutes?|hours?|servings?|portions?|comments?|ratings?)/i.test(text)) {
              const parsed = parseIngredientText(text);
              if (parsed) {
                ingredients.push(parsed);
              }
            }
          }
        });
        
        if (ingredients.length >= 8) break;
      }
    }

    // Extract instructions
    const instructions: string[] = [];
    
    // Common instruction selectors for various recipe sites
    const instructionSelectors = [
      '[itemProp="recipeInstructions"]', // Schema.org standard
      '.recipe-instructions__list-item',
      '.instructions-section li',
      '.recipe-instruction',
      '.instruction',
      '.directions-item',
      '.recipe-instructions li',
      '.instructions li',
      '.directions li',
      '.recipe-card__instruction',
      '.recipe-method li',
      '.method li',
      '.steps li',
      '.instruction-list li',
      '.recipe-directions li',
      '.recipe-steps li'
    ];
    
    // First try Schema.org structured data for instructions
    $('[itemProp="recipeInstructions"]').each((_, element) => {
      const text = $(element).text().trim();
      if (text && text.length > 10 && instructions.length < 12) {
        instructions.push(text);
      }
    });

    // If no Schema.org instructions, try other selectors
    if (instructions.length === 0) {
      for (const selector of instructionSelectors) {
        $(selector).each((_, element) => {
          const text = $(element).text().trim();
          if (text && text.length > 10 && instructions.length < 12) {
            // Clean up instruction text
            const cleanText = text
              .replace(/^\d+\.\s*/, '') // Remove numbered steps
              .replace(/^Step \d+:?\s*/i, '') // Remove "Step 1:" format
              .trim();
            
            if (cleanText.length > 10 && !cleanText.includes('Advertisement')) {
              instructions.push(cleanText);
            }
          }
        });
        
        if (instructions.length >= 6) break;
      }
    }

    // If still no instructions, try extracting from page text patterns
    if (instructions.length === 0) {
      const bodyText = $('body').text();
      const lines = bodyText.split('\n');
      
      let inInstructionSection = false;
      
      for (const line of lines) {
        const cleanLine = line.trim();
        
        // Look for instruction section headers
        if (/^(directions|instructions|method|preparation|steps):?$/i.test(cleanLine)) {
          inInstructionSection = true;
          continue;
        }
        
        // Stop at other sections
        if (/^(ingredients|nutrition|notes|tips):?$/i.test(cleanLine)) {
          inInstructionSection = false;
          continue;
        }
        
        // Extract instruction-like patterns
        if (inInstructionSection || /^\d+\.\s/.test(cleanLine) || /^step \d+/i.test(cleanLine)) {
          if (cleanLine.length > 20 && instructions.length < 12) {
            const cleanInstruction = cleanLine
              .replace(/^\d+\.\s*/, '')
              .replace(/^Step \d+:?\s*/i, '')
              .trim();
            
            if (cleanInstruction.length > 15 && 
                !cleanInstruction.includes('Advertisement') &&
                !cleanInstruction.includes('reviews') &&
                !cleanInstruction.includes('photos')) {
              instructions.push(cleanInstruction);
            }
          }
        }
      }
    }

    // Extract servings
    let servings = 4;
    const servingSelectors = [
      '[itemProp="recipeYield"]', '.recipe-yield', '.servings', '.serves'
    ];
    
    for (const selector of servingSelectors) {
      const servingText = $(selector).first().text().trim();
      const servingMatch = servingText.match(/(\d+)/);
      if (servingMatch) {
        servings = parseInt(servingMatch[1]);
        break;
      }
    }

    // Extract cook time
    let cookTime = 30;
    const timeSelectors = [
      '[itemProp="totalTime"]', '[itemProp="cookTime"]', '.cook-time', '.total-time'
    ];
    
    for (const selector of timeSelectors) {
      const timeText = $(selector).first().text().trim();
      const timeMatch = timeText.match(/(\d+)/);
      if (timeMatch) {
        cookTime = parseInt(timeMatch[1]);
        break;
      }
    }

    console.log(`Scraped ${ingredients.length} ingredients and ${instructions.length} instructions from ${url}`);
    
    // Format the scraped recipe with AI
    const rawRecipeData: RawRecipeData = {
      title: url.includes('allrecipes.com') ? url.split('/').pop()?.replace(/-/g, ' ') || 'Recipe' : 'Recipe',
      ingredients: ingredients.map(ing => ({
        name: ing.name,
        amount: ing.amount,
        unit: ing.unit
      })),
      instructions,
      servings,
      cookTime,
      sourceUrl: url
    };

    const formattedRecipe = await formatRecipeWithAI(rawRecipeData);
    
    return {
      ingredients: formattedRecipe.ingredients,
      instructions: formattedRecipe.instructions,
      servings: formattedRecipe.servings,
      cookTime: formattedRecipe.cookTime,
      title: formattedRecipe.title,
      description: formattedRecipe.description,
      difficulty: formattedRecipe.difficulty,
      tags: formattedRecipe.tags
    };
    
  } catch (error) {
    console.error(`Error scraping recipe from ${url}:`, error.message);
    return null;
  }
}

/**
 * Check if text is actually an ingredient (not website navigation, metadata, etc.)
 */
function isValidIngredient(text: string): boolean {
  const cleaned = text.toLowerCase().trim();
  
  // Filter out non-ingredient items
  const invalidPatterns = [
    /^\d+\s*(piece|pieces)\s*(reviews?|photos?|mins?|minutes?|hours?|seconds?|servings?|portions?)/i,
    /^(reviews?|photos?|comments?|ratings?|print|share|save|like|follow)/i,
    /^(prep time|cook time|total time|ready in|serves?|yield|difficulty)/i,
    /^(ingredients?|instructions?|directions?|method|steps?)/i,
    /^(nutrition|calories|carbs|protein|fat|fiber)/i,
    /^(allrecipes|food network|bon appétit|epicurious|taste of home)/i,
    /^(recipe|video|photo|image|picture)/i,
    /^(advertisement|sponsored|promoted)/i,
    /^(more recipes|related recipes|similar recipes)/i,
    /^(subscribe|newsletter|email|updates)/i,
    /^(privacy|terms|policy|copyright)/i,
    /^\d+\s*out of\s*\d+\s*stars/i,
    /^\d+\s*star/i,
    /^rating:/i,
    /^(easy|medium|hard|beginner|advanced)$/i,
    /^(quick|fast|slow|instant)$/i,
    /^(healthy|diet|low-fat|low-carb|keto|paleo|vegan|vegetarian)$/i,
    /^(breakfast|lunch|dinner|snack|dessert|appetizer|main|side)$/i,
    /^(american|italian|mexican|chinese|indian|french|thai|mediterranean)$/i,
    /^(winter|spring|summer|fall|holiday|christmas|thanksgiving)$/i,
    /^(makes?\s*\d+|serves?\s*\d+|prep\s*\d+|cook\s*\d+)/i,
    /^(add to|remove from|shopping|grocery|cart|wishlist)/i,
    /^(pin|tweet|facebook|instagram|pinterest|social)/i,
    /^(tips|notes|variations|substitutions)/i,
    /^(equipment|tools|utensils|cookware)/i,
    /^(temperature|degrees|fahrenheit|celsius|°f|°c)/i,
    /^(step\s*\d+|direction\s*\d+)/i,
    /^(watch|video|tutorial|how-to)/i,
    /^(cook|mode|awake|team|working|oops|something|wrong|developed|yield|serves|original)$/i
  ];
  
  // Check if it matches any invalid pattern
  if (invalidPatterns.some(pattern => pattern.test(cleaned))) {
    return false;
  }
  
  // Must contain at least one letter
  if (!/[a-zA-Z]/.test(cleaned)) {
    return false;
  }
  
  // Must be at least 2 characters long
  if (cleaned.length < 2) {
    return false;
  }
  
  // Must not be just numbers and units
  if (/^\d+\s*(oz|lb|g|kg|ml|l|cup|tbsp|tsp|inch|inches)$/i.test(cleaned)) {
    return false;
  }
  
  // Additional specific exclusions
  if (cleaned.includes('this recipe was') || cleaned.includes('team is working')) {
    return false;
  }
  
  return true;
}

/**
 * Parse ingredient text into structured format
 */
function parseIngredientText(text: string): { name: string; amount: number; unit: string; } | null {
  try {
    // Remove extra whitespace and clean up
    const cleanText = text.replace(/\s+/g, ' ').trim();
    
    // Check if this is actually an ingredient
    if (!isValidIngredient(cleanText)) {
      console.log(`Filtered out non-ingredient: "${cleanText}"`);
      return null;
    }
    
    // Handle fraction characters and mixed numbers
    let normalizedText = cleanText
      .replace(/½/g, '0.5')
      .replace(/¼/g, '0.25')
      .replace(/¾/g, '0.75')
      .replace(/⅓/g, '0.33')
      .replace(/⅔/g, '0.67')
      .replace(/⅛/g, '0.125')
      .replace(/⅜/g, '0.375')
      .replace(/⅝/g, '0.625')
      .replace(/⅞/g, '0.875');
    
    // Advanced parsing patterns for recipe ingredients
    const patterns = [
      // "1 ½ tablespoons peanut butter" or "1.5 tablespoons peanut butter"
      /^(\d+(?:\.\d+)?)\s+(\w+)\s+(.+)$/,
      // "1 banana, broken in half"
      /^(\d+(?:\.\d+)?)\s+(.+?)(?:,.*)?$/,
      // "0.5 cup vanilla yogurt"
      /^(\d+(?:\.\d+)?)\s+(\w+)\s+(.+)$/,
      // Just ingredient name like "ice" or "salt to taste"
      /^([a-zA-Z].+)$/
    ];
    
    for (let i = 0; i < patterns.length; i++) {
      const pattern = patterns[i];
      const match = normalizedText.match(pattern);
      
      if (match) {
        if (i <= 2 && match.length >= 4) {
          // Has amount, unit, and ingredient
          const amount = parseFloat(match[1]);
          const unit = match[2];
          const ingredient = match[3].trim();
          
          // Validate that this looks like a real ingredient
          if (ingredient.length > 1 && !ingredient.includes('This recipe')) {
            return {
              name: ingredient,
              amount: isNaN(amount) ? 1 : amount,
              unit: unit || 'piece'
            };
          }
        } else if (i === 1 && match.length >= 3) {
          // Has amount and ingredient (no unit)
          const amount = parseFloat(match[1]);
          const ingredient = match[2].trim();
          
          if (ingredient.length > 1 && !ingredient.includes('This recipe')) {
            return {
              name: ingredient,
              amount: isNaN(amount) ? 1 : amount,
              unit: 'piece'
            };
          }
        } else if (i === 3) {
          // Just ingredient name
          const ingredient = match[1].trim();
          if (ingredient.length > 1 && 
              !ingredient.includes('This recipe') && 
              !ingredient.includes('yields') &&
              !/^\d+$/.test(ingredient)) {
            return {
              name: ingredient,
              amount: 1,
              unit: 'piece'
            };
          }
        }
      }
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

export async function searchIntelligentRecipes(
  ingredients: string[], 
  preferences: any
): Promise<IntelligentRecipeResult[]> {
  console.log(`Generating recipes for ingredients: ${ingredients.join(', ')}`);
  
  const course = preferences.course || 'dinner';
  return generateIntelligentRecipes(ingredients, course, preferences);
}

// Parse realistic ingredients from recipe title and description
function parseIngredientsFromText(title: string, description: string, userIngredients: string[]): {
  used: Array<{ name: string; amount: number; unit: string }>;
  missed: Array<{ name: string; amount: number; unit: string }>;
} {
  const text = `${title} ${description}`.toLowerCase();
  const used: Array<{ name: string; amount: number; unit: string }> = [];
  const missed: Array<{ name: string; amount: number; unit: string }> = [];

  // Common cooking ingredients organized by category
  const commonIngredients = {
    proteins: ['chicken', 'beef', 'pork', 'fish', 'salmon', 'shrimp', 'turkey', 'bacon', 'sausage', 'eggs', 'tofu'],
    vegetables: ['onion', 'garlic', 'tomato', 'bell pepper', 'mushroom', 'carrot', 'celery', 'zucchini', 'broccoli', 'spinach', 'potato', 'sweet potato'],
    herbs_spices: ['salt', 'pepper', 'oregano', 'basil', 'thyme', 'rosemary', 'parsley', 'paprika', 'cumin', 'ginger', 'cinnamon'],
    dairy: ['butter', 'cheese', 'cream', 'milk', 'yogurt', 'mozzarella', 'parmesan', 'cheddar'],
    grains: ['rice', 'pasta', 'flour', 'bread', 'quinoa', 'oats', 'noodles'],
    oils_liquids: ['olive oil', 'vegetable oil', 'broth', 'stock', 'wine', 'vinegar', 'soy sauce', 'lemon juice'],
    pantry: ['sugar', 'honey', 'vanilla', 'baking powder', 'cornstarch', 'mayo', 'mustard']
  };

  // First, add user ingredients that are mentioned in the recipe with proper measurements
  userIngredients.forEach(ingredient => {
    if (text.includes(ingredient.toLowerCase())) {
      used.push({
        name: ingredient,
        amount: getTypicalAmount(ingredient.toLowerCase()),
        unit: getTypicalUnit(ingredient.toLowerCase())
      });
    }
  });

  // Then add common ingredients that typically go with the recipe type
  const allCommonIngredients = Object.values(commonIngredients).flat();
  
  allCommonIngredients.forEach(ingredient => {
    if (text.includes(ingredient) && !used.find(u => u.name.toLowerCase() === ingredient)) {
      // Check if it's a user ingredient
      const isUserIngredient = userIngredients.some(ui => ui.toLowerCase().includes(ingredient));
      
      const ingredientItem = {
        name: ingredient.charAt(0).toUpperCase() + ingredient.slice(1),
        amount: getTypicalAmount(ingredient),
        unit: getTypicalUnit(ingredient)
      };

      if (isUserIngredient) {
        used.push(ingredientItem);
      } else {
        missed.push(ingredientItem);
      }
    }
  });

  // Add specific ingredients based on recipe type
  if (text.includes('pasta')) {
    if (!missed.find(m => m.name.toLowerCase().includes('pasta'))) {
      missed.push({ name: 'Pasta', amount: 12, unit: 'oz' });
    }
    if (!missed.find(m => m.name.toLowerCase().includes('cheese'))) {
      missed.push({ name: 'Parmesan cheese', amount: 1, unit: 'cup' });
    }
  }

  if (text.includes('chicken')) {
    if (!used.find(u => u.name.toLowerCase().includes('chicken')) && !missed.find(m => m.name.toLowerCase().includes('chicken'))) {
      missed.push({ name: 'Chicken breast', amount: 1, unit: 'lb' });
    }
  }

  if (text.includes('stir fry') || text.includes('stir-fry')) {
    missed.push({ name: 'Soy sauce', amount: 3, unit: 'tbsp' });
    missed.push({ name: 'Sesame oil', amount: 1, unit: 'tsp' });
  }

  // Ensure we have a reasonable number of ingredients (6-12)
  while (used.length + missed.length < 6) {
    const basicIngredients = ['Salt', 'Black pepper', 'Olive oil', 'Garlic', 'Onion'];
    const toAdd = basicIngredients.find(ing => 
      !used.find(u => u.name === ing) && !missed.find(m => m.name === ing)
    );
    if (toAdd) {
      missed.push({
        name: toAdd,
        amount: getTypicalAmount(toAdd.toLowerCase()),
        unit: getTypicalUnit(toAdd.toLowerCase())
      });
    } else {
      break;
    }
  }

  return { used, missed };
}

function getTypicalAmount(ingredient: string): number {
  const ing = ingredient.toLowerCase();
  
  // Spices and seasonings
  if (['salt', 'pepper', 'oregano', 'basil', 'thyme', 'rosemary', 'paprika', 'cumin', 'cinnamon', 'chili flakes'].some(s => ing.includes(s))) return 1;
  
  // Oils and liquids
  if (['olive oil', 'vegetable oil', 'sesame oil'].some(s => ing.includes(s))) return 2;
  if (['vinegar', 'lemon juice', 'soy sauce'].some(s => ing.includes(s))) return 1;
  
  // Proteins
  if (['lentils', 'chickpeas', 'beans'].some(s => ing.includes(s))) return 1;
  if (['chicken', 'turkey', 'beef', 'pork', 'fish', 'salmon'].some(s => ing.includes(s))) return 1;
  if (['tofu', 'tempeh'].some(s => ing.includes(s))) return 14;
  
  // Vegetables - specific amounts
  if (['onion', 'garlic'].some(s => ing.includes(s))) return 1;
  if (['tomato', 'bell pepper', 'carrot', 'cucumber'].some(s => ing.includes(s))) return 2;
  if (['avocado'].some(s => ing.includes(s))) return 1;
  if (['spinach', 'lettuce', 'arugula'].some(s => ing.includes(s))) return 2;
  if (['broccoli', 'cauliflower'].some(s => ing.includes(s))) return 1;
  
  // Grains and pasta
  if (['pasta', 'spaghetti', 'noodles'].some(s => ing.includes(s))) return 8;
  if (['rice', 'quinoa', 'bulgur'].some(s => ing.includes(s))) return 1;
  
  // Dairy
  if (['cheese', 'parmesan', 'mozzarella', 'cheddar'].some(s => ing.includes(s))) return 0.5;
  if (['cream', 'milk', 'yogurt'].some(s => ing.includes(s))) return 0.5;
  if (['butter'].some(s => ing.includes(s))) return 2;
  
  // Nuts and seeds
  if (['almonds', 'walnuts', 'pine nuts', 'seeds'].some(s => ing.includes(s))) return 0.25;
  
  return 1;
}

function getTypicalUnit(ingredient: string): string {
  const ing = ingredient.toLowerCase();
  
  // Spices and seasonings
  if (['salt', 'pepper', 'oregano', 'basil', 'thyme', 'rosemary', 'paprika', 'cumin', 'cinnamon', 'chili flakes'].some(s => ing.includes(s))) return 'tsp';
  
  // Oils and liquids
  if (['olive oil', 'vegetable oil', 'sesame oil', 'vinegar', 'lemon juice', 'soy sauce'].some(s => ing.includes(s))) return 'tbsp';
  
  // Proteins - by weight or cup
  if (['lentils', 'chickpeas', 'beans', 'quinoa', 'rice'].some(s => ing.includes(s))) return 'cup';
  if (['chicken', 'turkey', 'beef', 'pork', 'fish', 'salmon'].some(s => ing.includes(s))) return 'lb';
  if (['tofu', 'tempeh'].some(s => ing.includes(s))) return 'oz';
  
  // Vegetables - by piece or cup
  if (['onion', 'garlic', 'avocado', 'tomato', 'bell pepper', 'carrot', 'cucumber'].some(s => ing.includes(s))) return 'whole';
  if (['spinach', 'lettuce', 'arugula', 'broccoli', 'cauliflower'].some(s => ing.includes(s))) return 'cups';
  
  // Pasta and grains
  if (['pasta', 'spaghetti', 'noodles'].some(s => ing.includes(s))) return 'oz';
  
  // Dairy
  if (['cheese', 'parmesan', 'mozzarella', 'cheddar', 'cream', 'milk', 'yogurt'].some(s => ing.includes(s))) return 'cup';
  if (['butter'].some(s => ing.includes(s))) return 'tbsp';
  
  // Nuts and seeds
  if (['almonds', 'walnuts', 'pine nuts', 'seeds'].some(s => ing.includes(s))) return 'cup';
  
  return 'whole';
}

function generateRealisticInstructions(title: string, ingredients: { used: any[], missed: any[] }): string[] {
  const allIngredients = [...ingredients.used, ...ingredients.missed];
  const ingredientNames = allIngredients.map(ing => ing.name.toLowerCase());
  const titleLower = title.toLowerCase();
  
  let instructions: string[] = [];

  // Generate authentic cooking instructions based on recipe type and ingredients
  
  // LENTIL RECIPES
  if (ingredientNames.includes('lentils') || titleLower.includes('lentil')) {
    instructions.push("Rinse 1 cup dried lentils in cold water and pick out any debris.");
    
    if (ingredientNames.includes('onion') && ingredientNames.includes('garlic')) {
      instructions.push("Heat 2 tablespoons olive oil in a large pot over medium heat. Add diced onion and cook for 5 minutes until softened.");
      instructions.push("Add minced garlic and cook for 1 minute until fragrant.");
    }
    
    if (ingredientNames.includes('carrot') || ingredientNames.includes('celery')) {
      instructions.push("Add diced carrots and celery, cook for 3-4 minutes until starting to soften.");
    }
    
    instructions.push("Add lentils and 3 cups vegetable broth or water. Bring to a boil, then reduce heat and simmer for 20-25 minutes.");
    
    if (ingredientNames.includes('tomato')) {
      instructions.push("Stir in diced tomatoes and cook for an additional 5 minutes.");
    }
    
    if (ingredientNames.includes('spinach') || ingredientNames.includes('greens')) {
      instructions.push("Add fresh spinach and cook until wilted, about 2 minutes.");
    }
    
    instructions.push("Season with salt, pepper, and any herbs like thyme or bay leaves.");
    instructions.push("Simmer until lentils are tender but still hold their shape, about 10 more minutes.");
    
    if (ingredientNames.includes('lemon')) {
      instructions.push("Finish with a squeeze of fresh lemon juice before serving.");
    }
  }
  
  // PASTA RECIPES
  else if (titleLower.includes('pasta') || ingredientNames.includes('pasta')) {
    instructions.push("Bring a large pot of salted water to a rolling boil.");
    instructions.push("Add pasta and cook according to package directions until al dente, usually 8-10 minutes.");
    
    if (ingredientNames.includes('garlic') && ingredientNames.includes('olive oil')) {
      instructions.push("Meanwhile, heat olive oil in a large skillet over medium heat.");
      instructions.push("Add thinly sliced garlic and cook until lightly golden, about 2 minutes.");
    }
    
    if (ingredientNames.includes('tomato')) {
      instructions.push("Add diced tomatoes and cook until they break down and form a sauce, about 8-10 minutes.");
    }
    
    instructions.push("Reserve 1 cup pasta cooking water before draining the pasta.");
    instructions.push("Add drained pasta to the skillet and toss with the sauce.");
    instructions.push("Add pasta water gradually to achieve desired consistency.");
    
    if (ingredientNames.includes('parmesan') || ingredientNames.includes('cheese')) {
      instructions.push("Remove from heat and stir in grated Parmesan cheese.");
    }
    
    if (ingredientNames.includes('basil') || ingredientNames.includes('herbs')) {
      instructions.push("Garnish with fresh basil leaves or chopped herbs.");
    }
  }
  
  // CHICKEN/PROTEIN RECIPES
  else if (ingredientNames.some(ing => ['chicken', 'turkey', 'beef', 'pork'].includes(ing))) {
    const protein = ingredientNames.find(ing => ['chicken', 'turkey', 'beef', 'pork'].includes(ing));
    instructions.push(`Pat ${protein} dry and season generously with salt and freshly ground black pepper.`);
    instructions.push("Heat 2 tablespoons oil in a large heavy-bottomed skillet over medium-high heat.");
    instructions.push(`Cook ${protein} for 6-8 minutes per side until golden brown and cooked through (internal temperature 165°F for poultry, 145°F for pork).`);
    instructions.push("Remove protein from pan and let rest for 5 minutes before slicing.");
    
    if (ingredientNames.includes('onion') || ingredientNames.includes('garlic')) {
      instructions.push("In the same pan, add onions and garlic, cooking until fragrant and translucent, about 3-4 minutes.");
    }
    
    if (ingredientNames.includes('wine') || ingredientNames.includes('broth')) {
      instructions.push("Deglaze pan with wine or broth, scraping up any browned bits from the bottom.");
    }
    
    if (ingredientNames.includes('vegetables')) {
      instructions.push("Add vegetables and cook until tender-crisp, about 5-7 minutes.");
    }
    
    instructions.push("Return protein to pan and heat through for 2-3 minutes.");
  }
  
  // VEGETABLE/SALAD RECIPES
  else if (ingredientNames.some(ing => ['avocado', 'lettuce', 'spinach', 'salad'].includes(ing))) {
    if (ingredientNames.includes('avocado')) {
      instructions.push("Cut avocados in half, remove pit, and slice into crescents or dice into chunks.");
    }
    
    if (ingredientNames.includes('lettuce') || ingredientNames.includes('greens')) {
      instructions.push("Wash and thoroughly dry salad greens, then tear into bite-sized pieces.");
    }
    
    if (ingredientNames.includes('tomato')) {
      instructions.push("Cut tomatoes into wedges or dice, removing seeds if desired.");
    }
    
    if (ingredientNames.includes('cucumber')) {
      instructions.push("Slice cucumber into rounds or half-moons, about ¼-inch thick.");
    }
    
    instructions.push("Combine all prepared vegetables in a large serving bowl.");
    
    if (ingredientNames.includes('lemon') && ingredientNames.includes('olive oil')) {
      instructions.push("In a small bowl, whisk together olive oil, fresh lemon juice, salt, and pepper to make dressing.");
    }
    
    instructions.push("Drizzle dressing over salad and toss gently to coat all ingredients evenly.");
    instructions.push("Serve immediately while vegetables are crisp and fresh.");
  }
  
  // GENERIC FALLBACK (more detailed than before)
  else {
    instructions.push("Heat oil in a large skillet or pot over medium heat.");
    
    if (ingredientNames.includes('onion')) {
      instructions.push("Add diced onion and cook until softened and translucent, about 5 minutes.");
    }
    
    if (ingredientNames.includes('garlic')) {
      instructions.push("Add minced garlic and cook for 1 minute until fragrant.");
    }
    
    instructions.push("Add main ingredients and cook according to their requirements.");
    instructions.push("Season with salt, pepper, and any spices or herbs.");
    instructions.push("Cook until all ingredients are tender and flavors are well combined.");
    instructions.push("Taste and adjust seasoning as needed before serving.");
  }

  return instructions;
}

function extractRating(text: string): number {
  const ratingMatch = text.match(/(\d\.?\d?)\s*(?:stars?|\/5|\⭐)/i);
  if (ratingMatch) {
    return parseFloat(ratingMatch[1]);
  }
  // Look for "rated X" pattern
  const ratedMatch = text.match(/rated\s+(\d\.?\d?)/i);
  if (ratedMatch) {
    return parseFloat(ratedMatch[1]);
  }
  return 0;
}

function extractCookingTime(text: string): number {
  const timeMatch = text.match(/(\d+)\s*(?:minutes?|mins?|hours?|hrs?)/i);
  if (timeMatch) {
    const time = parseInt(timeMatch[1]);
    return text.includes('hour') ? time * 60 : time;
  }
  return 30; // Default
}

function estimateDifficulty(cookTime: number, ingredientCount: number): "easy" | "medium" | "hard" {
  if (cookTime <= 20 && ingredientCount <= 6) return "easy";
  if (cookTime <= 45 && ingredientCount <= 10) return "medium";
  return "hard";
}

/**
 * Generate intelligent recipes using built-in recipe knowledge
 */
function generateIntelligentRecipes(ingredients: string[], course: string, preferences: any): IntelligentRecipeResult[] {
  const recipes: IntelligentRecipeResult[] = [];
  const mainIngredient = ingredients[0]?.toLowerCase() || 'chicken';
  
  // Recipe templates based on main ingredients
  const recipeTemplates = getRecipeTemplates(mainIngredient, course);
  
  for (let i = 0; i < Math.min(recipeTemplates.length, 3); i++) {
    const template = recipeTemplates[i];
    
    // Match user ingredients with template ingredients
    const usedIngredients = ingredients.slice(0, 4).map(ing => ({
      name: ing,
      amount: getTypicalAmount(ing),
      unit: getTypicalUnit(ing)
    }));
    
    const missedIngredients = template.additionalIngredients.map(ing => ({
      name: ing.name,
      amount: ing.amount,
      unit: ing.unit
    }));
    
    const recipe: IntelligentRecipeResult = {
      id: `generated_${Date.now()}_${i}`,
      title: template.title,
      description: template.description,
      image: template.image,
      readyInMinutes: preferences.cookTime || template.cookTime,
      servings: 4,
      usedIngredients,
      missedIngredients,
      sourceUrl: template.sourceUrl,
      difficulty: estimateDifficulty(template.cookTime, usedIngredients.length + missedIngredients.length),
      tags: [course, 'homemade', ...template.tags],
      instructions: template.instructions,
      rating: 4.6,
      source: template.source
    };
    
    recipes.push(recipe);
  }
  
  console.log(`Generated ${recipes.length} intelligent recipes`);
  return recipes;
}

/**
 * Get recipe templates based on main ingredient and course
 */
function getRecipeTemplates(mainIngredient: string, course: string) {
  const templates = [];
  
  if (mainIngredient.includes('chicken')) {
    templates.push({
      title: 'Herb-Crusted Chicken Thighs',
      description: 'Juicy chicken thighs with a flavorful herb crust, perfect for any meal.',
      image: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      cookTime: 35,
      sourceUrl: 'https://www.allrecipes.com/recipe/herb-crusted-chicken',
      source: 'AllRecipes',
      tags: ['protein', 'easy'],
      additionalIngredients: [
        { name: 'olive oil', amount: 2, unit: 'tbsp' },
        { name: 'garlic', amount: 3, unit: 'cloves' },
        { name: 'thyme', amount: 1, unit: 'tsp' },
        { name: 'salt', amount: 1, unit: 'tsp' },
        { name: 'pepper', amount: 0.5, unit: 'tsp' }
      ],
      instructions: [
        'Preheat oven to 425°F (220°C).',
        'Pat chicken thighs dry and season with salt and pepper.',
        'Mix olive oil, minced garlic, and thyme in a small bowl.',
        'Rub the herb mixture all over the chicken pieces.',
        'Place on a baking sheet and bake for 25-30 minutes until golden brown.',
        'Let rest for 5 minutes before serving.'
      ]
    });
    
    templates.push({
      title: 'One-Pan Chicken and Vegetables',
      description: 'A complete meal with tender chicken and roasted vegetables cooked together.',
      image: 'https://images.unsplash.com/photo-1587136462767-d6b4b637e5a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      cookTime: 40,
      sourceUrl: 'https://www.tasteofhome.com/recipes/one-pan-chicken',
      source: 'Taste of Home',
      tags: ['one-pan', 'easy'],
      additionalIngredients: [
        { name: 'potatoes', amount: 4, unit: 'medium' },
        { name: 'carrots', amount: 3, unit: 'large' },
        { name: 'onion', amount: 1, unit: 'large' },
        { name: 'olive oil', amount: 3, unit: 'tbsp' },
        { name: 'rosemary', amount: 2, unit: 'tsp' }
      ],
      instructions: [
        'Preheat oven to 400°F (200°C).',
        'Cut potatoes, carrots, and onion into chunks.',
        'Toss vegetables with olive oil, salt, and pepper.',
        'Place chicken pieces on top of vegetables.',
        'Sprinkle with rosemary and additional seasonings.',
        'Bake for 35-40 minutes until chicken is cooked through.'
      ]
    });
  }
  
  if (mainIngredient.includes('salmon') || mainIngredient.includes('fish')) {
    templates.push({
      title: 'Lemon Herb Baked Salmon',
      description: 'Flaky salmon fillets with a bright lemon herb topping.',
      image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      cookTime: 20,
      sourceUrl: 'https://www.simplyrecipes.com/recipes/lemon-herb-salmon',
      source: 'Simply Recipes',
      tags: ['healthy', 'quick'],
      additionalIngredients: [
        { name: 'lemon', amount: 1, unit: 'whole' },
        { name: 'dill', amount: 2, unit: 'tbsp' },
        { name: 'olive oil', amount: 2, unit: 'tbsp' },
        { name: 'garlic', amount: 2, unit: 'cloves' },
        { name: 'salt', amount: 1, unit: 'tsp' }
      ],
      instructions: [
        'Preheat oven to 400°F (200°C).',
        'Place salmon fillets on a lined baking sheet.',
        'Mix olive oil, lemon juice, minced garlic, and dill.',
        'Brush the mixture over the salmon fillets.',
        'Season with salt and pepper.',
        'Bake for 12-15 minutes until fish flakes easily.'
      ]
    });
  }
  
  if (mainIngredient.includes('pasta') || mainIngredient.includes('noodles')) {
    templates.push({
      title: 'Creamy Garlic Pasta',
      description: 'Rich and creamy pasta dish with garlic and herbs.',
      image: 'https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      cookTime: 25,
      sourceUrl: 'https://www.bonappetit.com/recipe/creamy-garlic-pasta',
      source: 'Bon Appétit',
      tags: ['comfort', 'vegetarian'],
      additionalIngredients: [
        { name: 'heavy cream', amount: 1, unit: 'cup' },
        { name: 'parmesan cheese', amount: 1, unit: 'cup' },
        { name: 'garlic', amount: 4, unit: 'cloves' },
        { name: 'butter', amount: 3, unit: 'tbsp' },
        { name: 'parsley', amount: 2, unit: 'tbsp' }
      ],
      instructions: [
        'Cook pasta according to package directions until al dente.',
        'In a large skillet, melt butter over medium heat.',
        'Add minced garlic and cook for 1 minute until fragrant.',
        'Pour in heavy cream and bring to a simmer.',
        'Add cooked pasta and toss to coat.',
        'Stir in parmesan cheese and parsley before serving.'
      ]
    });
  }
  
  // Default template if no specific match
  if (templates.length === 0) {
    templates.push({
      title: `${mainIngredient.charAt(0).toUpperCase() + mainIngredient.slice(1)} ${course.charAt(0).toUpperCase() + course.slice(1)}`,
      description: `A delicious ${course} recipe featuring ${mainIngredient} with complementary flavors.`,
      image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      cookTime: 30,
      sourceUrl: 'https://www.allrecipes.com/',
      source: 'Recipe Collection',
      tags: ['homemade'],
      additionalIngredients: [
        { name: 'olive oil', amount: 2, unit: 'tbsp' },
        { name: 'salt', amount: 1, unit: 'tsp' },
        { name: 'pepper', amount: 0.5, unit: 'tsp' },
        { name: 'garlic', amount: 2, unit: 'cloves' }
      ],
      instructions: [
        'Prepare all ingredients by washing and chopping as needed.',
        'Heat olive oil in a large pan over medium heat.',
        'Add garlic and cook until fragrant, about 1 minute.',
        'Add main ingredients and cook according to their requirements.',
        'Season with salt and pepper to taste.',
        'Serve hot and enjoy!'
      ]
    });
  }
  
  return templates;
}