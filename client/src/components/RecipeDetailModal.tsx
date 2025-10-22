import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, ChefHat, Users, CheckCircle2, X } from 'lucide-react';
import type { RecipeMatch } from '@/utils/recipeAlgorithm';

interface RecipeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipeMatch: RecipeMatch | null;
}

export function RecipeDetailModal({ isOpen, onClose, recipeMatch }: RecipeDetailModalProps) {
  if (!recipeMatch) return null;

  const { recipe, completionPercentage, availableIngredients, missingIngredients } = recipeMatch;
  const completionPercent = Math.round(completionPercentage * 100);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{recipe.name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Recipe Image */}
          {recipe.imageUrl && (
            <div className="w-full h-64 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
              <img 
                src={recipe.imageUrl} 
                alt={recipe.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Recipe Info */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-gray-600 dark:text-gray-400">
                <Clock className="w-4 h-4" />
                <span className="text-sm">Prep Time</span>
              </div>
              <p className="font-medium">{recipe.prepTime}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-gray-600 dark:text-gray-400">
                <ChefHat className="w-4 h-4" />
                <span className="text-sm">Cook Time</span>
              </div>
              <p className="font-medium">{recipe.cookTime}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-gray-600 dark:text-gray-400">
                <Users className="w-4 h-4" />
                <span className="text-sm">Difficulty</span>
              </div>
              <p className="font-medium">{recipe.difficulty}</p>
            </div>
          </div>

          {/* Completion Status */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold">Recipe Completion</h3>
              <span className={`font-bold ${
                completionPercent === 100 
                  ? 'text-green-600 dark:text-green-400' 
                  : completionPercent >= 80 
                    ? 'text-orange-600 dark:text-orange-400'
                    : 'text-gray-600 dark:text-gray-400'
              }`}>
                {completionPercent}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all ${
                  completionPercent === 100 
                    ? 'bg-green-500' 
                    : completionPercent >= 80 
                      ? 'bg-orange-500'
                      : 'bg-gray-500'
                }`}
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              You have {availableIngredients.length} of {recipe.ingredients.length} ingredients
            </p>
          </div>

          {/* Ingredients */}
          <div>
            <h3 className="font-semibold mb-3">Ingredients</h3>
            <div className="grid gap-2">
              {recipe.ingredients.map((ingredient) => {
                const isAvailable = availableIngredients.some(available => 
                  available.toLowerCase() === ingredient.toLowerCase()
                );
                return (
                  <div 
                    key={ingredient}
                    className={`flex items-center gap-3 p-2 rounded-lg ${
                      isAvailable 
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' 
                        : 'bg-gray-50 dark:bg-gray-800'
                    }`}
                  >
                    {isAvailable ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <X className="w-5 h-5 text-gray-400" />
                    )}
                    <span className={`capitalize ${!isAvailable ? 'text-gray-600 dark:text-gray-400' : ''}`}>
                      {ingredient}
                    </span>
                    {isAvailable && (
                      <Badge variant="secondary" className="ml-auto text-xs">
                        Available
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Missing Ingredients */}
          {missingIngredients.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3 text-orange-700 dark:text-orange-400">
                Missing Ingredients ({missingIngredients.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {missingIngredients.map((ingredient) => (
                  <Badge key={ingredient} variant="outline" className="capitalize">
                    {ingredient}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          <div>
            <h3 className="font-semibold mb-3">Instructions</h3>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                {recipe.instructions}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            {completionPercent === 100 ? (
              <Button className="flex-1 bg-green-600 hover:bg-green-700">
                Start Cooking!
              </Button>
            ) : (
              <Button variant="outline" className="flex-1">
                Add to Shopping List
              </Button>
            )}
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}