import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';

export const useScreenAnimation = () => {
  const [animationKey, setAnimationKey] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setAnimationKey(prev => prev + 1);
    }, [])
  );

  return { animationKey };
};
