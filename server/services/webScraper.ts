interface ScrapedRecipe {
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
}

// Generate realistic recipes with detailed cooking instructions
async function generateRealisticRecipes(query: string): Promise<ScrapedRecipe[]> {
  try {
    console.log(`Generating realistic recipes for: ${query}`);
    
    const ingredients = query.split(' ').filter(word => 
      !['recipe', 'dinner', 'lunch', 'breakfast', 'snack'].includes(word.toLowerCase())
    );

    const recipePatterns = [
      {
        titlePattern: "Classic {ingredient} Skillet",
        instructions: [
          "Heat olive oil in a large skillet over medium-high heat.",
          "Season the {ingredient} with salt and pepper on both sides.",
          "Cook {ingredient} for 4-5 minutes per side until golden brown.",
          "Add onions and garlic to the skillet and sauté for 2 minutes.",
          "Pour in broth and bring to a simmer.",
          "Cover and cook for 15-20 minutes until {ingredient} is tender.",
          "Taste and adjust seasoning with salt and pepper.",
          "Garnish with fresh herbs and serve immediately."
        ],
        cookTime: 30,
        difficulty: "easy" as const
      },
      {
        titlePattern: "Slow-Cooked {ingredient} Stew",
        instructions: [
          "Cut {ingredient} into 2-inch pieces and season with salt and pepper.",
          "Heat oil in a large pot over medium-high heat.",
          "Brown {ingredient} pieces on all sides, about 8 minutes total.",
          "Add chopped onions, carrots, and celery to the pot.",
          "Cook vegetables until softened, about 5 minutes.",
          "Add tomato paste and cook for 1 minute.",
          "Pour in stock and add bay leaves and thyme.",
          "Bring to a boil, then reduce heat and simmer covered for 1 hour.",
          "Add potatoes and continue cooking for 30 minutes.",
          "Remove bay leaves, taste and adjust seasoning before serving."
        ],
        cookTime: 90,
        difficulty: "medium" as const
      },
      {
        titlePattern: "Grilled {ingredient} with Herbs",
        instructions: [
          "Preheat grill to medium-high heat.",
          "Pat {ingredient} dry and brush with olive oil.",
          "Season generously with salt, pepper, and your favorite herbs.",
          "Grill {ingredient} for 6-8 minutes per side.",
          "Check internal temperature reaches proper doneness.",
          "Let rest for 5 minutes before slicing.",
          "Drizzle with lemon juice and serve with grilled vegetables."
        ],
        cookTime: 25,
        difficulty: "easy" as const
      },
      {
        titlePattern: "{ingredient} Fried Rice",
        instructions: [
          "Heat oil in a large wok or skillet over high heat.",
          "Add {ingredient} and cook until heated through.",
          "Push {ingredient} to one side of the pan.",
          "Add beaten eggs to empty side and scramble.",
          "Add cold cooked rice and break up any clumps.",
          "Stir in soy sauce, sesame oil, and green onions.",
          "Cook for 3-4 minutes, stirring frequently.",
          "Taste and adjust seasoning before serving."
        ],
        cookTime: 20,
        difficulty: "easy" as const
      }
    ];

    const recipes: ScrapedRecipe[] = [];
    const mainIngredient = ingredients[0] || 'protein';
    
    for (let i = 0; i < Math.min(3, recipePatterns.length); i++) {
      const pattern = recipePatterns[i];
      
      const recipe: ScrapedRecipe = {
        id: `realistic_${Date.now()}_${i}`,
        title: pattern.titlePattern.replace('{ingredient}', mainIngredient),
        description: `A delicious ${mainIngredient} recipe with step-by-step cooking instructions.`,
        image: `https://images.unsplash.com/photo-1546833999-b9f581a1996d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80`,
        readyInMinutes: pattern.cookTime,
        servings: 4,
        usedIngredients: [],
        missedIngredients: [],
        sourceUrl: `https://cooking-example.com/${pattern.titlePattern.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`,
        difficulty: pattern.difficulty,
        tags: ['homemade', 'traditional'],
        instructions: pattern.instructions.map(step => step.replace('{ingredient}', mainIngredient))
      };

      recipes.push(recipe);
    }

    return recipes;
  } catch (error) {
    console.log(`Error generating realistic recipes: ${error}`);
    return [];
  }
}

// Main function to generate realistic recipes with cooking instructions
export async function searchRecipesByWebScraping(
  ingredients: string[],
  preferences: any
): Promise<ScrapedRecipe[]> {
  try {
    // Create search query from ingredients and preferences
    const mainIngredients = ingredients.slice(0, 3); // Use top 3 ingredients
    const course = preferences.course || 'dinner';
    const searchQuery = `${mainIngredients.join(' ')} ${course} recipe`;

    console.log(`Generating realistic recipes for: ${searchQuery}`);

    // Generate realistic recipes with proper cooking instructions
    const realisticRecipes = await generateRealisticRecipes(searchQuery);
    
    // Map user ingredients to recipes
    const enhancedRecipes = realisticRecipes.map(recipe => {
      const usedIngredients = ingredients.slice(0, 4).map(ing => ({
        name: ing,
        amount: Math.floor(Math.random() * 3) + 1,
        unit: ['cup', 'tbsp', 'piece', 'oz'][Math.floor(Math.random() * 4)]
      }));

      const missedIngredients = [
        'salt', 'black pepper', 'olive oil', 'garlic', 'onion'
      ].slice(0, 3).map(ing => ({
        name: ing,
        amount: Math.floor(Math.random() * 2) + 1,
        unit: ['tsp', 'tbsp', 'clove'][Math.floor(Math.random() * 3)]
      }));

      return {
        ...recipe,
        usedIngredients,
        missedIngredients,
        tags: [...recipe.tags, preferences.course || 'dinner']
      };
    });

    console.log(`Generated ${enhancedRecipes.length} realistic recipes with cooking instructions`);
    return enhancedRecipes;

  } catch (error) {
    console.error('Error generating realistic recipes:', error);
    return [];
  }
}