import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../../game/store';

// Drives step-by-step movement animation in sync with the game clock
export default function MoveAnimator() {
  const lastStepTime = useRef(0);
  const phase = useGameStore(s => s.phase);
  const movingPath = useGameStore(s => s.movingPath);
  const animationStep = useGameStore(s => s.animationStep);
  const advanceStep = useGameStore(s => s.advanceStep);
  
  useFrame(({ clock }) => {
    if (phase !== 'moving') {
      lastStepTime.current = 0;
      return;
    }
    
    if (movingPath.length === 0) return;
    
    // Only advance if we haven't finished
    if (animationStep >= movingPath.length) return;
    
    const STEP_DURATION = 0.3; // seconds per tile
    if (clock.elapsedTime - lastStepTime.current >= STEP_DURATION) {
      lastStepTime.current = clock.elapsedTime;
      advanceStep();
    }
  });
  
  return null;
}
