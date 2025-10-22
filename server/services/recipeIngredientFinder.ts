import axios from 'axios';
import { storage } from '../storage';
import type { Ingredient } from '@shared/schema';
import { getValidMainIngredients } from './strictMealTypeFilter';

interface RecipeIngredientMatch {
  ingredient: Ingredient;
  frequency: number; // how often this ingredient appears with the main ingredient
}

// Cache for ingredient pairings to avoid excessive API calls
const ingredientPairingsCache = new Map<string, Ingredient[]>();

export async function findComplementaryIngredients(
  mainIngredient: string,
  limit: number = 20,
  tastePreference?: string
): Promise<Ingredient[]> {
  // Check cache first (include taste preference in cache key)
  const cacheKey = `${mainIngredient}_${limit}_${tastePreference || 'any'}`;
  if (ingredientPairingsCache.has(cacheKey)) {
    return ingredientPairingsCache.get(cacheKey)!;
  }

  try {
    // Search for recipes that include the main ingredient
    const searchQuery = `${mainIngredient} recipe ingredients site:allrecipes.com OR site:foodnetwork.com OR site:bonappetit.com OR site:epicurious.com`;
    
    const response = await axios.get('https://serpapi.com/search', {
      params: {
        q: searchQuery,
        api_key: process.env.SERP_API_KEY,
        engine: 'google',
        num: 10, // Get 10 recipe results
        gl: 'us',
        hl: 'en'
      }
    });

    const organicResults = response.data.organic_results || [];
    const ingredientFrequency = new Map<string, number>();
    
    // Extract ingredients from recipe descriptions and titles
    for (const result of organicResults) {
      const text = `${result.title} ${result.snippet}`.toLowerCase();
      
      // Common ingredients that pair with main ingredients
      const commonIngredients = [
        'onion', 'garlic', 'tomato', 'cheese', 'salt', 'pepper', 'oil', 'butter',
        'herbs', 'spices', 'lemon', 'lime', 'mushrooms', 'bell pepper', 'carrot',
        'celery', 'parsley', 'basil', 'oregano', 'thyme', 'rosemary', 'paprika',
        'cumin', 'chili powder', 'ginger', 'soy sauce', 'vinegar', 'flour',
        'egg', 'milk', 'cream', 'broth', 'stock', 'wine', 'spinach', 'kale',
        'zucchini', 'broccoli', 'cauliflower', 'corn', 'peas', 'beans'
      ];
      
      // Count frequency of ingredients mentioned
      for (const ingredient of commonIngredients) {
        if (text.includes(ingredient)) {
          ingredientFrequency.set(ingredient, (ingredientFrequency.get(ingredient) || 0) + 1);
        }
      }
    }

    // Get all ingredients from database
    const allIngredients = await storage.getIngredients();
    
    // Match found ingredients with database ingredients
    const matchedIngredients: RecipeIngredientMatch[] = [];
    
    Array.from(ingredientFrequency.entries()).forEach(([ingredientName, frequency]) => {
      // Find matching ingredients in database
      const matches = allIngredients.filter(ing => 
        ing.priority === 'complementary' && (
          ing.name.toLowerCase().includes(ingredientName) ||
          ing.searchTerms.some(term => term.toLowerCase().includes(ingredientName)) ||
          ingredientName.includes(ing.name.toLowerCase())
        )
      );
      
      for (const match of matches) {
        matchedIngredients.push({ ingredient: match, frequency });
      }
    });

    // Sort by frequency and remove duplicates
    const uniqueIngredients = new Map<number, Ingredient>();
    matchedIngredients
      .sort((a, b) => b.frequency - a.frequency)
      .forEach(({ ingredient }) => {
        if (!uniqueIngredients.has(ingredient.id)) {
          uniqueIngredients.set(ingredient.id, ingredient);
        }
      });

    // If we don't have enough matches, add some common complementary ingredients
    const complementaryIngredients = Array.from(uniqueIngredients.values());
    
    if (complementaryIngredients.length < limit) {
      let additionalIngredients = allIngredients
        .filter(ing => 
          ing.priority === 'complementary' && 
          !uniqueIngredients.has(ing.id) &&
          ing.isCommon
        );

      // Apply taste preference filtering to additional ingredients
      if (tastePreference === 'sweet') {
        // For sweet preferences, exclude savory proteins and strong spices
        const avoidIngredients = ['shrimp', 'fish', 'beef', 'pork', 'chicken', 'curry', 'cumin', 'paprika', 'chili'];
        additionalIngredients = additionalIngredients.filter(ing => 
          !avoidIngredients.some(avoid => ing.name.toLowerCase().includes(avoid))
        );
      } else if (tastePreference === 'savory') {
        // For savory preferences, exclude very sweet ingredients
        const avoidIngredients = ['sugar', 'honey', 'maple', 'chocolate', 'vanilla', 'cinnamon'];
        additionalIngredients = additionalIngredients.filter(ing => 
          !avoidIngredients.some(avoid => ing.name.toLowerCase().includes(avoid))
        );
      }
      
      complementaryIngredients.push(...additionalIngredients.slice(0, limit - complementaryIngredients.length));
    }

    const result = complementaryIngredients.slice(0, limit);
    
    // Cache the result
    ingredientPairingsCache.set(cacheKey, result);
    
    return result;
    
  } catch (error) {
    console.error('Error finding complementary ingredients:', error);
    
    // Fallback: return common complementary ingredients
    const allIngredients = await storage.getIngredients();
    return allIngredients
      .filter(ing => ing.priority === 'complementary' && ing.isCommon)
      .slice(0, limit);
  }
}

