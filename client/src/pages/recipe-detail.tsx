import { ArrowLeft, Bookmark, Share, Clock, Users, Star, Leaf, Info, ChefHat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface RecipeSearchResult {
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

interface RecipeDetailProps {
  recipe: any; // Accept any recipe format
  onBack: () => void;
}

export default function RecipeDetail({ recipe, onBack }: RecipeDetailProps) {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Handle both old Recipe format and new RecipeSearchResult format
  const isOldFormat = recipe.ingredients && Array.isArray(recipe.ingredients);
  const allIngredients = isOldFormat ? [] : [
    ...(recipe.usedIngredients || []), 
    ...(recipe.missedIngredients || [])
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="relative">
        <img 
          src={recipe.image || recipe.imageUrl} 
          alt={recipe.title}
          className="w-full h-64 object-cover"
        />
        <div className="absolute top-4 left-4">
          <button 
            onClick={onBack}
            className="w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
        </div>
        <div className="absolute top-4 right-4 flex space-x-2">
          <button className="w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg">
            <Bookmark className="w-5 h-5 text-gray-700" />
          </button>
          <button className="w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg">
            <Share className="w-5 h-5 text-gray-700" />
          </button>
        </div>
        <div className="absolute bottom-4 left-4">
          <Badge className={`${getDifficultyColor(recipe.difficulty)} text-sm font-bold`}>
            <ChefHat className="w-4 h-4 mr-1" />
            {recipe.difficulty}
          </Badge>
        </div>
      </div>
      
      <div className="bg-white p-6 -mt-8 rounded-t-3xl relative z-10">
        <h1 className="text-2xl font-bold mb-2">{recipe.title}</h1>
        <p className="text-gray-600 mb-4">{recipe.description}</p>
        
        {/* Recipe Tags */}
        {recipe.tags && (
          <div className="flex flex-wrap gap-2 mb-4">
            {recipe.tags.map((tag: string, index: number) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
        
        <div className="flex items-center space-x-6 mb-6">
          <div className="flex items-center text-gray-600">
            <Clock className="w-5 h-5 mr-2" />
            <span>{recipe.readyInMinutes || recipe.prepTime} min</span>
          </div>
          <div className="flex items-center text-gray-600">
            <Users className="w-5 h-5 mr-2" />
            <span>{recipe.servings} servings</span>
          </div>
        </div>
        
        <div className="mb-6">
          <h3 className="font-bold text-lg mb-3 flex items-center">
            <ChefHat className="w-5 h-5 mr-2 text-cravii-red" />
            Ingredients
          </h3>
          <div className="space-y-3">
            {isOldFormat ? (
              // Old format: ingredients is an array of strings
              recipe.ingredients.map((ingredient: string, index: number) => (
                <div key={index} className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <div className="w-2 h-2 bg-cravii-red rounded-full mr-3" />
                  <span className="font-medium">{ingredient}</span>
                </div>
              ))
            ) : (
              // New format: usedIngredients and missedIngredients arrays
              allIngredients.map((ingredient: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-cravii-red rounded-full mr-3" />
                    <span className="font-medium">{ingredient.name}</span>
                  </div>
                  <span className="text-sm text-gray-600">
                    {ingredient.amount} {ingredient.unit}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
        
        {((recipe.instructions && recipe.instructions.length > 0) || isOldFormat) && (
          <div className="mb-6">
            <h3 className="font-bold text-lg mb-3 flex items-center">
              <Info className="w-5 h-5 mr-2 text-cravii-red" />
              Instructions
            </h3>
            <div className="space-y-4">
              {(recipe.instructions || []).map((instruction: string, index: number) => (
                <div key={index} className="flex">
                  <div className="w-8 h-8 bg-cravii-red text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 flex-shrink-0">
                    {index + 1}
                  </div>
                  <p className="text-gray-700 leading-relaxed">{instruction}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="bg-gray-50 p-4 rounded-xl">
          <p className="text-sm text-gray-600">
            <Info className="w-4 h-4 mr-2 inline" />
            Recipe sourced from TheMealDB
            {recipe.sourceUrl && (
              <>
                . Original recipe available at{" "}
                <a 
                  href={recipe.sourceUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-cravii-red hover:underline"
                >
                  {recipe.sourceUrl.replace(/^https?:\/\//, '')}
                </a>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
