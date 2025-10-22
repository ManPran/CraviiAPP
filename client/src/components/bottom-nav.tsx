import { Home, BookOpen, User } from "lucide-react";
import { useLocation } from "wouter";

interface BottomNavProps {
  onNavigate: (screen: string) => void;
  currentScreen?: string;
}

export function BottomNav({ onNavigate, currentScreen }: BottomNavProps) {
  const [location] = useLocation();

  const isActive = (screen: string) => {
    if (screen === 'home') {
      return currentScreen === 'main';
    }
    if (screen === 'recipes') {
      return currentScreen === 'recipe-suggestions' || currentScreen === 'recipe-detail';
    }

    if (screen === 'profile') {
      return currentScreen === 'profile';
    }
    return false;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 z-40">
      <div className="flex justify-around">
        <button 
          onClick={() => onNavigate('home')}
          className={`flex flex-col items-center space-y-1 ${
            isActive('home') ? 'text-cravii-red' : 'text-gray-400'
          }`}
        >
          <Home className="w-6 h-6" />
          <span className="text-xs">Home</span>
        </button>
        

        <button 
          onClick={() => onNavigate('recipes')}
          className={`flex flex-col items-center space-y-1 ${
            isActive('recipes') ? 'text-cravii-red' : 'text-gray-400'
          }`}
        >
          <BookOpen className="w-6 h-6" />
          <span className="text-xs">Recipes</span>
        </button>
        
        <button 
          onClick={() => onNavigate('profile')}
          className={`flex flex-col items-center space-y-1 ${
            isActive('profile') ? 'text-cravii-red' : 'text-gray-400'
          }`}
        >
          <User className="w-6 h-6" />
          <span className="text-xs">Profile</span>
        </button>
      </div>
    </div>
  );
}
