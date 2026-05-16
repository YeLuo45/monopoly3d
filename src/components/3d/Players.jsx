import { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { useGameStore } from '../../game/store';
import * as THREE from 'three';

// Board tile positions - same as Board.jsx (36 tiles, 9 per side)
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

// Distinct cartoon token shapes per player type
function CarToken({ color }) {
  // Cute cartoon car
  return (
    <group>
      {/* Car body */}
      <mesh castShadow position={[0, 0.1, 0]}>
        <boxGeometry args={[0.55, 0.2, 0.35]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.2} />
      </mesh>
      {/* Car top/cabin */}
      <mesh castShadow position={[0.05, 0.28, 0]}>
        <boxGeometry args={[0.3, 0.18, 0.3]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.2} />
      </mesh>
      {/* Windows */}
      <mesh position={[0.05, 0.29, 0.16]}>
        <boxGeometry args={[0.25, 0.12, 0.01]} />
        <meshStandardMaterial color="#BAE6FD" roughness={0.1} metalness={0.3} emissive="#BAE6FD" emissiveIntensity={0.2} />
      </mesh>
      {/* Wheels */}
      {[[-0.18, 0, 0.18], [0.18, 0, 0.18], [-0.18, 0, -0.18], [0.18, 0, -0.18]].map(([x, y, z], i) => (
        <mesh key={i} position={[x, 0, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.1, 0.1, 0.08, 10]} />
          <meshStandardMaterial color="#1F2937" roughness={0.8} />
        </mesh>
      ))}
      {/* Headlights */}
      <mesh position={[0.28, 0.1, 0.12]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#FEF08A" emissive="#FEF08A" emissiveIntensity={0.5} roughness={0.2} />
      </mesh>
      <mesh position={[0.28, 0.1, -0.12]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#FEF08A" emissive="#FEF08A" emissiveIntensity={0.5} roughness={0.2} />
      </mesh>
    </group>
  );
}

function DogToken({ color }) {
  // Cute cartoon dog
  return (
    <group>
      {/* Body */}
      <mesh castShadow position={[0, 0.15, 0]}>
        <sphereGeometry args={[0.28, 12, 12]} />
        <meshStandardMaterial color={color} roughness={0.4} />
      </mesh>
      {/* Head */}
      <mesh castShadow position={[0, 0.42, 0.1]}>
        <sphereGeometry args={[0.2, 12, 12]} />
        <meshStandardMaterial color={color} roughness={0.4} />
      </mesh>
      {/* Ears */}
      <mesh castShadow position={[-0.14, 0.52, 0.08]} rotation={[0, 0, 0.5]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color={color} roughness={0.4} />
      </mesh>
      <mesh castShadow position={[0.14, 0.52, 0.08]} rotation={[0, 0, -0.5]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color={color} roughness={0.4} />
      </mesh>
      {/* Eyes */}
      <mesh position={[-0.07, 0.45, 0.28]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#1F2937" roughness={0.5} />
      </mesh>
      <mesh position={[0.07, 0.45, 0.28]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#1F2937" roughness={0.5} />
      </mesh>
      {/* Nose */}
      <mesh position={[0, 0.38, 0.3]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#EF4444" roughness={0.3} />
      </mesh>
      {/* Legs */}
      {[[-0.12, 0, 0.12], [0.12, 0, 0.12], [-0.12, 0, -0.12], [0.12, 0, -0.12]].map(([x, y, z], i) => (
        <mesh key={i} position={[x, 0.02, z]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 0.12, 8]} />
          <meshStandardMaterial color={color} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function CatToken({ color }) {
  // Cute cartoon cat
  return (
    <group>
      {/* Body */}
      <mesh castShadow position={[0, 0.15, 0]}>
        <sphereGeometry args={[0.28, 12, 12]} />
        <meshStandardMaterial color={color} roughness={0.4} />
      </mesh>
      {/* Head */}
      <mesh castShadow position={[0, 0.4, 0.12]}>
        <sphereGeometry args={[0.22, 12, 12]} />
        <meshStandardMaterial color={color} roughness={0.4} />
      </mesh>
      {/* Pointed ears */}
      <mesh castShadow position={[-0.12, 0.62, 0.08]} rotation={[0.2, 0, 0.3]}>
        <coneGeometry args={[0.08, 0.16, 8]} />
        <meshStandardMaterial color={color} roughness={0.4} />
      </mesh>
      <mesh castShadow position={[0.12, 0.62, 0.08]} rotation={[0.2, 0, -0.3]}>
        <coneGeometry args={[0.08, 0.16, 8]} />
        <meshStandardMaterial color={color} roughness={0.4} />
      </mesh>
      {/* Eyes */}
      <mesh position={[-0.07, 0.43, 0.32]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#10B981" emissive="#10B981" emissiveIntensity={0.3} roughness={0.2} />
      </mesh>
      <mesh position={[0.07, 0.43, 0.32]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#10B981" emissive="#10B981" emissiveIntensity={0.3} roughness={0.2} />
      </mesh>
      {/* Nose */}
      <mesh position={[0, 0.38, 0.33]}>
        <coneGeometry args={[0.03, 0.04, 6]} />
        <meshStandardMaterial color="#FF6B6B" roughness={0.3} />
      </mesh>
      {/* Tail */}
      <mesh castShadow position={[0, 0.22, -0.28]} rotation={[0.8, 0, 0]}>
        <cylinderGeometry args={[0.04, 0.02, 0.35, 8]} />
        <meshStandardMaterial color={color} roughness={0.4} />
      </mesh>
    </group>
  );
}

function TopToken({ color }) {
  // Spinning top toy
  return (
    <group>
      {/* Top body */}
      <mesh castShadow position={[0, 0.2, 0]}>
        <coneGeometry args={[0.22, 0.5, 12]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.15} />
      </mesh>
      {/* Colored stripes */}
      {['#FF6B6B', '#3B82F6', '#22C55E', '#F59E0B', '#A855F7'].map((stripeColor, i) => (
        <mesh key={i} position={[0, 0.05 + i * 0.07, 0]} rotation={[0, (i * Math.PI) / 5, 0]}>
          <torusGeometry args={[0.15 - i * 0.01, 0.02, 4, 12]} />
          <meshStandardMaterial color={stripeColor} roughness={0.3} metalness={0.2} />
        </mesh>
      ))}
      {/* Spinner tip */}
      <mesh castShadow position={[0, -0.05, 0]}>
        <sphereGeometry args={[0.08, 10, 10]} />
        <meshStandardMaterial color={color} roughness={0.2} metalness={0.3} />
      </mesh>
      {/* Handle */}
      <mesh castShadow position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.06, 0.08, 0.15, 10]} />
        <meshStandardMaterial color="#FCD34D" roughness={0.3} metalness={0.15} />
      </mesh>
    </group>
  );
}

function UltramanToken({ color }) {
  // Silver body with red accents — 光之巨人
  return (
    <group>
      {/* Body */}
      <mesh castShadow position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.18, 0.22, 0.38, 12]} />
        <meshStandardMaterial color="#C0C0C0" roughness={0.2} metalness={0.6} />
      </mesh>
      {/* Red chest stripe */}
      <mesh position={[0, 0.22, 0.19]}>
        <boxGeometry args={[0.18, 0.2, 0.02]} />
        <meshStandardMaterial color="#EF4444" roughness={0.3} metalness={0.3} emissive="#EF4444" emissiveIntensity={0.2} />
      </mesh>
      {/* Head */}
      <mesh castShadow position={[0, 0.52, 0]}>
        <sphereGeometry args={[0.18, 12, 12]} />
        <meshStandardMaterial color="#C0C0C0" roughness={0.2} metalness={0.6} />
      </mesh>
      {/* Eyes — red visor */}
      <mesh position={[0, 0.55, 0.16]}>
        <boxGeometry args={[0.22, 0.06, 0.02]} />
        <meshStandardMaterial color="#EF4444" emissive="#EF4444" emissiveIntensity={0.8} roughness={0.1} />
      </mesh>
      {/* Head fin */}
      <mesh castShadow position={[0, 0.72, 0]} rotation={[0, 0, 0]}>
        <coneGeometry args={[0.05, 0.2, 8]} />
        <meshStandardMaterial color="#EF4444" roughness={0.3} />
      </mesh>
      {/* Arms */}
      <mesh castShadow position={[-0.26, 0.3, 0]} rotation={[0, 0, 0.4]}>
        <cylinderGeometry args={[0.06, 0.06, 0.2, 8]} />
        <meshStandardMaterial color="#C0C0C0" roughness={0.2} metalness={0.6} />
      </mesh>
      <mesh castShadow position={[0.26, 0.3, 0]} rotation={[0, 0, -0.4]}>
        <cylinderGeometry args={[0.06, 0.06, 0.2, 8]} />
        <meshStandardMaterial color="#C0C0C0" roughness={0.2} metalness={0.6} />
      </mesh>
      {/* Legs */}
      <mesh castShadow position={[-0.09, 0.04, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.15, 8]} />
        <meshStandardMaterial color="#C0C0C0" roughness={0.2} metalness={0.6} />
      </mesh>
      <mesh castShadow position={[0.09, 0.04, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.15, 8]} />
        <meshStandardMaterial color="#C0C0C0" roughness={0.2} metalness={0.6} />
      </mesh>
    </group>
  );
}

function PikachuToken({ color }) {
  // Yellow body, red cheeks, pointy ears — 电耗子
  return (
    <group>
      {/* Body */}
      <mesh castShadow position={[0, 0.18, 0]}>
        <sphereGeometry args={[0.25, 12, 12]} />
        <meshStandardMaterial color="#FFE135" roughness={0.4} />
      </mesh>
      {/* Head */}
      <mesh castShadow position={[0, 0.46, 0.06]}>
        <sphereGeometry args={[0.22, 12, 12]} />
        <meshStandardMaterial color="#FFE135" roughness={0.4} />
      </mesh>
      {/* Ears — pointy black tips */}
      <mesh castShadow position={[-0.12, 0.72, 0.03]} rotation={[0, 0, 0.2]}>
        <coneGeometry args={[0.07, 0.22, 8]} />
        <meshStandardMaterial color="#FFE135" roughness={0.4} />
      </mesh>
      <mesh castShadow position={[-0.12, 0.86, 0.03]} rotation={[0, 0, 0.2]}>
        <coneGeometry args={[0.04, 0.1, 8]} />
        <meshStandardMaterial color="#1F2937" roughness={0.5} />
      </mesh>
      <mesh castShadow position={[0.12, 0.72, 0.03]} rotation={[0, 0, -0.2]}>
        <coneGeometry args={[0.07, 0.22, 8]} />
        <meshStandardMaterial color="#FFE135" roughness={0.4} />
      </mesh>
      <mesh castShadow position={[0.12, 0.86, 0.03]} rotation={[0, 0, -0.2]}>
        <coneGeometry args={[0.04, 0.1, 8]} />
        <meshStandardMaterial color="#1F2937" roughness={0.5} />
      </mesh>
      {/* Eyes */}
      <mesh position={[-0.08, 0.5, 0.26]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#1F2937" roughness={0.5} />
      </mesh>
      <mesh position={[0.08, 0.5, 0.26]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#1F2937" roughness={0.5} />
      </mesh>
      {/* Red cheeks */}
      <mesh position={[-0.16, 0.44, 0.2]}>
        <sphereGeometry args={[0.07, 8, 8]} />
        <meshStandardMaterial color="#EF4444" roughness={0.4} emissive="#EF4444" emissiveIntensity={0.2} />
      </mesh>
      <mesh position={[0.16, 0.44, 0.2]}>
        <sphereGeometry args={[0.07, 8, 8]} />
        <meshStandardMaterial color="#EF4444" roughness={0.4} emissive="#EF4444" emissiveIntensity={0.2} />
      </mesh>
      {/* Nose */}
      <mesh position={[0, 0.44, 0.28]}>
        <sphereGeometry args={[0.025, 6, 6]} />
        <meshStandardMaterial color="#1F2937" roughness={0.5} />
      </mesh>
      {/* Lightning tail (zigzag approximation) */}
      <mesh castShadow position={[0, 0.2, -0.28]} rotation={[0.5, 0.3, 0]}>
        <boxGeometry args={[0.08, 0.28, 0.05]} />
        <meshStandardMaterial color="#FFE135" roughness={0.4} />
      </mesh>
    </group>
  );
}

function DoraemonToken({ color }) {
  // Blue round body, white belly, red collar with bell — 机器猫
  return (
    <group>
      {/* Body — blue sphere */}
      <mesh castShadow position={[0, 0.2, 0]}>
        <sphereGeometry args={[0.28, 12, 12]} />
        <meshStandardMaterial color="#00A5E0" roughness={0.3} />
      </mesh>
      {/* White belly */}
      <mesh position={[0, 0.12, 0.24]}>
        <sphereGeometry args={[0.18, 10, 10]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.4} />
      </mesh>
      {/* Head */}
      <mesh castShadow position={[0, 0.52, 0]}>
        <sphereGeometry args={[0.26, 12, 12]} />
        <meshStandardMaterial color="#00A5E0" roughness={0.3} />
      </mesh>
      {/* White face */}
      <mesh position={[0, 0.5, 0.2]}>
        <sphereGeometry args={[0.18, 10, 10]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.4} />
      </mesh>
      {/* Eyes */}
      <mesh position={[-0.08, 0.6, 0.32]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.3} />
      </mesh>
      <mesh position={[-0.08, 0.6, 0.36]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshStandardMaterial color="#1F2937" roughness={0.5} />
      </mesh>
      <mesh position={[0.08, 0.6, 0.32]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.3} />
      </mesh>
      <mesh position={[0.08, 0.6, 0.36]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshStandardMaterial color="#1F2937" roughness={0.5} />
      </mesh>
      {/* Red nose */}
      <mesh position={[0, 0.52, 0.38]}>
        <sphereGeometry args={[0.045, 8, 8]} />
        <meshStandardMaterial color="#EF4444" roughness={0.3} emissive="#EF4444" emissiveIntensity={0.15} />
      </mesh>
      {/* Whisker lines (flat boxes) */}
      {[[-0.18, 0.48, 0.34], [0.18, 0.48, 0.34]].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]}>
          <boxGeometry args={[0.14, 0.01, 0.01]} />
          <meshStandardMaterial color="#1F2937" />
        </mesh>
      ))}
      {/* Red collar */}
      <mesh position={[0, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.22, 0.04, 8, 20]} />
        <meshStandardMaterial color="#EF4444" roughness={0.3} />
      </mesh>
      {/* Bell */}
      <mesh castShadow position={[0, 0.25, 0.22]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#FCD34D" metalness={0.6} roughness={0.2} emissive="#FCD34D" emissiveIntensity={0.1} />
      </mesh>
    </group>
  );
}

// Player color to token shape mapping (index matches piece id in PieceSelectionScreen)
const TOKEN_SHAPES = [CarToken, DogToken, CatToken, TopToken, UltramanToken, PikachuToken, DoraemonToken];
const PLAYER_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#C0C0C0', '#FFE135', '#00A5E0'];

function PlayerToken({ player, isCurrentPlayer, position, offsetX, offsetZ, pieceId }) {
  const meshRef = useRef();
  const [bobPhase] = useState(Math.random() * Math.PI * 2);
  // Use piece selection if available; fall back to player.id modulo
  const shapeIdx = pieceId !== undefined ? pieceId % TOKEN_SHAPES.length : player.id % TOKEN_SHAPES.length;
  const TokenShape = TOKEN_SHAPES[shapeIdx];
  const playerColor = pieceId !== undefined ? PLAYER_COLORS[pieceId % PLAYER_COLORS.length] : PLAYER_COLORS[player.id % PLAYER_COLORS.length];

  // Smooth movement interpolation refs
  const fromPos = useRef(new THREE.Vector3(position[0], position[1] + 0.55, position[2]));
  const toPos = useRef(new THREE.Vector3(position[0], position[1] + 0.55, position[2]));
  const stepStartTime = useRef(0);
  const lastStep = useRef(-1);
  const STEP_DURATION = 0.3; // seconds per tile — must match MoveAnimator
  const swayPhase = useRef(Math.random() * Math.PI * 2); // random sway offset
  const arriveTime = useRef(0); // tracks arrival for landing impact
  const justArrived = useRef(false);
  const squashScale = useRef({ x: 1, y: 1, z: 1 }); // for landing squash effect

  // Cubic bezier easing function (ease-in-out)
  const bezierEaseInOut = (t) => {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };

  useFrame(({ clock }) => {
    if (!meshRef.current) return;

    const state = useGameStore.getState();
    const { phase, animationStep, movingPath } = state;
    const isMoving = phase === 'moving' && isCurrentPlayer;

    // Detect when a new step begins → update interpolation targets
    if (isMoving && animationStep !== lastStep.current) {
      lastStep.current = animationStep;
      stepStartTime.current = clock.elapsedTime;
      swayPhase.current += 0.5; // shift sway phase each step

      // Determine from/to positions
      const currentIdx = Math.max(0, animationStep - 1);
      const nextIdx = Math.min(animationStep, movingPath.length - 1);
      const fromTile = movingPath[currentIdx] ?? movingPath[0];
      const toTile = movingPath[nextIdx] ?? movingPath[0];
      const fromTilePos = getTilePosition(fromTile);
      const toTilePos = getTilePosition(toTile);

      fromPos.current.set(fromTilePos[0], fromTilePos[1] + 0.55, fromTilePos[2]);
      toPos.current.set(toTilePos[0], toTilePos[1] + 0.55, toTilePos[2]);
    }

    // Interpolate position during movement
    if (isMoving) {
      const elapsed = clock.elapsedTime - stepStartTime.current;
      const t = Math.min(elapsed / STEP_DURATION, 1);
      
      // Cubic bezier ease-in-out for natural acceleration/deceleration
      const eased = bezierEaseInOut(t);
      
      // Horizontal position with bezier interpolation
      const lerpedX = THREE.MathUtils.lerp(fromPos.current.x, toPos.current.x, eased);
      const lerpedZ = THREE.MathUtils.lerp(fromPos.current.z, toPos.current.z, eased);
      
      // Parabolic arc - peak at midpoint of movement (4 * t * (1 - t) gives parabola shape)
      const jumpHeight = 0.4; // maximum jump height
      const parabolicArc = 4 * t * (1 - t) * jumpHeight;
      
      // Base Y follows horizontal lerp, plus parabolic arc
      const baseY = THREE.MathUtils.lerp(fromPos.current.y, toPos.current.y, eased);
      const lerpedY = baseY + parabolicArc;

      // Sway left-right perpendicular to movement direction
      const moveDir = new THREE.Vector3(
        toPos.current.x - fromPos.current.x,
        0,
        toPos.current.z - fromPos.current.z
      ).normalize();
      const perpDir = new THREE.Vector3(-moveDir.z, 0, moveDir.x);
      const swayAmount = Math.sin(clock.elapsedTime * 10 + swayPhase.current) * 0.05 * (1 - eased);
      const swayOffset = perpDir.multiplyScalar(swayAmount);

      // 3D tilt toward movement direction - lean forward/up during jump
      const tiltAmount = Math.sin(Math.PI * t) * 0.15; // tilt peaks at mid-air
      const tiltAxis = new THREE.Vector3(-moveDir.z, 0, moveDir.x);
      
      meshRef.current.position.set(
        lerpedX + offsetX + swayOffset.x,
        lerpedY,
        lerpedZ + offsetZ + swayOffset.z
      );
      
      // Apply tilt rotation (leaning into movement direction)
      meshRef.current.rotation.set(0, 0, 0);
      meshRef.current.rotateOnWorldAxis(tiltAxis, tiltAmount);
      
      justArrived.current = false;
      
      // Reset squash during movement
      squashScale.current = { x: 1, y: 1, z: 1 };
    } else {
      // Arrival landing impact effect
      if (!justArrived.current && lastStep.current >= 0 && phase !== 'moving') {
        justArrived.current = true;
        arriveTime.current = clock.elapsedTime;
      }
      
      let vibY = 0;
      let squashY = 1;
      let squashXZ = 1;
      
      if (justArrived.current) {
        const vibElapsed = clock.elapsedTime - arriveTime.current;
        if (vibElapsed < 0.5) {
          // Stronger landing impact with squash/stretch
          const impact = 1 - vibElapsed / 0.5;
          // Vibration decays
          vibY = Math.sin(vibElapsed * 40) * 0.08 * impact;
          // Squash effect - flatten then spring back
          squashY = 1 - 0.3 * impact * Math.cos(vibElapsed * 25);
          squashXZ = 1 + 0.15 * impact * Math.cos(vibElapsed * 25);
        }
      }
      
      // Idle bob animation
      const bob = Math.sin(clock.elapsedTime * 3 + bobPhase) * 0.06;
      
      meshRef.current.position.set(
        position[0] + offsetX,
        position[1] + 0.55 + bob + vibY,
        position[2] + offsetZ
      );
      
      // Reset rotation when idle
      meshRef.current.rotation.set(0, 0, 0);
      
      // Apply squash/stretch scale
      squashScale.current = {
        x: squashXZ,
        y: squashY,
        z: squashXZ
      };
    }

    // Current player pulse + landing squash
    if (isCurrentPlayer) {
      const pulse = (Math.sin(clock.elapsedTime * 4) + 1) / 2;
      const pulseScale = 1 + pulse * 0.08;
      meshRef.current.scale.set(
        squashScale.current.x * pulseScale,
        squashScale.current.y * pulseScale,
        squashScale.current.z * pulseScale
      );
    } else {
      meshRef.current.scale.set(
        squashScale.current.x,
        squashScale.current.y,
        squashScale.current.z
      );
    }
  });

  return (
    <group ref={meshRef} position={[position[0] + offsetX, position[1] + 0.55, position[2] + offsetZ]}>
      <TokenShape color={playerColor} />

      {/* Current player glow ring */}
      {isCurrentPlayer && (
        <mesh position={[0, -0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.35, 0.55, 20]} />
          <meshBasicMaterial color={playerColor} transparent opacity={0.5} />
        </mesh>
      )}

      {/* Player name badge */}
      <group position={[0, 0.85, 0]}>
        <mesh>
          <cylinderGeometry args={[0.18, 0.18, 0.06, 12]} rotation={[Math.PI / 2, 0, 0]} />
          <meshStandardMaterial color={playerColor} roughness={0.3} metalness={0.2} />
        </mesh>
        <Text
          position={[0, 0.04, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.13}
          color="white"
          anchorX="center"
          anchorY="middle"
          fontWeight="bold"
        >
          {player.name}
        </Text>
      </group>

      {/* AI indicator */}
      {player.isAI && (
        <Text position={[0, 1.05, 0]} fontSize={0.12} color="#FBBF24" anchorX="center" anchorY="middle">
          🤖 AI
        </Text>
      )}
    </group>
  );
}

export default function Players() {
  const players = useGameStore(s => s.players);
  const currentPlayerIndex = useGameStore(s => s.currentPlayerIndex);
  const phase = useGameStore(s => s.phase);
  const movingPath = useGameStore(s => s.movingPath);
  const animationStep = useGameStore(s => s.animationStep);
  const pieceSelections = useGameStore(s => s.pieceSelections);

  // Build player position map
  const playerPositions = {};

  players.forEach((player, idx) => {
    if (player.isBankrupt) return;
    let pos;
    if (phase === 'moving' && idx === currentPlayerIndex && movingPath.length > 0) {
      const stepPos = Math.min(animationStep, movingPath.length - 1);
      pos = movingPath[stepPos];
    } else {
      pos = player.position;
    }

    if (!playerPositions[pos]) playerPositions[pos] = [];
    playerPositions[pos].push({ player, idx });
  });

  return (
    <group>
      {Object.entries(playerPositions).map(([tileIdx, occupants]) => (
        <group key={tileIdx}>
          {occupants.map(({ player, idx }, offsetIdx) => (
            <PlayerToken
              key={player.id}
              player={player}
              isCurrentPlayer={idx === currentPlayerIndex}
              position={getTilePosition(parseInt(tileIdx))}
              offsetX={(offsetIdx - (occupants.length - 1) / 2) * 0.5}
              offsetZ={0}
              pieceId={pieceSelections[idx]}
            />
          ))}
        </group>
      ))}
    </group>
  );
}
