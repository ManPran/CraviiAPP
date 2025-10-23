import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShoppingCart, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Ingredient } from "@shared/schema";
import logoImage from "@assets/Copy of Cravii MVP Pitch_1761192283271.png";

interface IngredientSwipeProps {
  preferences: {
    course: string;
    taste: string;
    prepTime: number;
    appliances: string[];
  };
  dietaryRestrictions: string[];
  onBack: () => void;
  onComplete: (selectedIngredients: any[]) => void;
}

export default function IngredientSwipeSimple({ preferences, dietaryRestrictions, onBack, onComplete }: IngredientSwipeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIngredients, setSelectedIngredients] = useState<Ingredient[]>([]);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'up' | 'down' | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const { data: ingredients = [], isLoading } = useQuery<Ingredient[]>({
    queryKey: ['/api/ingredients']
  });

  const currentIngredient = ingredients[currentIndex];

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartY(e.touches[0].clientY);
    setCurrentY(e.touches[0].clientY);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const newY = e.touches[0].clientY;
    setCurrentY(newY);
    
    const deltaY = newY - startY;
    if (Math.abs(deltaY) > 20) {
      setSwipeDirection(deltaY < 0 ? 'up' : 'down');
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    
    const deltaY = currentY - startY;
    
    if (Math.abs(deltaY) > 100) {
      if (deltaY < 0) {
        // Swiped up - select ingredient
        handleSelect();
      } else {
        // Swiped down - skip ingredient
        handleSkip();
      }
    }
    
    setIsDragging(false);
    setSwipeDirection(null);
    setStartY(0);
    setCurrentY(0);
  };

  const handleSelect = () => {
    if (currentIngredient) {
      setSelectedIngredients(prev => [...prev, currentIngredient]);
    }
    nextIngredient();
  };

  const handleSkip = () => {
    nextIngredient();
  };

  const nextIngredient = () => {
    if (currentIndex < ingredients.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleStartOver = () => {
    setCurrentIndex(0);
    setSelectedIngredients([]);
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-cravii-red border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading ingredients...</p>
        </div>
      </div>
    );
  }

  // Mouse event handlers for desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    setStartY(e.clientY);
    setCurrentY(e.clientY);
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const newY = e.clientY;
    setCurrentY(newY);
    
    const deltaY = newY - startY;
    if (Math.abs(deltaY) > 20) {
      setSwipeDirection(deltaY < 0 ? 'up' : 'down');
    }
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    
    const deltaY = currentY - startY;
    
    if (Math.abs(deltaY) > 100) {
      if (deltaY < 0) {
        handleSelect();
      } else {
        handleSkip();
      }
    }
    
    setIsDragging(false);
    setSwipeDirection(null);
    setStartY(0);
    setCurrentY(0);
  };

  if (!currentIngredient) {
    return (
      <div className="fixed inset-0 bg-gray-50 flex items-center justify-center">
        <div className="text-center px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">No more ingredients!</h2>
          <Button 
            onClick={handleStartOver}
            className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold"
            data-testid="button-start-over"
          >
            Start Over
          </Button>
        </div>
      </div>
    );
  }

  const dragOffset = isDragging ? currentY - startY : 0;
  const opacity = 1 - Math.min(Math.abs(dragOffset) / 300, 0.5);

  return (
    <div className="fixed inset-0 bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <button 
          onClick={onBack} 
          className="p-2 hover:bg-gray-100 rounded-full"
          data-testid="button-back"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        
        <img 
          src={logoImage} 
          alt="Cravii Logo" 
          className="h-12 w-auto object-contain"
          style={{ clipPath: 'inset(0 0 25% 0)' }}
        />
        
        <button 
          className="p-2 bg-cravii-red rounded-full relative"
          data-testid="button-cart"
        >
          <ShoppingCart className="w-6 h-6 text-white" />
          {selectedIngredients.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-white text-cravii-red text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {selectedIngredients.length}
            </span>
          )}
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        {/* Swipe Up Instruction */}
        <div className="text-center mb-8">
          <p className="text-gray-400 font-medium text-sm uppercase tracking-wider mb-2">
            SWIPE UP TO PLATE
          </p>
          <div className="flex justify-center mb-2">
            <div className="w-12 h-12 rounded-full bg-cravii-red/10 flex items-center justify-center">
              <div className="text-2xl">🍽️</div>
            </div>
          </div>
          <div className="inline-block bg-cravii-red text-white text-xs px-3 py-1 rounded-full">
            ALREADY YOUR OWN
          </div>
        </div>

        {/* Ingredient Card */}
        <div 
          ref={cardRef}
          className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden relative cursor-grab active:cursor-grabbing select-none"
          style={{
            transform: `translateY(${dragOffset}px) scale(${1 - Math.abs(dragOffset) / 1000})`,
            opacity: opacity,
            transition: isDragging ? 'none' : 'transform 0.3s ease, opacity 0.3s ease'
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          data-testid="card-ingredient"
        >
          {/* Swipe Direction Indicator */}
          {swipeDirection === 'up' && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-6 py-2 rounded-full font-bold z-10 flex items-center gap-2">
              <ArrowUp className="w-5 h-5" />
              ADD TO PLATE
            </div>
          )}
          {swipeDirection === 'down' && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-2 rounded-full font-bold z-10 flex items-center gap-2">
              <ArrowDown className="w-5 h-5" />
              SKIP
            </div>
          )}
          
          <div className="aspect-square bg-gray-100 flex items-center justify-center overflow-hidden">
            <img
              src={currentIngredient.imageUrl}
              alt={currentIngredient.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23f3f4f6" width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-family="sans-serif" font-size="14"%3ENo Image%3C/text%3E%3C/svg%3E';
              }}
            />
          </div>
          <div className="p-6 text-center">
            <h3 className="text-xl font-bold text-gray-900" data-testid="text-ingredient-name">
              {currentIngredient.name}
            </h3>
          </div>
        </div>

        {/* Swipe Down Instruction */}
        <div className="text-center mt-8">
          <div className="flex justify-center mb-2">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
              <Trash2 className="w-6 h-6 text-gray-400" />
            </div>
          </div>
          <p className="text-gray-400 font-medium text-sm uppercase tracking-wider">
            SWIPE DOWN TO TRASH
          </p>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="px-6 pb-6">
        <div className="flex items-center justify-center gap-1 mb-2">
          <div className="text-xs text-gray-500">
            {currentIndex + 1} / {ingredients.length}
          </div>
        </div>
        <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-cravii-red transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / ingredients.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
