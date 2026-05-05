import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { useGameStore } from '../../game/store';
import * as THREE from 'three';

// Each face has its own bright color
const FACE_COLORS = {
  1: '#FF6B6B',  // Red
  2: '#3B82F6',  // Blue
  3: '#22C55E',  // Green
  4: '#F59E0B',  // Amber
  5: '#A855F7',  // Purple
  6: '#EC4899',  // Pink
};

const DICE_FACES = {
  1: [[0, 0]],
  2: [[-1, 1], [1, -1]],
  3: [[-1, 1], [0, 0], [1, -1]],
  4: [[-1, 1], [1, 1], [-1, -1], [1, -1]],
  5: [[-1, 1], [1, 1], [0, 0], [-1, -1], [1, -1]],
  6: [[-1, 1], [1, 1], [-1, 0], [1, 0], [-1, -1], [1, -1]],
};

function Pip({ position, color }) {
  return (
    <mesh position={position} castShadow>
      <cylinderGeometry args={[0.07, 0.07, 0.04, 12]} />
      <meshStandardMaterial color={color} roughness={0.2} metalness={0.3} />
    </mesh>
  );
}

function DiceFace({ value, position, rotation, faceColor }) {
  return (
    <group position={position} rotation={rotation}>
      {DICE_FACES[value].map(([x, y], i) => (
        <Pip key={i} position={[x * 0.2, 0.03, y * 0.2]} color={faceColor} />
      ))}
    </group>
  );
}

