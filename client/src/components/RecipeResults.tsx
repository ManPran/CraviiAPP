import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, ChefHat, CheckCircle2, AlertCircle } from 'lucide-react';
import type { RecipeMatch } from '@/utils/recipeAlgorithm';

interface RecipeResultsProps {
  recipes: RecipeMatch[];
  onSelectRecipe: (recipe: RecipeMatch) => void;
  onContinueSwiping: () => void;
}

export function RecipeResults({ recipes, onSelectRecipe, onContinueSwiping }: RecipeResultsProps) {
  const completeRecipes = recipes.filter(r => r.completionPercentage >= 1.0);
  const nearCompleteRecipes = recipes.filter(r => r.completionPercentage >= 0.8 && r.completionPercentage < 1.0);
  const partialRecipes = recipes.filter(r => r.completionPercentage < 0.8);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Recipe Suggestions
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Based on your selected ingredients
        </p>
      </div>

      {completeRecipes.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-green-700 dark:text-green-400 mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            Ready to Cook ({completeRecipes.length})
          </h3>
          <div className="grid gap-4">
            {completeRecipes.map((match) => (
              <RecipeCard key={match.recipe.id} match={match} onSelect={onSelectRecipe} />
            ))}
          </div>
        </div>
      )}

      {nearCompleteRecipes.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-orange-700 dark:text-orange-400 mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Almost Ready ({nearCompleteRecipes.length})
          </h3>
          <div className="grid gap-4">
            {nearCompleteRecipes.map((match) => (
              <RecipeCard key={match.recipe.id} match={match} onSelect={onSelectRecipe} />
            ))}
          </div>
        </div>
      )}

      {partialRecipes.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-400 mb-3">
            Need More Ingredients ({partialRecipes.slice(0, 5).length})
          </h3>
          <div className="grid gap-4">
            {partialRecipes.slice(0, 5).map((match) => (
              <RecipeCard key={match.recipe.id} match={match} onSelect={onSelectRecipe} />
            ))}
          </div>
        </div>
      )}

      <div className="text-center pt-4">
        <Button 
          onClick={onContinueSwiping}
          variant="outline"
          className="w-full"
        >
          Continue Swiping for More Ingredients
        </Button>
      </div>
    </div>
  );
}

interface RecipeCardProps {
  match: RecipeMatch;
  onSelect: (match: RecipeMatch) => void;
}

function RecipeCard({ match, onSelect }: RecipeCardProps) {
  const { recipe, completionPercentage, missingIngredients } = match;
  const completionPercent = Math.round(completionPercentage * 100);
  
  const getCompletionColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 80) return 'bg-orange-500';
    return 'bg-gray-500';
  };

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow"
      onClick={() => onSelect(match)}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{recipe.name}</CardTitle>
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
        
        {/* Completion Progress Bar */}
        <div className="mt-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium">
              {completionPercent}% Complete
            </span>
            <span className="text-xs text-gray-500">
              {recipe.ingredients.length - missingIngredients.length}/{recipe.ingredients.length} ingredients
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all ${getCompletionColor(completionPercent)}`}
              style={{ width: `${completionPercent}%` }}
            />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {missingIngredients.length > 0 && (
          <div className="mb-3">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Missing ingredients:
            </p>
            <div className="flex flex-wrap gap-1">
              {missingIngredients.slice(0, 5).map((ingredient) => (
                <Badge key={ingredient} variant="outline" className="text-xs">
                  {ingredient}
                </Badge>
              ))}
              {missingIngredients.length > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{missingIngredients.length - 5} more
                </Badge>
              )}
            </div>
          </div>
        )}
        
        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <ChefHat className="w-4 h-4" />
            Cook Time: {recipe.cookTime}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}