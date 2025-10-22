// Strict meal type filtering based on user's exact specifications
export const STRICT_MEAL_RULES = {
  "breakfast": {
    "mainIngredients": ["Eggs", "Oats", "Greek Yogurt", "Tofu", "Smoothie Base", "Avocado Toast", "Protein Pancakes"],
    "supportingIngredients": {
      "Eggs": ["Spinach", "Tomatoes", "Cheese", "Bell Peppers", "Mushrooms", "Avocado", "Whole Wheat Toast"],
      "Oats": ["Banana", "Berries", "Honey", "Chia Seeds", "Almond Butter", "Cinnamon", "Milk"],
      "Greek Yogurt": ["Granola", "Honey", "Strawberries", "Blueberries", "Chia Seeds", "Nuts"],
      "Tofu": ["Spinach", "Tomatoes", "Soy Sauce", "Bell Peppers", "Avocado", "Onions"],
      "Smoothie Base": ["Banana", "Mixed Berries", "Spinach", "Almond Milk", "Honey", "Protein Powder"],
      "Avocado Toast": ["Avocado", "Whole Wheat Bread", "Tomato", "Everything Seasoning", "Egg"],
      "Protein Pancakes": ["Oats", "Banana", "Protein Powder", "Maple Syrup", "Peanut Butter"]
    }
  },
  "lunch": {
    "mainIngredients": ["Chicken Breast", "Turkey", "Tuna", "Lentils", "Chickpeas", "Quinoa", "Whole Wheat Pasta"],
    "supportingIngredients": {
      "Chicken Breast": ["Brown Rice", "Quinoa", "Broccoli", "Bell Peppers", "Olive Oil", "Spinach"],
      "Turkey": ["Whole Wheat Bread", "Lettuce", "Tomato", "Mustard", "Cheese", "Pickles"],
      "Tuna": ["Whole Wheat Bread", "Spinach", "Mayonnaise", "Tomato", "Pickles"],
      "Lentils": ["Brown Rice", "Spinach", "Tomatoes", "Carrots", "Olive Oil"],
      "Chickpeas": ["Spinach", "Bell Peppers", "Olive Oil", "Tahini", "Garlic"],
      "Quinoa": ["Spinach", "Bell Peppers", "Feta Cheese", "Tomatoes", "Olive Oil"],
      "Whole Wheat Pasta": ["Tomato Sauce", "Spinach", "Mushrooms", "Parmesan"]
    }
  },
  "dinner": {
    "mainIngredients": ["Salmon", "Ground Beef", "Chicken Thighs", "Tofu", "Shrimp", "Whole Wheat Pasta", "Quinoa"],
    "supportingIngredients": {
      "Salmon": ["Brown Rice", "Asparagus", "Lemon", "Olive Oil", "Spinach"],
      "Ground Beef": ["Brown Rice", "Bell Peppers", "Onions", "Tomato Sauce", "Spinach", "Cheddar Cheese"],
      "Chicken Thighs": ["Sweet Potato", "Green Beans", "Olive Oil", "Garlic", "Spinach"],
      "Tofu": ["Brown Rice", "Soy Sauce", "Broccoli", "Bell Peppers", "Garlic", "Spinach"],
      "Shrimp": ["Quinoa", "Garlic", "Olive Oil", "Bell Peppers", "Spinach", "Lemon"],
      "Whole Wheat Pasta": ["Tomato Sauce", "Spinach", "Parmesan", "Mushrooms"],
      "Quinoa": ["Broccoli", "Spinach", "Feta Cheese", "Tomatoes", "Olive Oil"]
    }
  }
};

export interface MealRecommendation {
  mealType: string;
  mainIngredient: string;
  supportingIngredients: string[];
  tasteProfile: string;
  suggestedCookTime: number;
  recommendedAppliance: string;
}

export function getValidMainIngredients(mealType: string): string[] {
  const normalizedMealType = mealType.toLowerCase() as keyof typeof STRICT_MEAL_RULES;
  return STRICT_MEAL_RULES[normalizedMealType]?.mainIngredients || [];
}

