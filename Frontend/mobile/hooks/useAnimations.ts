import { useRef, useCallback } from 'react';
import { Animated } from 'react-native';

export default function useAnimations() {
  // Animation values
  const likeScale = useRef(new Animated.Value(1)).current;
  const saveScale = useRef(new Animated.Value(1)).current;
  
  // Animate like button
  const animateLike = useCallback(() => {
    Animated.sequence([
      Animated.timing(likeScale, {
        toValue: 1.5,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(likeScale, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start();
  }, [likeScale]);
  
  // Animate save button
  const animateSave = useCallback(() => {
    Animated.sequence([
      Animated.timing(saveScale, {
        toValue: 1.5,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(saveScale, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start();
  }, [saveScale]);
  
  return {
    likeScale,
    saveScale,
    animateLike,
    animateSave
  };
}