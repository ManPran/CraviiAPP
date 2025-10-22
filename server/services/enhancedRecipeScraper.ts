/**
 * Enhanced Recipe Scraper
 * 
 * This service integrates with the swipe-to-recipe engine to fetch
 * real recipe content from actual cooking websites using structured data
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

interface ScrapedRecipe {
  title: string;
  description?: string;
  ingredients: Array<{
    name: string;
    amount?: number;
    unit?: string;
    text: string;
  }>;
  instructions: string[];
  prepTime?: number;
  cookTime?: number;
  totalTime?: number;
  servings?: number;
  rating?: number;
  image?: string;
  sourceUrl: string;
  difficulty: "easy" | "medium" | "hard";
}

interface JsonLdRecipe {
  "@type": string;
  name?: string;
  description?: string;
  recipeIngredient?: string[];
  recipeInstructions?: Array<{
    "@type": string;
    text: string;
  } | string>;
  prepTime?: string;
  cookTime?: string;
  totalTime?: string;
  recipeYield?: string | number;
  aggregateRating?: {
    ratingValue: number;
  };
  image?: string | Array<{ url: string }>;
}

export class EnhancedRecipeScraper {
  private userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";

  /**
   * Scrape recipe from URL using JSON-LD structured data (like Python extruct)
   */
  async scrapeRecipe(url: string): Promise<ScrapedRecipe | null> {
    try {
      console.log(`Scraping recipe from: ${url}`);
      
      const response = await axios.get(url, {
        headers: {
          "User-Agent": this.userAgent,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
          "Accept-Encoding": "gzip, deflate",
          "Connection": "keep-alive",
          "Upgrade-Insecure-Requests": "1",
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      
      // Extract JSON-LD structured data (equivalent to Python's extruct)
      const jsonLdScripts = $('script[type="application/ld+json"]');
      let recipeData: JsonLdRecipe | null = null;

      jsonLdScripts.each((_, element) => {
        try {
          const jsonText = $(element).html();
          if (jsonText) {
            const data = JSON.parse(jsonText);
            
            // Handle arrays or single objects
            const items = Array.isArray(data) ? data : [data];
            
            for (const item of items) {
              if (item["@type"] === "Recipe") {
                recipeData = item;
                break;
              }
              // Sometimes nested in other structures
              if (item["@graph"]) {
                const recipeItem = item["@graph"].find((g: any) => g["@type"] === "Recipe");
                if (recipeItem) {
                  recipeData = recipeItem;
                  break;
                }
              }
            }
          }
        } catch (parseError) {
          // Skip invalid JSON
        }
      });

      if (!recipeData) {
        console.log("No JSON-LD recipe data found, trying fallback scraping");
        return this.fallbackScraping($, url);
      }

      console.log(`Found structured recipe data: ${recipeData.name}`);
      return this.parseJsonLdRecipe(recipeData, url);

    } catch (error) {
      console.error(`Error scraping recipe from ${url}:`, error);
      return null;
    }
  }

  /**
   * Parse JSON-LD recipe data into our format
   */
  private parseJsonLdRecipe(data: JsonLdRecipe, sourceUrl: string): ScrapedRecipe {
    const ingredients = (data.recipeIngredient || [])
      .map(ing => {
        const parsed = this.parseIngredientText(ing);
        return {
          name: parsed.name,
          amount: parsed.amount,
          unit: parsed.unit,
          text: ing
        };
      })
      .filter(ing => ing.name && ing.name.length > 0); // Filter out non-ingredients

    const instructions = this.parseInstructions(data.recipeInstructions || []);
    
    const prepTime = this.parseDuration(data.prepTime);
    const cookTime = this.parseDuration(data.cookTime);
    const totalTime = this.parseDuration(data.totalTime) || (prepTime + cookTime);

    return {
      title: data.name || "Unknown Recipe",
      description: data.description,
      ingredients,
      instructions,
      prepTime,
      cookTime,
      totalTime,
      servings: this.parseServings(data.recipeYield),
      rating: data.aggregateRating?.ratingValue,
      image: this.parseImage(data.image),
      sourceUrl,
      difficulty: this.estimateDifficulty(instructions.length, ingredients.length, totalTime)
    };
  }

  /**
   * Fallback scraping when JSON-LD is not available
   */
  private fallbackScraping($: cheerio.CheerioAPI, sourceUrl: string): ScrapedRecipe | null {
    try {
      // Try common recipe selectors
      const title = $('h1').first().text().trim() || 
                   $('.recipe-title').first().text().trim() ||
                   $('[class*="title"]').first().text().trim();

      const ingredients: Array<{name: string, amount?: number, unit?: string, text: string}> = [];
      
      // Common ingredient selectors
      $('.recipe-ingredient, .ingredient, [class*="ingredient"]').each((_, el) => {
        const text = $(el).text().trim();
        if (text) {
          const parsed = this.parseIngredientText(text);
          if (parsed.name && parsed.name.length > 0) { // Only add valid ingredients
            ingredients.push({
              name: parsed.name,
              amount: parsed.amount,
              unit: parsed.unit,
              text
            });
          }
        }
      });

      const instructions: string[] = [];
      $('.recipe-instruction, .instruction, [class*="instruction"]').each((_, el) => {
        const text = $(el).text().trim();
        if (text) {
          instructions.push(text);
        }
      });

      if (!title || ingredients.length === 0) {
        return null;
      }

      return {
        title,
        ingredients,
        instructions,
        sourceUrl,
        difficulty: this.estimateDifficulty(instructions.length, ingredients.length, 30)
      };
    } catch (error) {
      console.error("Fallback scraping failed:", error);
      return null;
    }
  }

  /**
   * Check if text is actually an ingredient (not website navigation, metadata, etc.)
   */
  private isValidIngredient(text: string): boolean {
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
      /^(watch|video|tutorial|how-to)/i
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
    
    return true;
  }

  /**
   * Parse ingredient text into structured format
   */
  private parseIngredientText(text: string): { name: string; amount?: number; unit?: string } {
    // Remove common prefixes and clean up
    const cleaned = text.replace(/^[-•·]\s*/, '').trim();
    
    // Check if this is actually an ingredient
    if (!this.isValidIngredient(cleaned)) {
      console.log(`Filtered out non-ingredient: "${cleaned}"`);
      return { name: '' }; // Return empty name to filter out later
    }
    
    // Try to extract amount and unit
    const match = cleaned.match(/^(\d+(?:\.\d+)?|\d+\/\d+|\d+\s+\d+\/\d+)?\s*([a-zA-Z]+)?\s*(.+)$/);
    
    if (match) {
      const [, amountStr, unit, name] = match;
      const amount = amountStr ? this.parseAmount(amountStr) : undefined;
      return {
        name: name.trim(),
        amount,
        unit: unit?.toLowerCase()
      };
    }
    
    return { name: cleaned };
  }

  /**
   * Parse amount string (handles fractions)
   */
  private parseAmount(amountStr: string): number {
    if (amountStr.includes('/')) {
      const parts = amountStr.split(/\s+/);
      let total = 0;
      
      for (const part of parts) {
        if (part.includes('/')) {
          const [num, den] = part.split('/').map(Number);
          total += num / den;
        } else {
          total += Number(part);
        }
      }
      return total;
    }
    return Number(amountStr);
  }

  /**
   * Parse instructions from various formats
   */
  private parseInstructions(instructions: Array<any>): string[] {
    return instructions.map(inst => {
      if (typeof inst === 'string') {
        return inst.trim();
      }
      if (inst.text) {
        return inst.text.trim();
      }
      if (inst.name) {
        return inst.name.trim();
      }
      return String(inst).trim();
    }).filter(Boolean);
  }

  /**
   * Parse ISO duration or time strings
   */
  private parseDuration(duration?: string): number {
    if (!duration) return 0;
    
    // ISO 8601 duration (PT15M)
    const isoMatch = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (isoMatch) {
      const hours = parseInt(isoMatch[1] || '0');
      const minutes = parseInt(isoMatch[2] || '0');
      return hours * 60 + minutes;
    }
    
    // Simple number
    const numMatch = duration.match(/(\d+)/);
    if (numMatch) {
      return parseInt(numMatch[1]);
    }
    
    return 0;
  }

  /**
   * Parse servings from various formats
   */
  private parseServings(yield_?: string | number): number {
    if (typeof yield_ === 'number') return yield_;
    if (typeof yield_ === 'string') {
      const match = yield_.match(/(\d+)/);
      return match ? parseInt(match[1]) : 4;
    }
    return 4;
  }

  /**
   * Parse image URL from various formats
   */
  private parseImage(image?: string | Array<{ url: string }>): string | undefined {
    if (typeof image === 'string') return image;
    if (Array.isArray(image) && image.length > 0) {
      return image[0].url;
    }
    return undefined;
  }

  /**
   * Estimate recipe difficulty
   */
  private estimateDifficulty(instructionCount: number, ingredientCount: number, totalTime: number): "easy" | "medium" | "hard" {
    const complexity = instructionCount + (ingredientCount * 0.5) + (totalTime / 30);
    
    if (complexity < 8) return "easy";
    if (complexity < 15) return "medium";
    return "hard";
  }

  /**
   * Search for recipe URLs from trusted cooking sites
   */
  async findRecipeUrls(query: string, count: number = 5): Promise<string[]> {
    try {
      // This would integrate with SERP API or Google Custom Search
      // For now, return some example URLs that match the query pattern
      const sites = [
        'allrecipes.com',
        'foodnetwork.com', 
        'bonappetit.com',
        'epicurious.com',
        'seriouseats.com',
        'tasteofhome.com'
      ];
      
      // In production, this would make actual search API calls
      console.log(`Finding recipe URLs for query: ${query}`);
      
      // Return placeholder URLs - this should be replaced with actual search
      return [
        `https://www.allrecipes.com/search/results/?search=${encodeURIComponent(query)}`,
        `https://www.foodnetwork.com/search/results?searchTerm=${encodeURIComponent(query)}`
      ];
      
    } catch (error) {
      console.error("Error finding recipe URLs:", error);
      return [];
    }
  }
}

export const recipeScraper = new EnhancedRecipeScraper();