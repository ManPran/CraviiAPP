// Recipe Ingredient Recommendation Algorithm
// This algorithm guides users toward complete recipes by intelligently selecting the next ingredient to show

export interface Recipe {
  id: number;
  name: string;
  ingredients: string[];
  instructions: string;
  prepTime: string;
  cookTime: string;
  difficulty: string;
  imageUrl?: string;
}

export interface RecipeMatch {
  recipe: Recipe;
  completionPercentage: number;
  availableIngredients: string[];
  missingIngredients: string[];
  canMake: boolean;
}

export interface IngredientScore {
  ingredient: string;
  score: number;
  recipeMatches: number;
  completionBonus: number;
}

export class RecipeAlgorithm {
  private recipes: Recipe[];
  private selectedIngredients: Set<string>;
  private rejectedIngredients: Set<string>;
  private allIngredients: string[];

  constructor(recipes: Recipe[]) {
    this.recipes = recipes;
    this.selectedIngredients = new Set();
    this.rejectedIngredients = new Set();
    this.allIngredients = this.extractAllIngredients();
    console.log(`RecipeAlgorithm initialized with ${recipes.length} recipes`);
    console.log('Sample recipe ingredients:', recipes.slice(0, 3).map(r => ({ name: r.name, ingredients: r.ingredients })));
  }

  // Extract all unique ingredients from recipes
  private extractAllIngredients(): string[] {
    const ingredientSet = new Set<string>();
    this.recipes.forEach(recipe => {
      recipe.ingredients.forEach(ingredient => {
        ingredientSet.add(ingredient.toLowerCase().trim());
      });
    });
    return Array.from(ingredientSet);
  }

  // Main function to get the next ingredient to show
  getNextIngredient(): string | null {
    // Filter out already swiped ingredients
    const availableIngredients = this.allIngredients.filter(ingredient => 
      !this.selectedIngredients.has(ingredient) && 
      !this.rejectedIngredients.has(ingredient)
    );

    if (availableIngredients.length === 0) {
      return null; // No more ingredients to show
    }

    // If no ingredients selected yet, return random ingredient
    if (this.selectedIngredients.size === 0) {
      return this.getRandomIngredient(availableIngredients);
    }

    // Calculate scores for each available ingredient
    const ingredientScores = availableIngredients.map(ingredient => ({
      ingredient,
      ...this.calculateIngredientScore(ingredient)
    }));

    // Sort by score (highest first)
    ingredientScores.sort((a, b) => b.score - a.score);
    
    // Add some randomness to avoid predictable patterns
    // Take top 3 candidates and randomly select one
    const topCandidates = ingredientScores.slice(0, Math.min(3, ingredientScores.length));
    const randomIndex = Math.floor(Math.random() * topCandidates.length);
    
    return topCandidates[randomIndex].ingredient;
  }

  // Calculate score for an ingredient based on recipe compatibility
  private calculateIngredientScore(ingredient: string): IngredientScore {
    let score = 0;
    let recipeMatches = 0;
    let completionBonus = 0;
    const selectedArray = Array.from(this.selectedIngredients);

    this.recipes.forEach(recipe => {
      const recipeIngredients = recipe.ingredients.map(ing => ing.toLowerCase().trim());
      
      // Check if this ingredient is in the recipe
      if (recipeIngredients.includes(ingredient)) {
        recipeMatches++;
        
        // Count how many selected ingredients are also in this recipe
        const matchingIngredients = selectedArray.filter(selected => 
          recipeIngredients.includes(selected)
        ).length;

        if (matchingIngredients > 0) {
          // Higher score for ingredients in recipes with more selected ingredients
          score += matchingIngredients * 15;
          
          // Calculate completion percentage if we add this ingredient
          const completionPercentage = (matchingIngredients + 1) / recipeIngredients.length;
          const completionScore = completionPercentage * 25;
          score += completionScore;
          completionBonus += completionScore;
          
          // Extra bonus if this would complete a recipe (100% completion)
          if (matchingIngredients + 1 === recipeIngredients.length) {
            score += 75; // Large bonus for completing a recipe
            completionBonus += 75;
          }
          
          // Bonus for high completion recipes (80%+ complete)
          else if (completionPercentage >= 0.8) {
            score += 40;
            completionBonus += 40;
          }
          
          // Medium bonus for recipes that are 60%+ complete
          else if (completionPercentage >= 0.6) {
            score += 20;
            completionBonus += 20;
          }
        }
      }
    });

    // Base score for ingredients that appear in multiple recipes
    score += recipeMatches * 2;

    return {
      score,
      recipeMatches,
      completionBonus
    };
  }

