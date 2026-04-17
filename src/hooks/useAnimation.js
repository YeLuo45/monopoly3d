import { useRef, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';

// Hook for animating step-by-step movement along a path
export function useStepAnimation(path, onStepComplete, onComplete) {
  const currentStep = useRef(0);
  const lastStepTime = useRef(0);
  const STEP_DURATION = 400; // ms per tile
  
  const reset = useCallback(() => {
    currentStep.current = 0;
    lastStepTime.current = 0;
  }, []);
  
  useFrame(({ clock }) => {
    if (!path || path.length === 0) return;
    
    const now = clock.elapsedTime * 1000;
    if (now - lastStepTime.current >= STEP_DURATION) {
      lastStepTime.current = now;
      currentStep.current += 1;
      
      if (onStepComplete) {
        onStepComplete(currentStep.current);
      }
      
      if (currentStep.current >= path.length) {
        if (onComplete) onComplete();
      }
    }
  });
  
  return { reset };
}

// Hook for TTS narration
export function useSpeech() {
  const speak = useCallback((text, lang = 'zh-CN') => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.9;
      speechSynthesis.speak(utterance);
    }
  }, []);
  
  const stop = useCallback(() => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
  }, []);
  
  return { speak, stop };
}
