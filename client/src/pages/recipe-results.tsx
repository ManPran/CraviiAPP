import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, Users, ExternalLink, AlertCircle, RefreshCw } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { IngredientLegacy } from "@shared/schema";

interface RecipeResult {
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
  instructions?: string[];
}

interface RecipeResultsProps {
  selectedIngredients: IngredientLegacy[];
  preferences: any;
  onBack: () => void;
  onSelectRecipe: (recipe: any) => void;
}

export default function RecipeResults({ selectedIngredients, preferences, onBack, onSelectRecipe }: RecipeResultsProps) {
  const [recipes, setRecipes] = useState<RecipeResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const searchRecipesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/recipe-search", {
        ingredients: selectedIngredients.map(ing => ing.name),
        preferences
      });
      return response.json();
    },
    onSuccess: (data: RecipeResult[]) => {
      setRecipes(data);
      setError(null);
    },
    onError: (error: any) => {
      console.error("Recipe search failed:", error);
      setError("Failed to find recipes. Please try again or adjust your ingredients.");
    },
  });

  useEffect(() => {
    searchRecipesMutation.mutate();
  }, []);

  const handleRetry = () => {
    setError(null);
    searchRecipesMutation.mutate();
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy": return "bg-green-100 text-green-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "hard": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const handleRecipeClick = (recipe: RecipeResult) => {
    // Convert RecipeResult to Recipe format for existing detail view
    const numericId = recipe.id ? (typeof recipe.id === 'string' ? parseInt(recipe.id.replace(/\D/g, '')) || Date.now() : recipe.id) : Date.now();
    const formattedRecipe = {
      id: numericId,
      title: recipe.title,
      description: recipe.description,
      ingredients: [
        ...recipe.usedIngredients.map(ing => `${ing.amount} ${ing.unit} ${ing.name}`),
        ...recipe.missedIngredients.map(ing => `${ing.amount} ${ing.unit} ${ing.name}`)
      ],
      instructions: recipe.instructions && recipe.instructions.length > 0 
        ? recipe.instructions 
        : [`Visit ${recipe.sourceUrl} for complete cooking instructions.`],
      prepTime: recipe.readyInMinutes,
      servings: recipe.servings,
      imageUrl: recipe.image,
      rating: "4.5",
      source: "Recipe Search",
      sourceUrl: recipe.sourceUrl,
      tags: recipe.tags,
      difficulty: recipe.difficulty,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    onSelectRecipe(formattedRecipe);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Enhanced Header */}
      <div className="bg-white shadow-lg sticky top-0 z-10 border-b border-gray-200">
        <div className="flex items-center justify-between p-6">
          <button 
            onClick={onBack} 
            className="p-3 rounded-full hover:bg-gray-100 transition-all duration-200 hover:scale-105"
          >
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Recipe Results</h1>
            <p className="text-sm text-gray-500 mt-1">Personalized for your ingredients</p>
          </div>
          <button 
            onClick={handleRetry}
            disabled={searchRecipesMutation.isPending}
            className="p-3 rounded-full hover:bg-cravii-red/10 transition-all duration-200 disabled:opacity-50 hover:scale-105"
          >
            <RefreshCw className={`w-6 h-6 text-cravii-red ${searchRecipesMutation.isPending ? 'animate-spin' : ''}`} />
          </button>
        </div>
        
        {/* Enhanced Ingredients Summary */}
        <div className="px-6 pb-6 bg-white/80 backdrop-blur-sm">
          <p className="text-lg font-semibold text-gray-800 mb-4">
            Based on {selectedIngredients.length} selected ingredients:
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedIngredients.slice(0, 8).map((ingredient, index) => (
              <Badge 
                key={ingredient.id || `ingredient-${index}`} 
                variant="secondary" 
                className="bg-gradient-to-r from-cravii-red/20 to-cravii-red/10 text-cravii-red border border-cravii-red/20 px-3 py-1.5 text-sm font-medium rounded-full hover:from-cravii-red/30 hover:to-cravii-red/20 transition-all duration-200"
              >
                {ingredient.name}
              </Badge>
            ))}
            {selectedIngredients.length > 8 && (
              <Badge 
                variant="secondary" 
                className="bg-gradient-to-r from-gray-100 to-gray-50 text-gray-600 border border-gray-200 px-3 py-1.5 text-sm font-medium rounded-full"
              >
                +{selectedIngredients.length - 8} more
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Loading State */}
      {searchRecipesMutation.isPending && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-cravii-red border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Searching for perfect recipes...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="mx-4 mt-4">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <div className="flex-1">
                  <p className="text-red-800 font-medium">Recipe Search Failed</p>
                  <p className="text-red-600 text-sm mt-1">{error}</p>
                </div>
                <Button
                  onClick={handleRetry}
                  variant="outline"
                  size="sm"
                  className="border-red-300 text-red-700 hover:bg-red-100"
                >
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* No Results */}
      {!searchRecipesMutation.isPending && !error && recipes.length === 0 && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Recipes Found</h3>
            <p className="text-gray-600 mb-4">
              We couldn't find recipes matching your selected ingredients.
            </p>
            <Button onClick={onBack} variant="outline">
              Try Different Ingredients
            </Button>
          </div>
        </div>
      )}

      {/* Enhanced Recipe Results */}
      {recipes.length > 0 && (
        <div className="max-w-4xl mx-auto p-6 space-y-6 pb-20">
          {recipes.map((recipe, index) => (
            <Card 
              key={`recipe-${recipe.id}-${index}-${recipe.title?.slice(0,10) || 'unknown'}`} 
              className="overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-[1.02] border-0 shadow-lg bg-white/95 backdrop-blur-sm"
              onClick={() => handleRecipeClick(recipe)}
            >
              <div className="flex">
                <div className="w-32 h-32 flex-shrink-0 relative">
                  <img
                    src={recipe.image}
                    alt={recipe.title}
                    className="w-full h-full object-cover rounded-l-lg"
                  />
                  <div className="absolute top-2 left-2">
                    <Badge className={`${getDifficultyColor(recipe.difficulty)} text-xs font-bold`}>
                      {recipe.difficulty}
                    </Badge>
                  </div>
                </div>
                <div className="flex-1 p-6">
                  <CardHeader className="p-0 mb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-xl font-bold leading-tight text-gray-900 pr-4">
                        {recipe.title}
                      </CardTitle>
                      <ExternalLink className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <p className="text-gray-600 mb-4 line-clamp-2 leading-relaxed">
                      {recipe.description}
                    </p>
                    
                    {/* Enhanced Recipe Meta */}
                    <div className="flex items-center gap-6 text-sm text-gray-500 mb-4">
                      <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full">
                        <Clock className="w-4 h-4 text-cravii-red" />
                        <span className="font-medium">{recipe.readyInMinutes}min</span>
                      </div>
                      <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full">
                        <Users className="w-4 h-4 text-cravii-red" />
                        <span className="font-medium">{recipe.servings} servings</span>
                      </div>
                    </div>

                    {/* Ingredients Status */}
                    <div className="space-y-1">
                      {recipe.usedIngredients.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-green-700">Used:</span>
                          <div className="flex flex-wrap gap-1">
                            {recipe.usedIngredients.slice(0, 3).map((ing, idx) => (
                              <Badge key={`used-${index}-${idx}-${ing.name}`} variant="secondary" className="text-xs bg-green-100 text-green-800">
                                {ing.name}
                              </Badge>
                            ))}
                            {recipe.usedIngredients.length > 3 && (
                              <span className="text-xs text-gray-500">
                                +{recipe.usedIngredients.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {recipe.missedIngredients.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-orange-700">Need:</span>
                          <div className="flex flex-wrap gap-1">
                            {recipe.missedIngredients.slice(0, 2).map((ing, idx) => (
                              <Badge key={`missed-${index}-${idx}-${ing.name}`} variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                                {ing.name}
                              </Badge>
                            ))}
                            {recipe.missedIngredients.length > 2 && (
                              <span className="text-xs text-gray-500">
                                +{recipe.missedIngredients.length - 2} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </div>
                <div className="p-4 flex items-center">
                  <ExternalLink className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}