import { useEffect, useState } from "react";

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
          <h1 className="text-9xl font-bold text-black tracking-tight">
            Cravii
          </h1>
          <p className="text-2xl text-black/80 mt-4">Your Recipe Assistant</p>
        </div>

        {/* Progress Bar */}
        <div className="mt-8">
          <div className="w-80 h-3 bg-black/20 rounded-full overflow-hidden border-2 border-black">
            <div 
              className="h-full bg-black rounded-full transition-all duration-100 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
