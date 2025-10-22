// Test PostgreSQL array parsing
const testString = '{"Almonds","Avocado","Basil","Bell Peppers","Black Pepper","Broccoli","Brown Rice","Carrots","Cheddar Cheese","Chia Seeds","Chili Flakes","Cilantro","Corn","Cucumber","Feta Cheese","Flax Seeds","Garlic","Ginger","Green Beans","Honey","Hot Sauce","Hummus","Lemon Juice","Lettuce","Maple Syrup","Mayonnaise","Mushrooms","Mustard","Olive Oil","Onion","Paprika","Parmesan","Parsley","Pickles","Quinoa","Rice","Salt","Scallions","Sesame Oil","Soy Sauce","Spinach","Sweet Corn","Tahini","Thyme","Tomato Sauce","Tomatoes","Walnuts","Yogurt"}';

console.log('Original string:', testString);

// Parse as we're doing in the code
let supportingIngredients: string[] = [];
if (testString.startsWith('{') && testString.endsWith('}')) {
  // Remove braces and split by comma, then clean up quotes
  supportingIngredients = testString.slice(1, -1)
    .split(',')
    .map(item => item.trim().replace(/^"(.*)"$/, '$1'))
    .filter(item => item.length > 0);
}

console.log('Parsed ingredients count:', supportingIngredients.length);
console.log('First 10 ingredients:', supportingIngredients.slice(0, 10));

// Check if any contain "pasta"
const pastaIngredients = supportingIngredients.filter(ing => ing.toLowerCase().includes('pasta'));
console.log('Pasta ingredients found:', pastaIngredients);

// Test the ingredient matching logic
function ingredientNamesMatch(dbIngredient: string, userIngredient: string): boolean {
  const normalize = (str: string) => str.toLowerCase().trim();
  
  const dbNorm = normalize(dbIngredient);
  const userNorm = normalize(userIngredient);
  
  console.log(`Testing match: "${dbNorm}" vs "${userNorm}"`);
  
  // Direct match
  if (dbNorm === userNorm) {
    console.log('Direct match found!');
    return true;
  }
  
  // Handle common variations
  const variations: { [key: string]: string[] } = {
    "whole wheat pasta": ["pasta", "spaghetti pasta", "spaghetti", "whole wheat pasta"],
    "spaghetti pasta": ["pasta", "spaghetti pasta", "spaghetti", "whole wheat pasta"],
    "pasta": ["spaghetti pasta", "spaghetti", "whole wheat pasta"],
    "spaghetti": ["spaghetti pasta", "pasta", "whole wheat pasta"],
  };
  
  // Check variations
  const userVariations = variations[userNorm] || [userNorm];
  const dbVariations = variations[dbNorm] || [dbNorm];
  
  console.log('User variations:', userVariations);
  console.log('DB variations:', dbVariations);
  
  const match = userVariations.some(uVar => 
    dbVariations.some(dVar => 
      uVar === dVar || uVar.includes(dVar) || dVar.includes(uVar)
    )
  );
  
  console.log('Variation match result:', match);
  return match;
}

// Test the main ingredient matching
console.log('\n=== Testing main ingredient matching ===');
const match1 = ingredientNamesMatch('Whole Wheat Pasta', 'Spaghetti pasta');
console.log('Result for "Whole Wheat Pasta" vs "Spaghetti pasta":', match1);

// Test if supporting ingredients work
console.log('\n=== Testing supporting ingredients ===');
const allRecipeIngredients = ['Whole Wheat Pasta', ...supportingIngredients];
console.log('Total recipe ingredients:', allRecipeIngredients.length);

const userIngredient = 'Spaghetti pasta';
const found = allRecipeIngredients.some(recipeIng => 
  ingredientNamesMatch(recipeIng, userIngredient)
);
console.log(`Match found for "${userIngredient}":`, found);