  // Get random ingredient (used for first selection)
  private getRandomIngredient(availableIngredients: string[]): string {
    const randomIndex = Math.floor(Math.random() * availableIngredients.length);
    return availableIngredients[randomIndex];
  }

  // Handle user swiping up (selecting ingredient)
  onIngredientSelected(ingredient: string): void {
    this.selectedIngredients.add(ingredient.toLowerCase().trim());
  }

  // Handle user swiping down (rejecting ingredient)
  onIngredientRejected(ingredient: string): void {
    this.rejectedIngredients.add(ingredient.toLowerCase().trim());
  }

  // Get recipes user can make with current ingredients
  getAvailableRecipes(minCompletionPercentage: number = 0.6): RecipeMatch[] {
    const selectedArray = Array.from(this.selectedIngredients);
    
    return this.recipes
      .map(recipe => {
        const recipeIngredients = recipe.ingredients.map(ing => ing.toLowerCase().trim());
        const availableIngredients = recipeIngredients.filter(ingredient => 
          selectedArray.includes(ingredient)
        );
        
        const completionPercentage = availableIngredients.length / recipeIngredients.length;
        const missingIngredients = recipeIngredients.filter(ingredient => 
          !selectedArray.includes(ingredient)
        );

        return {
          recipe,
          completionPercentage,
          availableIngredients,
          missingIngredients,
          canMake: completionPercentage >= minCompletionPercentage
        };
      })
      .filter(match => match.completionPercentage > 0)
      .sort((a, b) => b.completionPercentage - a.completionPercentage);
  }

  // Get recipes user can make completely (100% ingredients available)
  getCompleteRecipes(): RecipeMatch[] {
    return this.getAvailableRecipes(1.0);
  }

  // Get recipes that are close to completion (80%+ ingredients)
  getNearCompleteRecipes(): RecipeMatch[] {
    return this.getAvailableRecipes(0.8);
  }

  // Get current algorithm state
  getState() {
    return {
      selected: Array.from(this.selectedIngredients),
      rejected: Array.from(this.rejectedIngredients),
      totalIngredients: this.allIngredients.length,
      availableIngredients: this.allIngredients.length - this.selectedIngredients.size - this.rejectedIngredients.size
    };
  }

  // Reset algorithm state
  reset(): void {
    this.selectedIngredients.clear();
    this.rejectedIngredients.clear();
  }

  // Get detailed analytics for debugging
  getAnalytics() {
    const availableRecipes = this.getAvailableRecipes(0.1);
    const completeRecipes = this.getCompleteRecipes();
    const nearCompleteRecipes = this.getNearCompleteRecipes();

    return {
      totalRecipes: this.recipes.length,
      availableRecipes: availableRecipes.length,
      completeRecipes: completeRecipes.length,
      nearCompleteRecipes: nearCompleteRecipes.length,
      selectedCount: this.selectedIngredients.size,
      rejectedCount: this.rejectedIngredients.size,
      topRecipes: availableRecipes.slice(0, 5).map(match => ({
        name: match.recipe.name,
        completion: Math.round(match.completionPercentage * 100),
        missing: match.missingIngredients.length
      }))
    };
  }
}

