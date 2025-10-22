// Test the ingredient filtering patterns
const testCases = [
  "2 piece Reviews",
  "2 piece Photos", 
  "10 piece mins",
  "1 teaspoon honey mustard",
  "4 teaspoons mayonnaise",
  "1 cup precooked shredded potatoes",
  "4 tilapia fillets",
  "1 piece shallot",
  "0.5 teaspoon red pepper flakes"
];

function isValidIngredient(text) {
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

console.log("Testing ingredient filtering:");
testCases.forEach(test => {
  const result = isValidIngredient(test);
  console.log(`"${test}" -> ${result ? 'VALID' : 'INVALID'}`);
});