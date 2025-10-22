import { useState, useCallback } from 'react';

export interface SwipeHandlers {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onSwipeUp?: () => void;
}

export function useSwipe(handlers: SwipeHandlers) {
  const [isSweping, setIsSweping] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | 'up' | null>(null);

  const swipeLeft = useCallback(() => {
    if (isSweping) return;
    setIsSweping(true);
    setSwipeDirection('left');
    
    setTimeout(() => {
      handlers.onSwipeLeft();
      setIsSweping(false);
      setSwipeDirection(null);
    }, 300);
  }, [handlers.onSwipeLeft, isSweping]);

  const swipeRight = useCallback(() => {
    if (isSweping) return;
    setIsSweping(true);
    setSwipeDirection('right');
    
    setTimeout(() => {
      handlers.onSwipeRight();
      setIsSweping(false);
      setSwipeDirection(null);
    }, 300);
  }, [handlers.onSwipeRight, isSweping]);

  const swipeUp = useCallback(() => {
    if (isSweping || !handlers.onSwipeUp) return;
    setIsSweping(true);
    setSwipeDirection('up');
    
    setTimeout(() => {
      handlers.onSwipeUp!();
      setIsSweping(false);
      setSwipeDirection(null);
    }, 300);
  }, [handlers.onSwipeUp, isSweping]);

  return {
    isSweping,
    swipeDirection,
    swipeLeft,
    swipeRight,
    swipeUp
  };
}
