import { useState } from "react";
import { User, ArrowLeft, Settings, Heart, Clock, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface ProfilePageProps {
  onBack: () => void;
}

export default function ProfilePage({ onBack }: ProfilePageProps) {
  const [user] = useState({
    name: "Cooking Enthusiast",
    email: "user@example.com",
    joinDate: "June 2025",
    recipesGenerated: 12,
    favoriteRecipes: 8,
    totalCookingTime: "4 hours"
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-gradient-to-r from-cravii-red to-cravii-red-dark text-white p-6">
        <div className="flex items-center justify-between mb-6">
          <button onClick={onBack} className="text-white">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="font-semibold">Profile</h2>
          <button className="text-white">
            <Settings className="w-6 h-6" />
          </button>
        </div>
        
        <div className="text-center">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-xl font-bold mb-1">{user.name}</h3>
          <p className="text-white/80">{user.email}</p>
          <p className="text-white/60 text-sm">Member since {user.joinDate}</p>
        </div>
      </div>
      
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4 text-center">
            <div className="flex flex-col items-center">
              <Clock className="w-8 h-8 text-cravii-red mb-2" />
              <div className="text-2xl font-bold text-gray-800">{user.recipesGenerated}</div>
              <div className="text-sm text-gray-600">Recipes Generated</div>
            </div>
          </Card>
          
          <Card className="p-4 text-center">
            <div className="flex flex-col items-center">
              <Heart className="w-8 h-8 text-cravii-red mb-2" />
              <div className="text-2xl font-bold text-gray-800">{user.favoriteRecipes}</div>
              <div className="text-sm text-gray-600">Favorites</div>
            </div>
          </Card>
          
          <Card className="p-4 text-center">
            <div className="flex flex-col items-center">
              <Star className="w-8 h-8 text-cravii-red mb-2" />
              <div className="text-2xl font-bold text-gray-800">{user.totalCookingTime}</div>
              <div className="text-sm text-gray-600">Cooking Time</div>
            </div>
          </Card>
        </div>
        
        <Card className="p-6">
          <h4 className="font-semibold text-gray-800 mb-4">Quick Actions</h4>
          <div className="space-y-3">
            <Button variant="outline" className="w-full justify-start">
              <Heart className="w-5 h-5 mr-3 text-cravii-red" />
              Favorite Recipes
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Clock className="w-5 h-5 mr-3 text-cravii-red" />
              Cooking History
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Settings className="w-5 h-5 mr-3 text-cravii-red" />
              Dietary Preferences
            </Button>
          </div>
        </Card>
        
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">
            Profile features are being enhanced! Soon you'll be able to save favorite recipes, track your cooking journey, and customize your experience.
          </p>
          <Button 
            onClick={onBack}
            className="bg-cravii-red hover:bg-cravii-red-dark text-white"
          >
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
}