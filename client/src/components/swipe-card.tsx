import type { IngredientLegacy } from "@shared/schema";

interface SwipeCardProps {
  ingredient?: IngredientLegacy;
  className?: string;
  isPlaceholder?: boolean;
}

export function SwipeCard({ ingredient, className = "", isPlaceholder = false }: SwipeCardProps) {
  if (isPlaceholder || !ingredient) {
    return (
      <div className={`swipe-card absolute inset-0 bg-white rounded-2xl shadow-xl overflow-hidden ${className}`}>
        <div className="w-full h-64 bg-gray-200 animate-pulse" />
        <div className="p-6">
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-2 animate-pulse" />
          <div className="h-4 bg-gray-200 rounded w-full mb-2 animate-pulse" />
          <div className="h-4 bg-gray-200 rounded w-5/6 mb-4 animate-pulse" />
          <div className="flex flex-wrap gap-2">
            <div className="h-6 w-16 bg-gray-200 rounded-full animate-pulse" />
            <div className="h-6 w-20 bg-gray-200 rounded-full animate-pulse" />
            <div className="h-6 w-24 bg-gray-200 rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`swipe-card absolute inset-0 bg-white rounded-2xl shadow-xl overflow-hidden ${className}`}>
      <img 
        src={ingredient.imageUrl} 
        alt={ingredient.description} 
        className="w-full h-64 object-cover"
      />
      <div className="p-6">
        <h3 className="text-xl font-bold mb-2">{ingredient.name}</h3>
        <p className="text-gray-600 mb-4">{ingredient.description}</p>
        <div className="flex flex-wrap gap-2">
          {ingredient.tags.map(tag => (
            <span 
              key={tag} 
              className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