function Die({ position, value, rolling }) {
  const meshRef = useRef();
  const targetRotation = useRef({ x: 0, y: 0 });
  const prevRolling = useRef(rolling);
  const bounceY = useRef(0);
  const bounceVel = useRef(0);
  const rollStartTime = useRef(0);
  const ROLL_DURATION = 1.2; // 1.2 seconds ease-out rolling

  useEffect(() => {
    if (rolling && !prevRolling.current) {
      // Start of rolling - reset bounce
      rollStartTime.current = Date.now();
      bounceVel.current = 0.3;
    }
    // When rolling stops, start bounce-out settle
    if (prevRolling.current && !rolling) {
      const faceRotations = {
        1: [0, 0],
        2: [0, Math.PI / 2],
        3: [-Math.PI / 2, 0],
        4: [Math.PI / 2, 0],
        5: [0, -Math.PI / 2],
        6: [Math.PI, 0],
      };
      const [rx, ry] = faceRotations[value] || [0, 0];
      if (meshRef.current) {
        meshRef.current.rotation.x = rx;
        meshRef.current.rotation.y = ry;
      }
      targetRotation.current = { x: rx, y: ry };
      // Trigger bounce on landing
      bounceVel.current = 0.25;
    }
    prevRolling.current = rolling;
  }, [rolling, value]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    // Bounce physics for landing
    if (bounceVel.current !== 0) {
      bounceY.current += bounceVel.current;
      bounceVel.current -= delta * 2.5; // gravity
      if (bounceY.current <= 0) {
        bounceY.current = 0;
        bounceVel.current *= -0.4; // bounce damping
        if (Math.abs(bounceVel.current) < 0.02) {
          bounceVel.current = 0;
        }
      }
      meshRef.current.position.y = bounceY.current;
    }

    if (rolling) {
      // Calculate progress through roll duration
      const elapsed = (Date.now() - rollStartTime.current) / 1000;
      const progress = Math.min(elapsed / ROLL_DURATION, 1);
      // Ease-out deceleration: fast start, slow end
      const easeFactor = 1 - Math.pow(1 - progress, 3);
      
      // Tumbling animation with deceleration
      meshRef.current.rotation.x += delta * 18 * (1 - easeFactor * 0.7);
      meshRef.current.rotation.y += delta * 14 * (1 - easeFactor * 0.7);
      meshRef.current.rotation.z += delta * 6 * (1 - easeFactor * 0.7);
      
      // Shadow intensity changes during roll
      const shadowPulse = 0.5 + Math.sin(elapsed * 20) * 0.3;
      meshRef.current.castShadow = true;
    } else {
      // Smooth snap to target face
      meshRef.current.rotation.x += (targetRotation.current.x - meshRef.current.rotation.x) * 0.15;
      meshRef.current.rotation.y += (targetRotation.current.y - meshRef.current.rotation.y) * 0.15;
    }
  });

  // Get face color based on value
  const topColor = FACE_COLORS[value] || '#F5F5F5';

  return (
    <group ref={meshRef} position={position}>
      {/* Die body - cream white with subtle gradient effect */}
      <mesh castShadow>
        <boxGeometry args={[0.72, 0.72, 0.72]} />
        <meshStandardMaterial
          color="#FFFBEB"
          roughness={0.25}
          metalness={0.05}
        />
      </mesh>

      {/* Subtle edge highlight */}
      <mesh>
        <boxGeometry args={[0.74, 0.74, 0.74]} />
        <meshStandardMaterial color="none" wireframe transparent opacity={0.15} />
      </mesh>

      {/* Face 1 (top) - Red */}
      <DiceFace
        value={value}
        position={[0, 0.37, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        faceColor={FACE_COLORS[1]}
      />

      {/* Face 6 (bottom) - Pink */}
      <DiceFace
        value={7 - value}
        position={[0, -0.37, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        faceColor={FACE_COLORS[6]}
      />

      {/* Face 2 (right) - Blue */}
      {/* Standard die: opposite faces sum to 7. Front/Right/Back/Left vary by top value. */}
      <DiceFace
        value={value === 1 ? 3 : value === 2 ? 5 : value === 3 ? 6 : value === 4 ? 1 : value === 5 ? 2 : 4}
        position={[0.37, 0, 0]}
        rotation={[0, 0, -Math.PI / 2]}
        faceColor={FACE_COLORS[2]}
      />

      {/* Face 5 (left) - Purple */}
      <DiceFace
        value={value === 1 ? 4 : value === 2 ? 3 : value === 3 ? 5 : value === 4 ? 6 : value === 5 ? 1 : 2}
        position={[-0.37, 0, 0]}
        rotation={[0, 0, Math.PI / 2]}
        faceColor={FACE_COLORS[5]}
      />

      {/* Face 3 (front) - Green */}
      <DiceFace
        value={value === 1 ? 2 : value === 2 ? 6 : value === 3 ? 4 : value === 4 ? 5 : value === 5 ? 3 : 1}
        position={[0, 0, 0.37]}
        rotation={[0, 0, 0]}
        faceColor={FACE_COLORS[3]}
      />

      {/* Face 4 (back) - Amber */}
      <DiceFace
        value={value === 1 ? 5 : value === 2 ? 4 : value === 3 ? 1 : value === 4 ? 2 : value === 5 ? 6 : 3}
        position={[0, 0, -0.37]}
        rotation={[0, Math.PI, 0]}
        faceColor={FACE_COLORS[4]}
      />

      {/* Colored glow ring when not rolling */}
      {!rolling && (
        <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.38, 0.52, 20]} />
          <meshBasicMaterial color={topColor} transparent opacity={0.4} />
        </mesh>
      )}
    </group>
  );
}

export default function Dice() {
  const diceValues = useGameStore(s => s.diceValues);
  const diceRolling = useGameStore(s => s.diceRolling);
  const phase = useGameStore(s => s.phase);
  const currentPlayerIndex = useGameStore(s => s.currentPlayerIndex);
  const players = useGameStore(s => s.players);

  const showDice = phase === 'roll' || diceRolling;
  const total = diceValues[0] + diceValues[1];
  const currentPlayer = players[currentPlayerIndex];

  return (
    <group position={[0, 1.2, 0]}>
      {/* Dice tray / platform */}
      <group>
        <mesh position={[0, -0.4, 0]}>
          <cylinderGeometry args={[2.2, 2.5, 0.2, 16]} />
          <meshStandardMaterial color="#7C3AED" roughness={0.5} metalness={0.1} />
        </mesh>
        <mesh position={[0, -0.28, 0]}>
          <cylinderGeometry args={[2.0, 2.2, 0.08, 16]} />
          <meshStandardMaterial color="#A78BFA" roughness={0.3} metalness={0.2} />
        </mesh>
      </group>

      <group visible={showDice}>
        <Die
          position={[-0.65, 0, 0]}
          value={diceValues[0]}
          rolling={diceRolling}
        />
        <Die
          position={[0.65, 0, 0]}
          value={diceValues[1]}
          rolling={diceRolling}
        />
      </group>

      {/* Dice total indicator - bright and large, always visible */}
      {diceValues && (
        <group position={[0, 1.4, 0]}>
          {/* Background pill - larger for better visibility */}
          <mesh position={[0, 0.1, 0]}>
            <cylinderGeometry args={[0.6, 0.6, 0.12, 16]} rotation={[Math.PI / 2, 0, 0]} />
            <meshStandardMaterial color="#FEF08A" roughness={0.3} metalness={0.2} emissive="#FCD34D" emissiveIntensity={0.2} />
          </mesh>
          <Text
            position={[0, 0.16, 0]}
            fontSize={0.5}
            color="#78350F"
            anchorX="center"
            anchorY="middle"
            fontWeight="bold"
            outlineWidth={0.02}
            outlineColor="#ffffff"
          >
            {diceRolling ? '?' : `${total}`}
          </Text>
        </group>
      )}

      {/* Roll prompt */}
      {phase === 'roll' && !diceRolling && currentPlayer && (
        <Text
          position={[0, 2.0, 0]}
          fontSize={0.3}
          color="#FEF08A"
          anchorX="center"
          anchorY="middle"
        >
          {currentPlayer.name} 的回合
        </Text>
      )}
    </group>
  );
}