export async function getRandomMainIngredient(
  tastePreference?: string, 
  coursePreference?: string,
  cookTime?: number,
  appliances?: string[]
): Promise<Ingredient | null> {
  try {
    // Use strict meal type filtering
    if (coursePreference) {
      const validMainIngredientNames = getValidMainIngredients(coursePreference);
      
      if (validMainIngredientNames.length === 0) {
        console.warn(`No valid main ingredients found for meal type: ${coursePreference}`);
        return null;
      }
      
      // Get all ingredients from database
      const allIngredients = await storage.getIngredients();
      
      // Filter to only include ingredients that match the strict meal type rules
      const validIngredients = allIngredients.filter(ingredient => {
        // Check if ingredient name matches any of the valid main ingredients
        const ingredientName = ingredient.name;
        return validMainIngredientNames.some(validName => 
          ingredientName.toLowerCase().includes(validName.toLowerCase()) ||
          validName.toLowerCase().includes(ingredientName.toLowerCase())
        );
      });
      
      if (validIngredients.length === 0) {
        console.warn(`No matching ingredients found for meal type: ${coursePreference}`);
        return null;
      }
      
      // Apply taste filtering for sweet vs savory
      let filteredIngredients = validIngredients;
      if (tastePreference === "sweet") {
        // For sweet taste, prioritize ingredients that work well with sweet preparations
        const sweetFriendly = ["Oats", "Greek Yogurt", "Smoothie Base", "Avocado Toast", "Protein Pancakes"];
        const sweetFiltered = validIngredients.filter(ingredient =>
          sweetFriendly.some(sweetItem => 
            ingredient.name.toLowerCase().includes(sweetItem.toLowerCase()) ||
            sweetItem.toLowerCase().includes(ingredient.name.toLowerCase())
          )
        );
        
        // If no sweet-friendly ingredients, use all available
        if (sweetFiltered.length > 0) {
          filteredIngredients = sweetFiltered;
        }
      }
      
      // Return a random ingredient from the filtered list
      const randomIndex = Math.floor(Math.random() * filteredIngredients.length);
      const selectedIngredient = filteredIngredients[randomIndex];
      
      // Ensure the priority is set to "main" for UI logic
      return {
        ...selectedIngredient,
        priority: "main"
      };
    }
    
    // Fallback to original logic if no course preference
    const mainIngredients = await storage.getIngredientsByPriority('main');
    if (mainIngredients.length === 0) {
      return null;
    }
    
    const randomIndex = Math.floor(Math.random() * mainIngredients.length);
    const selectedIngredient = mainIngredients[randomIndex];
    
    // Ensure the priority is set to "main" for UI logic
    return {
      ...selectedIngredient,
      priority: "main"
    };
    
  } catch (error) {
    console.error('Error getting random main ingredient:', error);
    return null;
  }
}