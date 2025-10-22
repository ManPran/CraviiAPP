import OpenAI from "openai";
import axios from "axios";
import * as cheerio from "cheerio";
import { db } from "../db";
import { recipes } from "@shared/schema";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface ScrapedRecipe {
  title: string;
  url: string;
  content: string;
  ingredients?: string[];
  instructions?: string[];
}

interface ValidatedRecipe {
  title: string;
  url: string;
  ingredients: string[];
  instructions: string[];
  isValid: boolean;
  difficulty: string;
  prepTime: string;
  cookTime: string;
  servings: number;
}

class MassRecipeScraper {
  private readonly recipeUrls = [
    // Major recipe sites
    'https://www.allrecipes.com',
    'https://www.food.com',
    'https://www.epicurious.com',
    'https://www.bonappetit.com',
    'https://www.tasteofhome.com',
    'https://www.foodnetwork.com',
    'https://www.delish.com',
    'https://www.eatingwell.com',
    'https://www.simplyrecipes.com',
    'https://www.serious-eats.com'
  ];

  private processedUrls = new Set<string>();
  private validRecipeCount = 0;
  private targetRecipeCount = 100; // Start with smaller batch for testing

  async scrapeRecipesFromSite(baseUrl: string, maxPages: number = 100): Promise<string[]> {
    const recipeLinks: string[] = [];
    
    try {
      console.log(`Scraping recipe links from ${baseUrl}...`);
      
      // Try common recipe listing patterns
      const searchPaths = [
        '/recipes',
        '/recipe',
        '/food/recipes',
        '/cooking/recipes',
        '/search?q=chicken',
        '/search?q=pasta',
        '/search?q=beef',
        '/search?q=vegetables',
        '/search?q=dessert'
      ];

      for (const path of searchPaths) {
        try {
          const response = await axios.get(`${baseUrl}${path}`, {
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
          });

          const $ = cheerio.load(response.data);
          
          // Common selectors for recipe links
          const linkSelectors = [
            'a[href*="/recipe"]',
            'a[href*="/recipes"]',
            '.recipe-card a',
            '.recipe-item a',
            '.recipe-link',
            'a[href*="/cooking"]',
            'a[href*="/food"]'
          ];

          for (const selector of linkSelectors) {
            $(selector).each((_, element) => {
              let href = $(element).attr('href');
              if (href) {
                // Convert relative URLs to absolute
                if (href.startsWith('/')) {
                  href = baseUrl + href;
                } else if (!href.startsWith('http')) {
                  href = baseUrl + '/' + href;
                }
                
                // Filter for actual recipe URLs
                if (this.isRecipeUrl(href) && !this.processedUrls.has(href)) {
                  recipeLinks.push(href);
                }
              }
            });
          }
          
          console.log(`Found ${recipeLinks.length} recipe links from ${baseUrl}${path}`);
          
          // Limit per search to avoid overwhelming
          if (recipeLinks.length > 200) break;
          
        } catch (error) {
          console.log(`Failed to scrape ${baseUrl}${path}:`, error.message);
          continue;
        }
      }
      
    } catch (error) {
      console.error(`Error scraping ${baseUrl}:`, error.message);
    }

    // Remove duplicates and return unique links
    return [...new Set(recipeLinks)].slice(0, 500); // Limit per site
  }

  private isRecipeUrl(url: string): boolean {
    const recipeIndicators = [
      '/recipe/',
      '/recipes/',
      '/cooking/',
      '/food/',
      'recipe-',
      'recipes-'
    ];
    
    const excludePatterns = [
      '/video',
      '/gallery',
      '/collection',
      '/category',
      '/tag',
      '/author',
      '/search',
      '.jpg',
      '.png',
      '.pdf'
    ];

    return recipeIndicators.some(indicator => url.includes(indicator)) &&
           !excludePatterns.some(pattern => url.includes(pattern));
  }

  async scrapeRecipeContent(url: string): Promise<ScrapedRecipe | null> {
    try {
      console.log(`Scraping recipe content from: ${url}`);
      
      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      
      // Extract title
      const title = $('h1').first().text().trim() || 
                   $('title').text().trim() || 
                   $('[class*="title"]').first().text().trim();

      // Extract all text content for GPT processing
      const content = $('body').text().replace(/\s+/g, ' ').trim();

      if (!title || content.length < 100) {
        console.log(`Insufficient content for ${url}`);
        return null;
      }

      return {
        title,
        url,
        content: content.substring(0, 5000) // Limit content size for GPT
      };

    } catch (error) {
      console.error(`Error scraping ${url}:`, error.message);
      return null;
    }
  }