export function getSupportingIngredients(mealType: string, mainIngredient: string): string[] {
  const normalizedMealType = mealType.toLowerCase() as keyof typeof STRICT_MEAL_RULES;
  const mealRules = STRICT_MEAL_RULES[normalizedMealType];
  
  if (!mealRules) return [];
  
  // Try exact match first
  if (mealRules.supportingIngredients[mainIngredient as keyof typeof mealRules.supportingIngredients]) {
    return mealRules.supportingIngredients[mainIngredient as keyof typeof mealRules.supportingIngredients];
  }
  
  // Try fuzzy matching for ingredient names
  for (const [validIngredient, supportingList] of Object.entries(mealRules.supportingIngredients)) {
    if (mainIngredient.toLowerCase().includes(validIngredient.toLowerCase()) ||
        validIngredient.toLowerCase().includes(mainIngredient.toLowerCase())) {
      return supportingList;
    }
  }
  
  return [];
}

export function isValidMealCombination(mealType: string, mainIngredient: string): boolean {
  const validMains = getValidMainIngredients(mealType);
  // Use fuzzy matching for ingredient names
  return validMains.some(validName => 
    mainIngredient.toLowerCase().includes(validName.toLowerCase()) ||
    validName.toLowerCase().includes(mainIngredient.toLowerCase())
  );
}

export function generateMealRecommendation(
  mealType: string,
  mainIngredient: string,
  tasteProfile: string
): MealRecommendation | null {
  if (!isValidMealCombination(mealType, mainIngredient)) {
    return null;
  }

  const supportingIngredients = getSupportingIngredients(mealType, mainIngredient);
  
  // Filter supporting ingredients based on taste profile
  let filteredSupporting = supportingIngredients;
  if (tasteProfile.toLowerCase() === 'sweet') {
    // For sweet taste, prioritize fruits, honey, maple syrup, etc.
    filteredSupporting = supportingIngredients.filter(ingredient => 
      ['Banana', 'Berries', 'Honey', 'Strawberries', 'Blueberries', 'Maple Syrup', 'Mixed Berries'].includes(ingredient)
    );
    if (filteredSupporting.length === 0) {
      filteredSupporting = supportingIngredients.slice(0, 3); // fallback to first 3
    }
  } else {
    // For savory taste, exclude sweet ingredients
    filteredSupporting = supportingIngredients.filter(ingredient => 
      !['Honey', 'Maple Syrup', 'Strawberries', 'Blueberries', 'Mixed Berries'].includes(ingredient)
    );
  }

  // Determine cook time and appliance based on main ingredient
  const { cookTime, appliance } = getCookingDetails(mainIngredient);

  return {
    mealType,
    mainIngredient,
    supportingIngredients: filteredSupporting.slice(0, 3), // Limit to 3 supporting ingredients
    tasteProfile,
    suggestedCookTime: cookTime,
    recommendedAppliance: appliance
  };
}

function getCookingDetails(mainIngredient: string): { cookTime: number; appliance: string } {
  const cookingMap: Record<string, { cookTime: number; appliance: string }> = {
    "Smoothie Base": { cookTime: 5, appliance: "Blender" },
    "Greek Yogurt": { cookTime: 5, appliance: "None" },
    "Avocado Toast": { cookTime: 5, appliance: "None" },
    "Oats": { cookTime: 10, appliance: "Microwave" },
    "Eggs": { cookTime: 10, appliance: "Stovetop" },
    "Protein Pancakes": { cookTime: 15, appliance: "Stovetop" },
    "Tofu": { cookTime: 15, appliance: "Stovetop" },
    "Turkey": { cookTime: 10, appliance: "None" },
    "Tuna": { cookTime: 10, appliance: "None" },
    "Lentils": { cookTime: 20, appliance: "Stovetop" },
    "Chickpeas": { cookTime: 15, appliance: "Stovetop" },
    "Quinoa": { cookTime: 20, appliance: "Stovetop" },
    "Whole Wheat Pasta": { cookTime: 15, appliance: "Stovetop" },
    "Chicken Breast": { cookTime: 25, appliance: "Air Fryer" },
    "Salmon": { cookTime: 20, appliance: "Air Fryer" },
    "Ground Beef": { cookTime: 15, appliance: "Stovetop" },
    "Chicken Thighs": { cookTime: 30, appliance: "Air Fryer" },
    "Shrimp": { cookTime: 10, appliance: "Stovetop" }
  };

  return cookingMap[mainIngredient] || { cookTime: 15, appliance: "Stovetop" };
}