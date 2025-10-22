import { Clock, Users, Star } from "lucide-react";
import type { Recipe } from "@shared/schema";

interface RecipeSuggestionsProps {
  recipes: Recipe[];
  onSelectRecipe: (recipe: Recipe) => void;
}

export default function RecipeSuggestions({ recipes, onSelectRecipe }: RecipeSuggestionsProps) {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-gradient-to-r from-cravii-red to-cravii-red-dark text-white p-6 rounded-b-3xl">
        <h1 className="text-2xl font-bold mb-2">Your Recipe Suggestions</h1>
        <p className="text-white/80">AI-powered recommendations</p>
      </div>
      
      <div className="p-6 space-y-6">
        {recipes.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">No recipes found</h3>
            <p className="text-gray-600">Try adjusting your preferences or ingredients.</p>
          </div>
        ) : (
          recipes.map((recipe) => (
            <div 
              key={recipe.id}
              onClick={() => onSelectRecipe(recipe)}
              className="bg-white rounded-2xl shadow-lg overflow-hidden cursor-pointer hover:shadow-xl transition-shadow"
            >
              <img 
                src={recipe.imageUrl} 
                alt={recipe.title}
                className="w-full h-48 object-cover"
              />
              <div className="p-4">
                <h3 className="font-bold text-lg mb-2">{recipe.title}</h3>
                <p className="text-gray-600 text-sm mb-3">{recipe.description}</p>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    {recipe.prepTime} min
                  </div>
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-1" />
                    {recipe.servings}
                  </div>
                  <div className="flex items-center">
                    <Star className="w-4 h-4 mr-1 text-yellow-500" />
                    {recipe.rating}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
