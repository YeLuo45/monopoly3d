/**
 * EmoteBubble - Floating emoji bubble above a player's token
 * 
 * Features:
 * - Floating animation (bob up and down)
 * - Fade in/out transitions
 * - Auto-dismiss after duration
 * - Positioned above player's 3D token
 */

import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useGameStore } from '../../game/store';

// Board tile positions - must match Players.jsx
function getTilePosition(index) {
  const size = 14;
  const padding = 2.0;
  const innerSize = size - padding;

  if (index < 9) {
    const t = index / 9;
    return [innerSize, 0.3, -innerSize + 2 * innerSize * t];
  } else if (index < 18) {
    const t = (index - 9) / 9;
    return [innerSize - 2 * innerSize * t, 0.3, -innerSize];
  } else if (index < 27) {
    const t = (index - 18) / 9;
    return [-innerSize, 0.3, -innerSize + 2 * innerSize * t];
  } else {
    const t = (index - 27) / 9;
    return [-innerSize + 2 * innerSize * t, 0.3, innerSize];
  }
}

/**
 * Single Emote Bubble - animates above one player's token
 */
function SingleEmoteBubble({ playerId, emote, position }) {
  const meshRef = useRef();
  const [opacity, setOpacity] = useState(1);
  const [offset, setOffset] = useState(0);
  const startTime = useRef(Date.now());
  const DURATION = 3000; // 3 seconds

  // Get world position
  const tileIndex = position?.position ?? 0;
  const [x, y, z] = getTilePosition(tileIndex);

  useFrame(() => {
    if (!meshRef.current) return;

    const elapsed = Date.now() - startTime.current;
    const progress = elapsed / DURATION;

    // Bob animation
    setOffset(Math.sin(elapsed * 0.005) * 0.1);

    // Fade out in last 30%
    if (progress > 0.7) {
      setOpacity(1 - ((progress - 0.7) / 0.3));
    }

    // Auto-remove after duration
    if (progress >= 1) {
      useGameStore.getState().clearEmote(playerId);
    }
  });

  return (
    <group position={[x, y + 1.2 + offset, z]}>
      <Html center>
        <div
          ref={meshRef}
          style={{
            opacity,
            transition: 'opacity 0.3s ease-out',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          <div
            style={{
              fontSize: '2.5rem',
              lineHeight: 1,
              textShadow: '0 2px 8px rgba(0,0,0,0.5)',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
              animation: 'emote-bubble 0.5s ease-out',
            }}
          >
            {emote}
          </div>
        </div>
      </Html>
    </group>
  );
}

/**
 * EmoteLayer - Renders all active emotes in the 3D scene
 */
export default function EmoteLayer() {
  const activeEmotes = useGameStore(state => state.activeEmotes);

  return (
    <>
      {Object.entries(activeEmotes).map(([playerId, { emote, timestamp, position }]) => (
        <SingleEmoteBubble
          key={playerId}
          playerId={playerId}
          emote={emote}
          position={position}
        />
      ))}
    </>
  );
}

/**
 * EmoteBubbleCSS - Add CSS animations for emote bubbles
 * Include in your global CSS or component style tag:
 */
export const EMOTE_CSS = `
@keyframes emote-bubble {
  0% {
    transform: scale(0.5) translateY(10px);
    opacity: 0;
  }
  50% {
    transform: scale(1.1) translateY(-5px);
    opacity: 1;
  }
  100% {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
}

.emote-bubble {
  animation: emote-bubble 0.5s ease-out forwards;
}
`;