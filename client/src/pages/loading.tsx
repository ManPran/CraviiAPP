import { useEffect, useState } from "react";
import logoImage from "@assets/Copy of Cravii MVP Pitch (2)_1761192887149.png";

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
      <div className="text-center px-4 w-full">
        {/* Logo Section */}
        <div className="mb-24">
          <img 
            src={logoImage}
            alt="Cravii Logo" 
            className="w-[95%] h-auto mx-auto"
          />
        </div>

        {/* Progress Bar */}
        <div className="mt-16">
          <div className="w-[70%] mx-auto h-1.5 bg-white/30 rounded-full overflow-hidden">
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
