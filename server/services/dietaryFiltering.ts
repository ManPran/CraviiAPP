import { Ingredient } from "@shared/schema";

// Complete dietary restriction definitions
export const DIETARY_RESTRICTIONS = {
  religious: {
    'Judaism (Kosher)': ['Not Kosher'],
    'Islam (Halal)': ['Not Halal'],
    'Hindu (Vegetarian)': ['Not Hindu-Friendly', 'Meat'],
    'Buddhism (Vegetarian)': ['Meat'],
    'Jainism (Vegan)': ['Meat', 'Contains Dairy', 'Contains Eggs'],
    'Seventh-day Adventist': ['Meat', 'Not Kosher'],
    'Mormon (Word of Wisdom)': ['Not Kosher'],
    'Orthodox Christian (Fasting)': ['Meat', 'Contains Dairy']
  },
  allergies: {
    'Gluten/Wheat': ['Contains Gluten'],
    'Dairy/Lactose': ['Contains Dairy'],
    'Eggs': ['Contains Eggs'],
    'Tree Nuts': ['Tree Nuts'],
    'Peanuts': ['Peanuts'],
    'Shellfish': ['Shellfish'],
    'Fish': ['Fish'],
    'Soy': ['Contains Soy'],
    'Sesame': ['Contains Sesame'],
    'Corn': ['Corn']
  }
};

// Get all restriction tags that should be excluded for given dietary restrictions
export function getExcludedTags(dietaryRestrictions: string[]): string[] {
  const excludedTags = new Set<string>();
  
  dietaryRestrictions.forEach(restriction => {
    // Check religious restrictions
    const religiousTags = DIETARY_RESTRICTIONS.religious[restriction as keyof typeof DIETARY_RESTRICTIONS.religious];
    if (religiousTags) {
      religiousTags.forEach(tag => excludedTags.add(tag));
    }
    
    // Check allergy restrictions
    const allergyTags = DIETARY_RESTRICTIONS.allergies[restriction as keyof typeof DIETARY_RESTRICTIONS.allergies];
    if (allergyTags) {
      allergyTags.forEach(tag => excludedTags.add(tag));
    }
  });
  
  return Array.from(excludedTags);
}

// Check if an ingredient violates dietary restrictions
export function isIngredientAllowed(ingredient: Ingredient, dietaryRestrictions: string[]): boolean {
  if (!dietaryRestrictions.length) return true;
  
  // Safety check: if ingredient is null or undefined, allow it
  if (!ingredient) {
    console.warn("Ingredient is null or undefined, allowing by default");
    return true;
  }
  
  const excludedTags = getExcludedTags(dietaryRestrictions);
  const ingredientTags = ingredient.dietaryTags || [];
  
  // If no dietary tags are available, allow the ingredient (avoid breaking the app)
  if (!ingredientTags || ingredientTags.length === 0) {
    console.warn(`No dietary tags found for ingredient: ${ingredient.name || 'unknown'}, allowing by default`);
    return true;
  }
  
  // Check if ingredient has any excluded tags
  return !excludedTags.some(excludedTag => 
    ingredientTags.some(ingredientTag => 
      ingredientTag.toLowerCase().includes(excludedTag.toLowerCase()) ||
      excludedTag.toLowerCase().includes(ingredientTag.toLowerCase())
    )
  );
}

// Filter ingredients based on dietary restrictions
export function filterIngredientsByDiet(ingredients: Ingredient[], dietaryRestrictions: string[]): Ingredient[] {
  if (!dietaryRestrictions.length) return ingredients;
  
  return ingredients.filter(ingredient => isIngredientAllowed(ingredient, dietaryRestrictions));
}

// Check if a recipe is allowed based on ingredient dietary tags
export function isRecipeAllowed(recipeIngredients: string[], allIngredients: Ingredient[], dietaryRestrictions: string[]): boolean {
  if (!dietaryRestrictions.length) return true;
  
  // Find all ingredients used in this recipe
  const usedIngredients = allIngredients.filter(ingredient => 
    recipeIngredients.some(recipeIng => 
      ingredient.name.toLowerCase() === recipeIng.toLowerCase()
    )
  );
  
  // Check if all ingredients are allowed
  return usedIngredients.every(ingredient => isIngredientAllowed(ingredient, dietaryRestrictions));
}

