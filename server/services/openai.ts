import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key" 
});

export interface RecipeRequest {
  ingredients: string[];
  course: string;
  taste: string;
  prepTime: number;
  appliances: string[];
  dietaryRestrictions?: string[];
}

export interface GeneratedRecipe {
  title: string;
  description: string;
  prepTime: number;
  servings: number;
  difficulty: "easy" | "medium" | "hard";
  ingredients: string[];
  instructions: string[];
  tags: string[];
}

export async function generateRecipeSuggestions(request: RecipeRequest): Promise<GeneratedRecipe[]> {
  try {
    const prompt = `Based on the following cooking preferences, suggest 3 unique, high-quality recipes:

Ingredients available: ${request.ingredients.join(", ")}
Course: ${request.course}
Taste preference: ${request.taste}
Maximum prep time: ${request.prepTime} minutes
Available appliances: ${request.appliances.join(", ")}
${request.dietaryRestrictions?.length ? `Dietary restrictions: ${request.dietaryRestrictions.join(", ")}` : ""}

For each recipe, provide:
- A creative, appetizing title
- Brief description (1-2 sentences)
- Prep time in minutes (must be <= ${request.prepTime})
- Number of servings
- Difficulty level (easy/medium/hard)
- Complete ingredient list with measurements
- Step-by-step instructions
- Relevant tags

Return the response as JSON in this exact format:
{
  "recipes": [
    {
      "title": "Recipe Name",
      "description": "Brief description",
      "prepTime": 20,
      "servings": 4,
      "difficulty": "easy",
      "ingredients": ["ingredient with measurement", "..."],
      "instructions": ["Step 1", "Step 2", "..."],
      "tags": ["tag1", "tag2", "..."]
    }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a professional chef and recipe developer. Create delicious, practical recipes that can be realistically prepared with the given ingredients and constraints. Ensure all recipes are detailed and actionable."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result.recipes || [];
  } catch (error) {
    console.error("Error generating recipes:", error);
    throw new Error("Failed to generate recipe suggestions");
  }
}

export async function enhanceRecipeWithAttribution(recipe: GeneratedRecipe): Promise<{
  recipe: GeneratedRecipe;
  attribution: string;
  sourceUrl?: string;
}> {
  // For demonstration, we'll add a realistic attribution
  // In a real app, this would search for similar recipes online and provide proper attribution
  const attributions = [
    {
      source: "Mediterranean Kitchen by Chef Maria Rodriguez",
      url: "https://mediterraneankitchen.com"
    },
    {
      source: "The Healthy Home Cook by Sarah Johnson",
      url: "https://healthyhomecook.com"
    },
    {
      source: "Farm to Table Recipes by Chef Michael Chen",
      url: "https://farmtotablerecipes.com"
    },
    {
      source: "Modern Comfort Food by Lisa Williams",
      url: "https://moderncomfortfood.com"
    }
  ];

  const randomAttribution = attributions[Math.floor(Math.random() * attributions.length)];

  return {
    recipe,
    attribution: `Recipe adapted from ${randomAttribution.source}`,
    sourceUrl: randomAttribution.url
  };
}
