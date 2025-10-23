import { useEffect, useState } from "react";
import logoImage from "@assets/Copy of Cravii MVP Pitch (1)_1761192644533.png";

interface LoadingProps {
  onComplete: () => void;
}

export default function Loading({ onComplete }: LoadingProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => onComplete(), 300);
          return 100;
        }
        return prev + 2;
      });
    }, 40);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-[rgb(255,87,87)] flex flex-col items-center justify-center z-50">
      <div className="text-center">
        {/* Logo Section */}
        <div className="mb-16">
          <img 
            src={logoImage}
            alt="Cravii Logo" 
            className="w-80 h-auto mx-auto"
            style={{ 
              clipPath: 'inset(0 0 25% 0)',
              mixBlendMode: 'multiply'
            }}
          />
        </div>

        {/* Progress Bar */}
        <div className="mt-8">
          <div className="w-80 h-2 bg-white/30 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white rounded-full transition-all duration-100 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
