import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import logoImage from "@assets/Red and White Simple Food Logo (1)_1761191715318.png";

interface DietaryRestrictionsProps {
  onBack: () => void;
  onContinue: (selectedRestrictions: string[]) => void;
  initialRestrictions?: string[];
}

const DIETARY_CATEGORIES = {
  religious: {
    title: "Religious Dietary Laws",
    icon: "🕊️",
    description: "Dietary restrictions based on religious beliefs",
    options: [
      "Judaism (Kosher)",
      "Islam (Halal)", 
      "Hindu (Vegetarian)",
      "Buddhism (Vegetarian)",
      "Jainism (Vegan)",
      "Seventh-day Adventist",
      "Mormon (Word of Wisdom)",
      "Orthodox Christian (Fasting)"
    ]
  },
  allergies: {
    title: "Food Allergies & Intolerances",
    icon: "⚠️",
    description: "Ingredients that cause allergic reactions or health issues",
    options: [
      "Gluten/Wheat",
      "Dairy/Lactose",
      "Eggs",
      "Tree Nuts",
      "Peanuts", 
      "Shellfish",
      "Fish",
      "Soy",
      "Sesame",
      "Corn"
    ]
  }
};

export default function DietaryRestrictions({ onBack, onContinue, initialRestrictions = [] }: DietaryRestrictionsProps) {
  const [selectedRestrictions, setSelectedRestrictions] = useState<string[]>(initialRestrictions);

  const handleRestrictionToggle = (restriction: string) => {
    setSelectedRestrictions(prev => 
      prev.includes(restriction)
        ? prev.filter(r => r !== restriction)
        : [...prev, restriction]
    );
  };

  const handleContinue = () => {
    onContinue(selectedRestrictions);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="px-6 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="p-3 hover:bg-gray-100 rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <img src={logoImage} alt="Cravii Logo" className="w-12 h-12 object-contain ml-2" />
              <span className="-ml-1">Cater Your Crave</span>
            </h1>
          </div>
        </div>
        <p className="text-sm text-gray-500 pb-3 text-center px-6">Tell us about your dietary needs</p>
      </div>

      <div className="px-6 py-8 max-w-2xl mx-auto">
        {/* Introduction */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-cravii-red to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            Your Dietary Preferences
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed">
            Help us customize your ingredient suggestions by selecting any dietary restrictions or preferences you follow.
          </p>
        </div>

        {/* Selected Summary */}
        {selectedRestrictions.length > 0 && (
          <div className="mb-8 p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Selected Restrictions:</h3>
            <div className="flex flex-wrap gap-2">
              {selectedRestrictions.map((restriction) => (
                <Badge 
                  key={restriction}
                  variant="secondary" 
                  className="bg-cravii-red/10 text-cravii-red border border-cravii-red/20 px-3 py-1.5"
                >
                  {restriction}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Religious Dietary Laws */}
        <Card className="mb-6 bg-white/60 backdrop-blur-sm border border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl text-gray-900">
              <span className="text-2xl">{DIETARY_CATEGORIES.religious.icon}</span>
              {DIETARY_CATEGORIES.religious.title}
            </CardTitle>
            <p className="text-sm text-gray-600">{DIETARY_CATEGORIES.religious.description}</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {DIETARY_CATEGORIES.religious.options.map((option) => (
                <div key={option} className="flex items-center space-x-3">
                  <Checkbox
                    id={`religious-${option}`}
                    checked={selectedRestrictions.includes(option)}
                    onCheckedChange={() => handleRestrictionToggle(option)}
                    className="w-5 h-5"
                  />
                  <label 
                    htmlFor={`religious-${option}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {option}
                  </label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Food Allergies */}
        <Card className="mb-8 bg-white/60 backdrop-blur-sm border border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl text-gray-900">
              <span className="text-2xl">{DIETARY_CATEGORIES.allergies.icon}</span>
              {DIETARY_CATEGORIES.allergies.title}
            </CardTitle>
            <p className="text-sm text-gray-600">{DIETARY_CATEGORIES.allergies.description}</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {DIETARY_CATEGORIES.allergies.options.map((option) => (
                <div key={option} className="flex items-center space-x-3">
                  <Checkbox
                    id={`allergy-${option}`}
                    checked={selectedRestrictions.includes(option)}
                    onCheckedChange={() => handleRestrictionToggle(option)}
                    className="w-5 h-5"
                  />
                  <label 
                    htmlFor={`allergy-${option}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {option}
                  </label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Continue Button */}
        <div className="space-y-3">
          <Button
            onClick={handleContinue}
            className="w-full bg-gradient-to-r from-cravii-red to-pink-500 hover:from-cravii-red/90 hover:to-pink-500/90 text-white font-semibold py-4 text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
          >
            Continue to Preferences
            {selectedRestrictions.length > 0 && (
              <Badge className="ml-2 bg-white/20 text-white border-white/20">
                {selectedRestrictions.length}
              </Badge>
            )}
          </Button>
          
          <Button
            variant="ghost"
            onClick={() => onContinue([])}
            className="w-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 py-3"
          >
            Skip - No Restrictions
          </Button>
        </div>

        {/* Info Note */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> We'll only show ingredients and recipes that are safe for your selected restrictions. 
            You can always update these preferences later in your profile.
          </p>
        </div>
      </div>
    </div>
  );
}