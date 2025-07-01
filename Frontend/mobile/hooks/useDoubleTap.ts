import { useState, useCallback } from 'react';

/**
 * Hook to detect double taps
 * @param onDoubleTap Function to call when double tap is detected
 * @param delay Maximum time between taps in ms
 * @returns A function to handle taps
 */
export default function useDoubleTap(onDoubleTap: () => void, delay = 300) {
  const [lastTap, setLastTap] = useState(0);
  
  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTap < delay) {
      onDoubleTap();
    }
    setLastTap(now);
  }, [lastTap, onDoubleTap, delay]);
  
  return handleTap;
}