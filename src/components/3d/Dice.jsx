import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { useGameStore } from '../../game/store';
import { t } from '../../i18n';
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
  const targetRotation = useRef({ x: 0, y: 0, z: 0 });
  const prevRolling = useRef(rolling);
  
  // Physics state refs
  const physicsState = useRef({
    phase: 'idle', // 'idle' | 'airborne' | 'bouncing' | 'settling'
    airborneTime: 0,
    airborneDuration: 0.6, // Time in air
    peakHeight: 1.8, // Maximum Y height reached
    baseY: 0,
    
    // Rotation physics
    rotVelX: 0,
    rotVelY: 0,
    rotVelZ: 0,
    
    // Bounce physics
    bounceY: 0,
    bounceVel: 0,
    bounceCount: 0,
    maxBounces: 3,
    bounceDecay: 0.45, // Energy retention per bounce
    
    // Settling
    settleTime: 0,
  });
  
  const rollStartTime = useRef(0);
  const ROLL_DURATION = 1.4; // Total roll duration

  useEffect(() => {
    const faceRotations = {
      1: [0, 0, 0],
      2: [0, Math.PI / 2, 0],
      3: [-Math.PI / 2, 0, 0],
      4: [Math.PI / 2, 0, 0],
      5: [0, -Math.PI / 2, 0],
      6: [Math.PI, 0, 0],
    };
    
    if (rolling && !prevRolling.current) {
      // Start of rolling - initialize physics
      rollStartTime.current = Date.now();
      const ps = physicsState.current;
      ps.phase = 'airborne';
      ps.airborneTime = 0;
      ps.airborneDuration = 0.5 + Math.random() * 0.2; // Slight variation
      ps.bounceCount = 0;
      ps.bounceY = 0;
      ps.bounceVel = 0;
      ps.settleTime = 0;
      
      // Randomize initial rotation velocities for variety
      ps.rotVelX = 15 + Math.random() * 8;
      ps.rotVelY = 12 + Math.random() * 6;
      ps.rotVelZ = 4 + Math.random() * 4;
    }
    
    if (prevRolling.current && !rolling) {
      // Rolling stopped - prepare for landing
      const ps = physicsState.current;
      ps.phase = 'bouncing';
      ps.bounceCount = 0;
      ps.bounceY = 0;
      
      // Initial downward velocity from airborne phase
      ps.bounceVel = 0.35 + Math.random() * 0.15;
      
      // Set target rotation for final face
      const [rx, ry, rz] = faceRotations[value] || [0, 0, 0];
      targetRotation.current = { x: rx, y: ry, z: rz };
    }
    
    prevRolling.current = rolling;
  }, [rolling, value]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    
    const ps = physicsState.current;
    const mesh = meshRef.current;

    if (ps.phase === 'airborne') {
      // Parabolic arc trajectory
      ps.airborneTime += delta;
      const t = ps.airborneTime / ps.airborneDuration;
      
      if (t < 1) {
        // Parabolic Y motion: rises then falls
        // Using parabola: y = 4 * peakHeight * t * (1 - t)
        const parabolicY = 4 * ps.peakHeight * t * (1 - t);
        mesh.position.y = parabolicY;
        
        // Decelerating rotation - fast at start, slow at end
        const easeFactor = 1 - Math.pow(1 - t, 2.5);
        const rotFactor = 1 - easeFactor * 0.75;
        
        mesh.rotation.x += delta * ps.rotVelX * rotFactor;
        mesh.rotation.y += delta * ps.rotVelY * rotFactor;
        mesh.rotation.z += delta * ps.rotVelZ * rotFactor;
        
        // Slight wobble
        mesh.rotation.z += Math.sin(t * Math.PI * 6) * delta * 0.5;
      } else {
        // Transition to bounce phase
        mesh.position.y = 0;
        ps.phase = 'bouncing';
        ps.bounceVel = 0.4 + Math.random() * 0.1;
      }
    }
    
    if (ps.phase === 'bouncing') {
      // Realistic bounce with energy decay
      ps.bounceY += ps.bounceVel;
      ps.bounceVel -= delta * 4.0; // gravity
      
      if (ps.bounceY <= 0) {
        ps.bounceY = 0;
        ps.bounceCount++;
        
        // Only bounce 2-3 times
        if (ps.bounceCount >= ps.maxBounces) {
          ps.bounceVel = 0;
          ps.bounceY = 0;
          ps.phase = 'settling';
          mesh.position.y = 0;
        } else {
          // Energy decay on each bounce
          ps.bounceVel *= -ps.bounceDecay;
          ps.bounceVel += 0.05; // Small extra push
        }
      }
      
      mesh.position.y = ps.bounceY;
      
      // Continue rotation during bounce with rapid decay
      const rotDecay = Math.pow(0.6, ps.bounceCount);
      mesh.rotation.x += delta * ps.rotVelX * 0.3 * rotDecay;
      mesh.rotation.y += delta * ps.rotVelY * 0.3 * rotDecay;
      mesh.rotation.z += delta * ps.rotVelZ * 0.2 * rotDecay;
    }
    
    if (ps.phase === 'settling') {
      // Smooth snap to target face orientation
      ps.settleTime += delta;
      const settleFactor = 1 - Math.pow(1 - Math.min(ps.settleTime / 0.4, 1), 3);
      
      mesh.rotation.x += (targetRotation.current.x - mesh.rotation.x) * 0.18;
      mesh.rotation.y += (targetRotation.current.y - mesh.rotation.y) * 0.18;
      mesh.rotation.z += (targetRotation.current.z - mesh.rotation.z) * 0.18;
      
      // Small bounce settle
      if (ps.settleTime < 0.3) {
        const settleBounce = Math.sin(ps.settleTime * 20) * 0.02 * (1 - ps.settleTime / 0.3);
        mesh.position.y = Math.max(0, settleBounce);
      } else {
        mesh.position.y = 0;
      }
      
      if (ps.settleTime > 0.5) {
        ps.phase = 'idle';
        // Snap exactly to target
        mesh.rotation.x = targetRotation.current.x;
        mesh.rotation.y = targetRotation.current.y;
        mesh.rotation.z = targetRotation.current.z;
      }
    }
    
    if (!rolling && ps.phase === 'idle') {
      // Idle state - ensure dice is positioned correctly
      mesh.position.y = 0;
      mesh.rotation.x = targetRotation.current.x;
      mesh.rotation.y = targetRotation.current.y;
      mesh.rotation.z = targetRotation.current.z;
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
          {currentPlayer.name}{t('hud_turn')}
        </Text>
      )}
    </group>
  );
}
