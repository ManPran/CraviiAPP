import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Coffee, Utensils, Moon, Flame, Microwave, Wind, Search, Bell, User, Sparkles } from "lucide-react";
import logoImage from "@assets/Copy of Cravii MVP Pitch_1761192283271.png";

interface MainScreenProps {
  onGenerateRecipes: (preferences: any) => void;
}

export default function MainScreen({ onGenerateRecipes }: MainScreenProps) {
  const [course, setCourse] = useState("");
  const [taste, setTaste] = useState("");
  const [prepTime, setPrepTime] = useState(5);
  const [appliances, setAppliances] = useState<string[]>([]);

  const toggleAppliance = (appliance: string) => {
    setAppliances(prev => 
      prev.includes(appliance) 
        ? prev.filter(a => a !== appliance)
        : [...prev, appliance]
    );
  };

  const craveNow = () => {
    // Auto-select random options
    const courses = ['breakfast', 'lunch', 'dinner'];
    const tastes = ['savory', 'sweet'];
    
    setCourse(courses[Math.floor(Math.random() * courses.length)]);
    setTaste(tastes[Math.floor(Math.random() * tastes.length)]);
    setPrepTime(Math.floor(Math.random() * 26) + 5); // 5-30 minutes
    
    setTimeout(() => {
      generateRecipes();
    }, 500);
  };

  const generateRecipes = () => {
    onGenerateRecipes({
      course,
      taste,
      prepTime,
      appliances
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <img 
              src={logoImage} 
              alt="Cravii Logo" 
              className="h-16 w-auto object-contain object-left"
              style={{ clipPath: 'inset(0 0 25% 0)' }}
            />
          </div>
          <div className="flex space-x-4">
            <Search className="w-6 h-6 text-gray-400" />
            <Bell className="w-6 h-6 text-gray-400" />
            <User className="w-6 h-6 text-cravii-red" />
          </div>
        </div>
        
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">What are you craving?</h1>
          <p className="text-gray-600">Set your preferences and we'll find the perfect recipe</p>
        </div>
        
        <Button 
          onClick={craveNow}
          className="w-full bg-cravii-red hover:bg-cravii-red-dark text-white py-4 rounded-xl font-semibold mb-8 flex items-center justify-center"
        >
          <Sparkles className="w-5 h-5 mr-2" />
          CRAVE NOW
          <span className="text-sm font-normal ml-2 opacity-80">Auto-select everything randomly</span>
        </Button>
        
        {/* Course Selection */}
        <div className="mb-6">
          <h3 className="font-semibold text-gray-800 mb-3">Course</h3>
          <div className="grid grid-cols-3 gap-3">
            <button 
              onClick={() => setCourse('breakfast')}
              className={`py-3 px-4 border-2 rounded-xl text-center transition-colors ${
                course === 'breakfast' 
                  ? 'border-cravii-red bg-cravii-red text-white' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Coffee className="w-6 h-6 mx-auto mb-1" />
              <div className="text-sm font-medium">Breakfast</div>
            </button>
            <button 
              onClick={() => setCourse('lunch')}
              className={`py-3 px-4 border-2 rounded-xl text-center transition-colors ${
                course === 'lunch' 
                  ? 'border-cravii-red bg-cravii-red text-white' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Utensils className="w-6 h-6 mx-auto mb-1" />
              <div className="text-sm font-medium">Lunch</div>
            </button>
            <button 
              onClick={() => setCourse('dinner')}
              className={`py-3 px-4 border-2 rounded-xl text-center transition-colors ${
                course === 'dinner' 
                  ? 'border-cravii-red bg-cravii-red text-white' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Moon className="w-6 h-6 mx-auto mb-1" />
              <div className="text-sm font-medium">Dinner</div>
            </button>
          </div>
        </div>
        
        {/* Taste Selection */}
        <div className="mb-6">
          <h3 className="font-semibold text-gray-800 mb-3">Taste</h3>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => setTaste('savory')}
              className={`py-3 px-4 rounded-xl font-medium transition-colors ${
                taste === 'savory' 
                  ? 'bg-cravii-red text-white' 
                  : 'border-2 border-gray-200 hover:border-gray-300'
              }`}
            >
              Savory
            </button>
            <button 
              onClick={() => setTaste('sweet')}
              className={`py-3 px-4 rounded-xl font-medium transition-colors ${
                taste === 'sweet' 
                  ? 'bg-cravii-red text-white' 
                  : 'border-2 border-gray-200 hover:border-gray-300'
              }`}
            >
              Sweet
            </button>
          </div>
        </div>
        
        {/* Prep Time */}
        <div className="mb-6">
          <h3 className="font-semibold text-gray-800 mb-3">Prep Time</h3>
          <div className="px-2">
            <Slider
              value={[prepTime]}
              onValueChange={([value]) => setPrepTime(value)}
              max={30}
              min={5}
              step={1}
              className="w-full slider"
            />
            <div className="flex justify-between text-sm text-gray-500 mt-2">
              <span>5 min</span>
              <span className="font-semibold text-cravii-red">{prepTime} min</span>
              <span>30 min</span>
            </div>
          </div>
        </div>
        
        {/* Available Appliances */}
        <div className="mb-8">
          <h3 className="font-semibold text-gray-800 mb-3">Available Appliances</h3>
          <div className="space-y-3">
            <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
              <Checkbox 
                checked={appliances.includes('stovetop')}
                onCheckedChange={() => toggleAppliance('stovetop')}
                className="data-[state=checked]:bg-cravii-red data-[state=checked]:border-cravii-red"
              />
              <Flame className={`w-5 h-5 ${appliances.includes('stovetop') ? 'text-cravii-red' : 'text-gray-400'}`} />
              <span className="font-medium">Stovetop</span>
            </label>
            <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
              <Checkbox 
                checked={appliances.includes('microwave')}
                onCheckedChange={() => toggleAppliance('microwave')}
                className="data-[state=checked]:bg-cravii-red data-[state=checked]:border-cravii-red"
              />
              <Microwave className={`w-5 h-5 ${appliances.includes('microwave') ? 'text-cravii-red' : 'text-gray-400'}`} />
              <span className="font-medium">Microwave</span>
            </label>
            <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
              <Checkbox 
                checked={appliances.includes('airfryer')}
                onCheckedChange={() => toggleAppliance('airfryer')}
                className="data-[state=checked]:bg-cravii-red data-[state=checked]:border-cravii-red"
              />
              <Wind className={`w-5 h-5 ${appliances.includes('airfryer') ? 'text-cravii-red' : 'text-gray-400'}`} />
              <span className="font-medium">Air Fryer</span>
            </label>
          </div>
        </div>
        
        <Button 
          onClick={generateRecipes}
          className="w-full bg-cravii-red hover:bg-cravii-red-dark text-white py-4 rounded-xl font-semibold text-lg"
        >
          GENERATE!
        </Button>
      </div>
    </div>
  );
}
