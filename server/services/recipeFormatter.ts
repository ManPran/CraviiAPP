import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface RawRecipeData {
  title: string;
  ingredients: Array<{
    name: string;
    amount?: number;
    unit?: string;
  }>;
  instructions: string[];
  servings?: number;
  cookTime?: number;
  sourceUrl: string;
}

export interface FormattedRecipe {
  title: string;
  description: string;
  ingredients: Array<{
    name: string;
    amount: number;
    unit: string;
  }>;
  instructions: string[];
  servings: number;
  cookTime: number;
  difficulty: "easy" | "medium" | "hard";
  tags: string[];
}

/**
 * Use OpenAI to format and enhance a scraped recipe
 */
export async function formatRecipeWithAI(rawRecipe: RawRecipeData): Promise<FormattedRecipe> {
  try {
    console.log(`Formatting recipe "${rawRecipe.title}" with OpenAI...`);
    
    const prompt = `You are a professional recipe formatter. Take this raw recipe data and format it into a complete, well-structured recipe.

Raw Recipe Data:
Title: ${rawRecipe.title}
Ingredients: ${rawRecipe.ingredients.map(ing => `${ing.amount || ''} ${ing.unit || ''} ${ing.name}`.trim()).join(', ')}
Instructions: ${rawRecipe.instructions.join(' ')}
Servings: ${rawRecipe.servings || 'unknown'}
Cook Time: ${rawRecipe.cookTime || 'unknown'} minutes

Please format this into a complete recipe with:
1. A clear, appetizing title
2. A brief description (1-2 sentences)
3. Properly measured ingredients with realistic amounts and units
4. Clear, numbered step-by-step instructions
5. Estimated servings (2-8 people)
6. Estimated cook time in minutes
7. Difficulty level (easy/medium/hard)
8. Relevant tags (cuisine type, dietary info, cooking method)

Respond with JSON in this exact format:
{
  "title": "Recipe Name",
  "description": "Brief appetizing description",
  "ingredients": [
    {"name": "ingredient name", "amount": 1, "unit": "cup"}
  ],
  "instructions": [
    "Step 1 instruction",
    "Step 2 instruction"
  ],
  "servings": 4,
  "cookTime": 30,
  "difficulty": "easy",
  "tags": ["tag1", "tag2"]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a professional recipe formatter. Always respond with valid JSON in the exact format requested."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3
    });

    const formattedRecipe = JSON.parse(response.choices[0].message.content || '{}');
    
    // Validate the response has required fields
    if (!formattedRecipe.title || !formattedRecipe.ingredients || !formattedRecipe.instructions) {
      throw new Error('Invalid response from OpenAI - missing required fields');
    }

    console.log(`Successfully formatted recipe: "${formattedRecipe.title}" with ${formattedRecipe.ingredients.length} ingredients and ${formattedRecipe.instructions.length} steps`);
    
    return formattedRecipe;
  } catch (error) {
    console.error('Error formatting recipe with OpenAI:', error);
    
    // Check if it's a rate limit error
    if (error.status === 429) {
      console.log('OpenAI rate limit exceeded, using enhanced fallback formatting');
    }
    
    // Fallback to basic formatting if AI fails
    return formatRecipeBasic(rawRecipe);
  }
}

/**
 * Enhanced fallback formatting without AI - generates better content
 */
function formatRecipeBasic(rawRecipe: RawRecipeData): FormattedRecipe {
  const title = rawRecipe.title || "Recipe";
  const ingredientCount = rawRecipe.ingredients.length;
  
  // Generate better instructions based on ingredients
  const instructions = rawRecipe.instructions.length > 0 ? rawRecipe.instructions : [
    "Preheat your cooking appliance as needed.",
    "Prepare all ingredients according to the recipe requirements.",
    "Follow the cooking method appropriate for your main ingredients.",
    "Season to taste and cook until fully prepared.",
    "Serve hot and enjoy your meal."
  ];
  
  // Better difficulty estimation
  const difficulty = ingredientCount <= 5 ? "easy" : ingredientCount <= 10 ? "medium" : "hard";
  
  return {
    title,
    description: `A delicious ${title.toLowerCase()} recipe with ${ingredientCount} ingredients.`,
    ingredients: rawRecipe.ingredients.map(ing => ({
      name: ing.name,
      amount: ing.amount || getTypicalAmount(ing.name),
      unit: ing.unit || getTypicalUnit(ing.name)
    })),
    instructions,
    servings: rawRecipe.servings || 4,
    cookTime: rawRecipe.cookTime || 30,
    difficulty: difficulty as "easy" | "medium" | "hard",
    tags: ["homemade", "authentic"]
  };
}

function getTypicalAmount(ingredient: string): number {
  const ing = ingredient.toLowerCase();
  if (ing.includes('cup') || ing.includes('water') || ing.includes('broth')) return 1;
  if (ing.includes('tablespoon') || ing.includes('oil')) return 2;
  if (ing.includes('teaspoon') || ing.includes('salt') || ing.includes('pepper')) return 1;
  if (ing.includes('clove') || ing.includes('garlic')) return 3;
  if (ing.includes('onion')) return 1;
  return 1;
}

function getTypicalUnit(ingredient: string): string {
  const ing = ingredient.toLowerCase();
  if (ing.includes('flour') || ing.includes('sugar') || ing.includes('water')) return 'cup';
  if (ing.includes('oil') || ing.includes('butter')) return 'tablespoon';
  if (ing.includes('salt') || ing.includes('pepper') || ing.includes('spice')) return 'teaspoon';
  if (ing.includes('egg')) return 'piece';
  if (ing.includes('onion') || ing.includes('garlic')) return 'piece';
  if (ing.includes('meat') || ing.includes('chicken') || ing.includes('beef')) return 'lb';
  return 'piece';
}

/**
 * Enhanced recipe generation using AI for complete recipes
 */
export async function generateCompleteRecipe(
  selectedIngredients: string[], 
  preferences: {
    course: string;
    taste: string;
    cookTime: number;
    appliances: string[];
  }
): Promise<FormattedRecipe> {
  try {
    console.log(`Generating complete recipe with AI using ingredients: ${selectedIngredients.join(', ')}`);
    
    const prompt = `Create a complete, authentic ${preferences.course} recipe using these ingredients: ${selectedIngredients.join(', ')}.

Requirements:
- Course: ${preferences.course}
- Taste profile: ${preferences.taste}
- Cooking time: approximately ${preferences.cookTime} minutes
- Available appliances: ${preferences.appliances.join(', ')}
- Use as many of the provided ingredients as possible
- Add other common ingredients needed to make a complete recipe
- Make it realistic and cookable

Respond with JSON in this exact format:
{
  "title": "Recipe Name",
  "description": "Brief appetizing description",
  "ingredients": [
    {"name": "ingredient name", "amount": 1, "unit": "cup"}
  ],
  "instructions": [
    "Step 1 instruction",
    "Step 2 instruction"
  ],
  "servings": 4,
  "cookTime": 30,
  "difficulty": "easy",
  "tags": ["tag1", "tag2"]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a professional chef creating authentic, detailed recipes. Always respond with valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.4
    });

    const recipe = JSON.parse(response.choices[0].message.content || '{}');
    
    if (!recipe.title || !recipe.ingredients || !recipe.instructions) {
      throw new Error('Invalid recipe response from OpenAI');
    }

    console.log(`Generated complete recipe: "${recipe.title}" with ${recipe.ingredients.length} ingredients`);
    
    return recipe;
  } catch (error) {
    console.error('Error generating complete recipe with AI:', error);
    throw error;
  }
}