// Sample recipe data for testing
export const sampleRecipes: Recipe[] = [
  {
    id: 1,
    name: "Chicken Broccoli Rice Bowl",
    ingredients: ["chicken breast", "broccoli", "rice", "soy sauce", "garlic"],
    instructions: "Cook rice according to package directions. Season chicken with salt and pepper, then cook in a large skillet until golden. Steam broccoli until tender. Combine rice, chicken, and broccoli in bowls. Drizzle with soy sauce and minced garlic.",
    prepTime: "15 min",
    cookTime: "20 min",
    difficulty: "Easy",
    imageUrl: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200"
  },
  {
    id: 2,
    name: "Fried Rice",
    ingredients: ["rice", "eggs", "soy sauce", "garlic", "green onions"],
    instructions: "Cook rice and let cool. Scramble eggs and set aside. Heat oil in large pan, add garlic and green onions. Add rice and soy sauce, stir in scrambled eggs.",
    prepTime: "10 min",
    cookTime: "15 min",
    difficulty: "Easy",
    imageUrl: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200"
  },
  {
    id: 3,
    name: "Garlic Chicken",
    ingredients: ["chicken breast", "garlic", "olive oil", "herbs"],
    instructions: "Season chicken with salt, pepper, and herbs. Heat olive oil in pan, add minced garlic. Cook chicken until golden and cooked through.",
    prepTime: "5 min",
    cookTime: "25 min",
    difficulty: "Easy",
    imageUrl: "https://images.unsplash.com/photo-1598515213692-d872330c7f0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200"
  },
  {
    id: 4,
    name: "Vegetable Stir Fry",
    ingredients: ["broccoli", "bell peppers", "carrots", "soy sauce", "garlic", "olive oil"],
    instructions: "Heat oil in large pan or wok. Add garlic and cook briefly. Add harder vegetables first (carrots), then softer ones (bell peppers, broccoli). Stir fry until tender-crisp. Season with soy sauce.",
    prepTime: "10 min",
    cookTime: "10 min",
    difficulty: "Easy",
    imageUrl: "https://images.unsplash.com/photo-1545093149-618ce3bcf49d?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200"
  },
  {
    id: 5,
    name: "Beef Tacos",
    ingredients: ["ground beef", "taco shells", "cheese", "lettuce", "tomatoes"],
    instructions: "Cook ground beef until browned and fully cooked. Warm taco shells. Fill shells with beef, cheese, lettuce, and diced tomatoes.",
    prepTime: "5 min",
    cookTime: "15 min",
    difficulty: "Easy",
    imageUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200"
  },
  {
    id: 6,
    name: "Caesar Salad",
    ingredients: ["lettuce", "parmesan cheese", "croutons", "caesar dressing"],
    instructions: "Wash and chop lettuce. Toss with caesar dressing. Top with parmesan cheese and croutons.",
    prepTime: "10 min",
    cookTime: "0 min",
    difficulty: "Easy",
    imageUrl: "https://images.unsplash.com/photo-1546793665-c74683f339c1?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200"
  },
  {
    id: 7,
    name: "Pancakes",
    ingredients: ["flour", "eggs", "milk", "butter", "baking powder"],
    instructions: "Mix dry ingredients. In separate bowl, whisk eggs, milk, and melted butter. Combine wet and dry ingredients. Cook on griddle until bubbles form and edges look set.",
    prepTime: "10 min",
    cookTime: "15 min",
    difficulty: "Easy",
    imageUrl: "https://images.unsplash.com/photo-1506084868230-bb9d95c24759?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200"
  },
  {
    id: 8,
    name: "Chicken Soup",
    ingredients: ["chicken breast", "carrots", "celery", "onions", "chicken broth"],
    instructions: "Dice vegetables. Cook chicken and shred. In large pot, sauté vegetables until soft. Add chicken broth and shredded chicken. Simmer until flavors combine.",
    prepTime: "15 min",
    cookTime: "30 min",
    difficulty: "Medium",
    imageUrl: "https://images.unsplash.com/photo-1547592180-85f173990554?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200"
  },
  {
    id: 9,
    name: "Grilled Salmon",
    ingredients: ["salmon", "olive oil", "lemon", "herbs", "garlic"],
    instructions: "Season salmon with salt, pepper, and herbs. Brush with olive oil and minced garlic. Grill 4-6 minutes per side. Serve with lemon wedges.",
    prepTime: "5 min",
    cookTime: "12 min",
    difficulty: "Medium",
    imageUrl: "https://images.unsplash.com/photo-1485921325833-c519f76c4927?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200"
  },
  {
    id: 10,
    name: "Spaghetti Carbonara",
    ingredients: ["spaghetti", "eggs", "parmesan cheese", "bacon", "garlic"],
    instructions: "Cook spaghetti. Fry bacon until crispy. Beat eggs with parmesan. Toss hot pasta with egg mixture and bacon. The heat will cook the eggs into a creamy sauce.",
    prepTime: "10 min",
    cookTime: "15 min",
    difficulty: "Medium",
    imageUrl: "https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200"
  }
];