import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, ChefHat, ExternalLink, User } from 'lucide-react';

interface RealRecipe {
  id: string;
  title: string;
  ingredients: string[];
  instructions: string;
  difficulty: string;
  prepTime: string;
  cookTime: string;
  servings: number;
  imageUrl: string;
  source: string;
  sourceUrl: string;
  rating: string;
}

interface RealRecipeResultsProps {
  selectedIngredients: string[];
  onSelectRecipe: (recipe: RealRecipe) => void;
  onContinueSwiping: () => void;
}

export function RealRecipeResults({ selectedIngredients, onSelectRecipe, onContinueSwiping }: RealRecipeResultsProps) {
  const [recipes, setRecipes] = useState<RealRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRealRecipes = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log("Fetching real recipes for ingredients:", selectedIngredients);
        
        // Call the real recipe API
        const response = await fetch('/api/recipe-suggestions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ingredients: selectedIngredients.map(name => ({ name })),
            preferences: { course: 'dinner' }
          })
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const realRecipes = await response.json();
        console.log("Received real recipes:", realRecipes);
        
        setRecipes(realRecipes);
      } catch (error) {
        console.error('Error fetching real recipes:', error);
        setError('Failed to load authentic recipes. Please try again.');
        setRecipes([]);
      } finally {
        setLoading(false);
      }
    };
    
    if (selectedIngredients.length > 0) {
      fetchRealRecipes();
    }
  }, [selectedIngredients]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Finding Authentic Recipes...
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Searching for real recipes with your ingredients
          </p>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-300 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">
            Error Loading Recipes
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error}
          </p>
          <Button onClick={onContinueSwiping} variant="outline">
            Continue Swiping
          </Button>
        </div>
      </div>
    );
  }

  if (recipes.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            No Recipes Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Try selecting more ingredients to find authentic recipes
          </p>
          <Button onClick={onContinueSwiping} variant="outline">
            Continue Swiping
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Authentic Recipes
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Real recipes from {recipes[0]?.source || 'cooking websites'}
        </p>
      </div>

      <div className="grid gap-4">
        {recipes.map((recipe) => (
          <Card 
            key={recipe.id}
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => onSelectRecipe(recipe)}
          >
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{recipe.title}</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                    <Clock className="w-4 h-4" />
                    {recipe.prepTime}
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {recipe.difficulty}
                  </Badge>
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  {recipe.servings} servings
                </div>
                <div className="flex items-center gap-1">
                  <ExternalLink className="w-4 h-4" />
                  {recipe.source}
                </div>
                <div className="flex items-center gap-1">
                  ⭐ {recipe.rating}
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-sm mb-2">Key Ingredients:</h4>
                  <div className="flex flex-wrap gap-1">
                    {recipe.ingredients.slice(0, 6).map((ingredient, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {ingredient.length > 20 ? ingredient.substring(0, 20) + "..." : ingredient}
                      </Badge>
                    ))}
                    {recipe.ingredients.length > 6 && (
                      <Badge variant="outline" className="text-xs">
                        +{recipe.ingredients.length - 6} more
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {recipe.instructions.substring(0, 150)}...
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center pt-4">
        <Button 
          onClick={onContinueSwiping}
          variant="outline"
          className="w-full"
        >
          Find More Ingredients for Different Recipes
        </Button>
      </div>
    </div>
  );
}