// Get dietary restriction display labels
export function getDietaryRestrictionCategories() {
  return {
    religious: {
      title: "Religious Dietary Laws",
      options: Object.keys(DIETARY_RESTRICTIONS.religious)
    },
    allergies: {
      title: "Food Allergies & Intolerances",
      options: Object.keys(DIETARY_RESTRICTIONS.allergies)
    }
  };
}

// Import and process the CSV dietary tags data
export async function loadIngredientDietaryTags(): Promise<Map<string, string[]>> {
  // This would be called to load the CSV data into the database
  // For now, we'll return the mapping from the CSV file you provided
  const dietaryTagsMap = new Map<string, string[]>();
  
  // Sample data from your CSV - this should be loaded from the actual file
  const csvData = [
    ['Acai Bowl', 'Fish, Pescatarian-Friendly, Shellfish'],
    ['Almond Flour Muffins', 'Fish, Pescatarian-Friendly, Shellfish'],
    ['Almonds', 'Fish, Pescatarian-Friendly, Shellfish, Tree Nuts'],
    ['Avocado', 'Fish, Pescatarian-Friendly, Shellfish'],
    ['Bagel', 'Fish, Pescatarian-Friendly, Shellfish, Contains Gluten'],
    ['Beef Brisket', 'Not Hindu-Friendly, Fish, Pescatarian-Friendly, Shellfish'],
    ['Beef Strips', 'Not Hindu-Friendly, Fish, Pescatarian-Friendly, Shellfish'],
    ['Breakfast Sausage', 'Not Kosher, Not Halal, Fish, Pescatarian-Friendly, Shellfish'],
    ['Cheddar Cheese', 'Fish, Pescatarian-Friendly, Shellfish, Contains Dairy'],
    ['Chicken Breast', 'Meat, Fish, Pescatarian-Friendly, Shellfish'],
    ['Chicken Sausage', 'Not Kosher, Not Halal, Meat, Fish, Pescatarian-Friendly, Shellfish'],
    ['Corn', 'Fish, Pescatarian-Friendly, Shellfish, Corn'],
    ['Cottage Cheese', 'Fish, Pescatarian-Friendly, Shellfish, Contains Dairy'],
    ['Edamame', 'Fish, Pescatarian-Friendly, Shellfish, Contains Soy'],
    ['Eggs', 'Contains Eggs, Fish, Pescatarian-Friendly, Shellfish'],
    ['Greek Yogurt', 'Fish, Pescatarian-Friendly, Shellfish, Contains Dairy'],
    ['Ground Beef', 'Not Hindu-Friendly, Fish, Pescatarian-Friendly, Shellfish'],
    ['Lamb Chops', 'Not Hindu-Friendly, Fish, Pescatarian-Friendly, Shellfish'],
    ['Lentils', 'Fish, Pescatarian-Friendly, Shellfish'],
    ['Pork Tenderloin', 'Not Kosher, Not Halal, Fish, Pescatarian-Friendly, Shellfish'],
    ['Salmon', 'Fish, Pescatarian-Friendly, Shellfish'],
    ['Shrimp', 'Fish, Pescatarian-Friendly, Shellfish'],
    ['Soy Sauce', 'Fish, Pescatarian-Friendly, Shellfish, Contains Soy'],
    ['Tempeh', 'Fish, Pescatarian-Friendly, Shellfish, Contains Soy'],
    ['Tofu', 'Fish, Pescatarian-Friendly, Shellfish, Contains Soy'],
    ['Turkey', 'Meat, Fish, Pescatarian-Friendly, Shellfish'],
    ['Turkey Bacon', 'Not Kosher, Not Halal, Meat, Fish, Pescatarian-Friendly, Shellfish'],
    ['Walnuts', 'Fish, Pescatarian-Friendly, Shellfish, Tree Nuts'],
    ['Whole Wheat Pasta', 'Fish, Pescatarian-Friendly, Shellfish, Contains Gluten'],
    ['Yogurt', 'Fish, Pescatarian-Friendly, Shellfish, Contains Dairy']
  ];
  
  csvData.forEach(([ingredient, tags]) => {
    const tagArray = tags.split(', ').map(tag => tag.trim());
    dietaryTagsMap.set(ingredient, tagArray);
  });
  
  return dietaryTagsMap;
}