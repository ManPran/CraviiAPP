import { useState } from "react";
import { Button } from "@/components/ui/button";

interface OnboardingProps {
  onComplete: () => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(1);

  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const steps = [
    {
      title: "WHAT ARE YOU CRAVING?",
      description: "Discover recipes based on ingredients you already have at home",
      image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300"
    },
    {
      title: "SWIPE TO COOK",
      description: "Swipe through ingredients to create your perfect dish instantly",
      image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300"
    },
    {
      title: "AI-POWERED RECIPES",
      description: "Get personalized recipe suggestions based on your preferences",
      image: "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300"
    }
  ];

  const currentStepData = steps[currentStep - 1];

  return (
    <div className="fixed inset-0 bg-white z-40">
      <div className="h-full flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="text-center mb-8">
            <img 
              src={currentStepData.image} 
              alt={currentStepData.description}
              className="w-80 h-60 object-cover rounded-2xl shadow-lg mb-6"
            />
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-4 text-center">
            {currentStepData.title}
          </h2>
          <p className="text-gray-600 text-center px-4 leading-relaxed">
            {currentStepData.description}
          </p>
        </div>
        
        <div className="p-8">
          <div className="flex justify-center mb-6">
            <div className="flex space-x-2">
              {[1, 2, 3].map((step) => (
                <div
                  key={step}
                  className={`w-3 h-3 rounded-full ${
                    step === currentStep ? 'bg-cravii-red' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
          <button 
            onClick={nextStep}
            className="w-full bg-cravii-red hover:bg-cravii-red-dark text-white py-4 rounded-xl font-semibold text-lg transition-colors cursor-pointer"
            type="button"
          >
            {currentStep === 3 ? 'Start Cooking' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
