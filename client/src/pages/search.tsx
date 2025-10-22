import { useState } from "react";
import { Search, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SearchPageProps {
  onBack: () => void;
}

export default function SearchPage({ onBack }: SearchPageProps) {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white p-6 border-b">
        <div className="flex items-center justify-between mb-6">
          <button onClick={onBack} className="text-gray-600">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="font-semibold text-gray-800">Search Recipes</h2>
          <div className="w-6" />
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
          <Input 
            placeholder="Search for recipes, ingredients, or cuisines..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border-gray-200 focus:ring-cravii-red focus:border-cravii-red"
          />
        </div>
      </div>
      
      <div className="p-6">
        <div className="text-center py-20">
          <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Search Coming Soon</h3>
          <p className="text-gray-600 mb-6">
            We're working on an amazing search feature that will help you find recipes by ingredients, cuisine type, or dietary preferences.
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