import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft } from "lucide-react";

interface PreferencesProps {
  userId: number;
  onComplete: () => void;
}

export default function Preferences({ userId, onComplete }: PreferencesProps) {
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
  const [religiousDietaryNeeds, setReligiousDietaryNeeds] = useState<string[]>([]);

  const religiousOptions = [
    "Judaism (Kosher)",
    "Islam (Halal)",
    "Hindu (Vegetarian)",
    "Buddhism (Vegetarian)",
    "Jainism (Vegan)",
    "Seventh-day Adventist",
    "Mormon (Word of Wisdom)",
    "Orthodox Christian (Fasting)"
  ];

  const allergyOptions = [
    "Gluten/Wheat",
    "Dairy/Lactose",
    "Eggs",
    "Nuts (Tree nuts)",
    "Peanuts",
    "Shellfish",
    "Fish",
    "Soy",
    "Sesame",
    "Corn"
  ];

  const toggleAllergy = (allergy: string) => {
    setDietaryRestrictions(prev => 
      prev.includes(allergy) 
        ? prev.filter(r => r !== allergy)
        : [...prev, allergy]
    );
  };

  const toggleReligiousNeed = (need: string) => {
    setReligiousDietaryNeeds(prev => 
      prev.includes(need) 
        ? prev.filter(n => n !== need)
        : [...prev, need]
    );
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-red-400 to-red-500 z-30">
      <div className="h-full flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <ArrowLeft className="w-6 h-6 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-600">Cater Your Crave</h2>
            <div className="w-6"></div>
          </div>
          
          {/* Religious Section */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-black mb-4">Religious</h3>
            <div className="space-y-3">
              {religiousOptions.map((option) => (
                <label key={option} className="flex items-center justify-between cursor-pointer">
                  <span className="text-gray-700">{option}</span>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={religiousDietaryNeeds.includes(option)}
                      onChange={() => toggleReligiousNeed(option)}
                      className="sr-only"
                    />
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      religiousDietaryNeeds.includes(option) 
                        ? 'bg-red-500 border-red-500' 
                        : 'border-gray-300'
                    }`}>
                      {religiousDietaryNeeds.includes(option) && (
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      )}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
          
          {/* Allergies Section */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-black mb-4">Allergies</h3>
            <div className="space-y-3">
              {allergyOptions.map((option) => (
                <label key={option} className="flex items-center justify-between cursor-pointer">
                  <span className="text-gray-700">{option}</span>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={dietaryRestrictions.includes(option)}
                      onChange={() => toggleAllergy(option)}
                      className="sr-only"
                    />
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      dietaryRestrictions.includes(option) 
                        ? 'bg-red-500 border-red-500' 
                        : 'border-gray-300'
                    }`}>
                      {dietaryRestrictions.includes(option) && (
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      )}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
          
          <Button 
            onClick={onComplete}
            className="w-full bg-red-500 hover:bg-red-600 text-white py-4 rounded-full font-semibold text-base"
          >
            Done with Preferences
          </Button>
        </div>
      </div>
    </div>
  );
}