  async validateRecipeWithGPT(scrapedRecipe: ScrapedRecipe): Promise<ValidatedRecipe | null> {
    try {
      console.log(`Validating recipe: ${scrapedRecipe.title}`);

      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a professional recipe validator and extractor. Analyze the provided content and determine if it contains a valid recipe. If valid, extract the ingredients and instructions.

Response format (JSON):
{
  "isValid": boolean,
  "title": "Clean recipe title",
  "ingredients": ["ingredient 1", "ingredient 2", ...],
  "instructions": ["step 1", "step 2", ...],
  "difficulty": "Easy|Medium|Hard",
  "prepTime": "X minutes",
  "cookTime": "X minutes", 
  "servings": number
}

A valid recipe must have:
- A clear title
- At least 3 ingredients
- At least 3 cooking steps
- Realistic cooking instructions
- Not be a product review, article, or advertisement`
          },
          {
            role: "user",
            content: `URL: ${scrapedRecipe.url}\n\nTitle: ${scrapedRecipe.title}\n\nContent: ${scrapedRecipe.content}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      if (!result.isValid) {
        console.log(`Recipe validation failed for: ${scrapedRecipe.title}`);
        return null;
      }

      return {
        title: result.title || scrapedRecipe.title,
        url: scrapedRecipe.url,
        ingredients: result.ingredients || [],
        instructions: result.instructions || [],
        isValid: result.isValid,
        difficulty: result.difficulty || 'Medium',
        prepTime: result.prepTime || '15 minutes',
        cookTime: result.cookTime || '30 minutes',
        servings: result.servings || 4
      };

    } catch (error) {
      console.error(`GPT validation error for ${scrapedRecipe.url}:`, error.message);
      return null;
    }
  }

  async saveRecipeToDatabase(validatedRecipe: ValidatedRecipe): Promise<boolean> {
    try {
      await db.insert(recipes).values({
        title: validatedRecipe.title,
        ingredients: validatedRecipe.ingredients,
        instructions: validatedRecipe.instructions.join('\n'),
        difficulty: validatedRecipe.difficulty,
        prepTime: validatedRecipe.prepTime,
        cookTime: validatedRecipe.cookTime,
        servings: validatedRecipe.servings,
        imageUrl: `https://images.unsplash.com/photo-${Math.floor(Math.random() * 9000000000) + 1000000000}?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300&q=${encodeURIComponent(validatedRecipe.title)}`,
        sourceUrl: validatedRecipe.url,
        tags: this.extractTags(validatedRecipe)
      });

      this.validRecipeCount++;
      console.log(`✅ Saved recipe ${this.validRecipeCount}: ${validatedRecipe.title}`);
      return true;

    } catch (error) {
      console.error(`Database save error for ${validatedRecipe.title}:`, error.message);
      return false;
    }
  }

  private extractTags(recipe: ValidatedRecipe): string[] {
    const tags: string[] = [];
    const title = recipe.title.toLowerCase();
    const ingredients = recipe.ingredients.join(' ').toLowerCase();

    // Meal type tags
    if (title.includes('breakfast') || ingredients.includes('pancake') || ingredients.includes('cereal')) {
      tags.push('breakfast');
    }
    if (title.includes('lunch') || title.includes('sandwich') || title.includes('salad')) {
      tags.push('lunch');
    }
    if (title.includes('dinner') || title.includes('main') || ingredients.includes('chicken') || ingredients.includes('beef')) {
      tags.push('dinner');
    }
    if (title.includes('dessert') || title.includes('cake') || title.includes('cookie')) {
      tags.push('dessert');
    }

    // Protein tags
    if (ingredients.includes('chicken')) tags.push('chicken');
    if (ingredients.includes('beef')) tags.push('beef');
    if (ingredients.includes('pork')) tags.push('pork');
    if (ingredients.includes('fish') || ingredients.includes('salmon')) tags.push('seafood');
    if (ingredients.includes('tofu') || title.includes('vegetarian')) tags.push('vegetarian');

    // Cooking method tags
    if (title.includes('baked') || recipe.instructions.some(s => s.includes('bake'))) tags.push('baked');
    if (title.includes('grilled') || recipe.instructions.some(s => s.includes('grill'))) tags.push('grilled');
    if (title.includes('fried') || recipe.instructions.some(s => s.includes('fry'))) tags.push('fried');

    return tags;
  }

  async startMassRecipeScraping(): Promise<void> {
    console.log(`🚀 Starting mass recipe scraping for ${this.targetRecipeCount} recipes...`);
    
    for (const siteUrl of this.recipeUrls) {
      if (this.validRecipeCount >= this.targetRecipeCount) {
        console.log(`✅ Target of ${this.targetRecipeCount} recipes reached!`);
        break;
      }

      console.log(`\n📖 Processing site: ${siteUrl}`);
      
      // Get recipe links from this site
      const recipeLinks = await this.scrapeRecipesFromSite(siteUrl);
      console.log(`Found ${recipeLinks.length} recipe links from ${siteUrl}`);

      // Process each recipe link
      for (const recipeUrl of recipeLinks) {
        if (this.validRecipeCount >= this.targetRecipeCount) break;
        if (this.processedUrls.has(recipeUrl)) continue;

        this.processedUrls.add(recipeUrl);

        try {
          // Scrape recipe content
          const scrapedRecipe = await this.scrapeRecipeContent(recipeUrl);
          if (!scrapedRecipe) continue;

          // Validate with GPT
          const validatedRecipe = await this.validateRecipeWithGPT(scrapedRecipe);
          if (!validatedRecipe) continue;

          // Save to database
          await this.saveRecipeToDatabase(validatedRecipe);

          // Rate limiting - don't overwhelm sites or OpenAI
          await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (error) {
          console.error(`Error processing ${recipeUrl}:`, error.message);
          continue;
        }
      }

      console.log(`📊 Progress: ${this.validRecipeCount}/${this.targetRecipeCount} recipes collected`);
    }

    console.log(`\n🎉 Mass recipe scraping completed! Collected ${this.validRecipeCount} validated recipes.`);
  }
}

export const massRecipeScraper = new MassRecipeScraper();