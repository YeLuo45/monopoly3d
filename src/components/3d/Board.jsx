import { useRef, useMemo } from 'react';
import { Text, RoundedBox, Cylinder } from '@react-three/drei';
import { BOARD_CONFIG, BOARD_SIZE, TILE_TYPES } from '../../game/boardConfig';
import * as THREE from 'three';

// 36 tiles on a rounded-square loop: 9 per side
function getTilePosition(index) {
  const size = 14;
  const padding = 2.0;
  const innerSize = size - padding;
  const segmentLen = innerSize / 9;

  if (index < 9) {
    // Top: rightward
    const t = index / 9;
    return [innerSize, 0.3, -innerSize + 2 * innerSize * t];
  } else if (index < 18) {
    // Right: downward
    const t = (index - 9) / 9;
    return [innerSize - 2 * innerSize * t, 0.3, -innerSize];
  } else if (index < 27) {
    // Bottom: leftward
    const t = (index - 18) / 9;
    return [-innerSize, 0.3, -innerSize + 2 * innerSize * t];
  } else {
    // Left: upward
    const t = (index - 27) / 9;
    return [-innerSize + 2 * innerSize * t, 0.3, innerSize];
  }
}

// Vibrant color palette for buildings
const BUILDING_COLORS = [
  '#FF6B6B', '#FF8C00', '#FFD700', '#22C55E',
  '#3B82F6', '#8B5CF6', '#EC4899', '#F97316',
  '#06B6D4', '#84CC16', '#E11D48', '#7C3AED',
];
const ROOF_COLORS = [
  '#DC2626', '#B45309', '#D97706', '#15803D',
  '#1D4ED8', '#6D28D9', '#BE185D', '#C2410C',
  '#0891B2', '#4D7C0F', '#9F1239', '#5B21B6',
];

function CartoonBuilding({ color, roofColor, index }) {
  // Vary building shapes based on index
  const variant = index % 4;
  const height = 0.3 + (index % 3) * 0.15;
  const width = 0.18 + (index % 2) * 0.04;

  return (
    <group>
      {/* Building body */}
      <mesh position={[0, 0.15 + height / 2, 0]} castShadow>
        <boxGeometry args={[width, height, width]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.1} />
      </mesh>

      {/* Roof type varies by variant */}
      {variant === 0 && (
        // Peaked roof
        <mesh position={[0, 0.15 + height + 0.12, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
          <coneGeometry args={[width * 0.75, 0.22, 4]} />
          <meshStandardMaterial color={roofColor} roughness={0.5} metalness={0.05} />
        </mesh>
      )}
      {variant === 1 && (
        // Flat roof with parapet
        <mesh position={[0, 0.15 + height + 0.03, 0]} castShadow>
          <boxGeometry args={[width * 1.1, 0.06, width * 1.1]} />
          <meshStandardMaterial color={roofColor} roughness={0.5} metalness={0.05} />
        </mesh>
      )}
      {variant === 2 && (
        // Dome roof
        <mesh position={[0, 0.15 + height + 0.1, 0]} castShadow>
          <sphereGeometry args={[width * 0.6, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={roofColor} roughness={0.4} metalness={0.1} />
        </mesh>
      )}
      {variant === 3 && (
        // Pyramid roof
        <mesh position={[0, 0.15 + height + 0.1, 0]} castShadow>
          <coneGeometry args={[width * 0.7, 0.2, 4]} />
          <meshStandardMaterial color={roofColor} roughness={0.5} metalness={0.05} />
        </mesh>
      )}

      {/* Door */}
      <mesh position={[0, 0.08, width / 2 + 0.005]} castShadow>
        <boxGeometry args={[width * 0.4, 0.16, 0.01]} />
        <meshStandardMaterial color="#78350F" roughness={0.7} />
      </mesh>

      {/* Window left */}
      <mesh position={[-width * 0.25, 0.15 + height * 0.5, width / 2 + 0.005]} castShadow>
        <boxGeometry args={[width * 0.28, width * 0.28, 0.01]} />
        <meshStandardMaterial
          color="#BAE6FD" roughness={0.1} metalness={0.2}
          emissive="#BAE6FD" emissiveIntensity={0.35}
        />
      </mesh>

      {/* Window right */}
      <mesh position={[width * 0.25, 0.15 + height * 0.5, width / 2 + 0.005]} castShadow>
        <boxGeometry args={[width * 0.28, width * 0.28, 0.01]} />
        <meshStandardMaterial
          color="#BAE6FD" roughness={0.1} metalness={0.2}
          emissive="#BAE6FD" emissiveIntensity={0.35}
        />
      </mesh>

      {/* Chimney / vent (decorative) */}
      <mesh position={[width * 0.25, 0.15 + height + 0.05, -width * 0.2]} castShadow>
        <boxGeometry args={[0.04, 0.1, 0.04]} />
        <meshStandardMaterial color="#6B7280" roughness={0.6} />
      </mesh>
    </group>
  );
}

function CartoonHotel({ color }) {
  return (
    <group>
      {/* Hotel body */}
      <mesh position={[0, 0.4, 0]} castShadow>
        <boxGeometry args={[0.38, 0.8, 0.38]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.15} />
      </mesh>
      {/* Roof */}
      <mesh position={[0, 0.85, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[0.32, 0.25, 4]} />
        <meshStandardMaterial color="#B91C1C" roughness={0.5} />
      </mesh>
      {/* Windows rows */}
      {[-0.1, 0.05, 0.2, 0.35].map((y, i) => (
        <group key={i}>
          <mesh position={[-0.12, y, 0.195]} castShadow>
            <boxGeometry args={[0.1, 0.09, 0.01]} />
            <meshStandardMaterial color="#FEF08A" emissive="#FEF08A" emissiveIntensity={0.4} roughness={0.1} />
          </mesh>
          <mesh position={[0.12, y, 0.195]} castShadow>
            <boxGeometry args={[0.1, 0.09, 0.01]} />
            <meshStandardMaterial color="#FEF08A" emissive="#FEF08A" emissiveIntensity={0.4} roughness={0.1} />
          </mesh>
        </group>
      ))}
      {/* Sign */}
      <mesh position={[0, 0.95, 0]}>
        <boxGeometry args={[0.24, 0.1, 0.03]} />
        <meshStandardMaterial color="#FBBF24" roughness={0.3} />
      </mesh>
    </group>
  );
}

function TileMesh({ tile, position, index }) {
  const isQuestionTile = tile.type === TILE_TYPES.QUESTION;
  const isChanceTile = tile.type === TILE_TYPES.CHANCE;
  const isTaxTile = tile.type === TILE_TYPES.TAX;
  const isSpecial = ['GO', 'JAIL', 'FREE_PARKING', 'GO_TO_JAIL'].includes(tile.subtype);

  const tileColor = useMemo(() => {
    if (tile.type === TILE_TYPES.PROPERTY) return tile.color || '#94A3B8';
    if (isQuestionTile) return '#10B981';
    if (isChanceTile) return '#F59E0B';
    if (isTaxTile) return '#EF4444';
    if (tile.subtype === 'GO') return '#22C55E';
    if (tile.subtype === 'JAIL') return '#F97316';
    if (tile.subtype === 'FREE_PARKING') return '#3B82F6';
    if (tile.subtype === 'GO_TO_JAIL') return '#DC2626';
    return '#6B7280';
  }, [tile, isQuestionTile, isChanceTile, isTaxTile]);

  const buildingColor = BUILDING_COLORS[index % BUILDING_COLORS.length];
  const roofColor = ROOF_COLORS[index % ROOF_COLORS.length];

  return (
    <group position={position}>
      {/* Tile base */}
      <RoundedBox args={[1.6, 0.35, 1.6]} radius={0.1} position={[0, 0, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={tileColor} roughness={0.5} metalness={0.05} />
      </RoundedBox>

      {/* Tile top surface */}
      <mesh position={[0, 0.19, 0]} receiveShadow>
        <boxGeometry args={[1.4, 0.06, 1.4]} />
        <meshStandardMaterial color="#FFFBEB" roughness={0.6} />
      </mesh>

      {/* Color stripe for properties */}
      {tile.type === TILE_TYPES.PROPERTY && (
        <mesh position={[0, 0.23, -0.42]}>
          <boxGeometry args={[1.3, 0.09, 0.14]} />
          <meshStandardMaterial color={tile.color} roughness={0.4} metalness={0.1} />
        </mesh>
      )}

      {/* Special tile icon */}
      {isSpecial && (
        <Text
          position={[0, 0.5, 0]}
          rotation={[-Math.PI / 6, 0, 0]}
          fontSize={0.32}
          anchorX="center"
          anchorY="middle"
        >
          {tile.subtype === 'GO' ? '▶' :
           tile.subtype === 'JAIL' ? '🏠' :
           tile.subtype === 'FREE_PARKING' ? '☁' :
           tile.subtype === 'GO_TO_JAIL' ? '⚠' : ''}
        </Text>
      )}

      {/* Tile label */}
      <Text
        position={[0, 0.42, 0]}
        rotation={[-Math.PI / 6, 0, 0]}
        fontSize={0.18}
        color="#0f172a"
        anchorX="center"
        anchorY="middle"
        maxWidth={1.3}
        fontWeight="bold"
        outlineWidth={0.015}
        outlineColor="#ffffff"
      >
        {tile.name}
      </Text>

      {/* Price tag */}
      {tile.type === TILE_TYPES.PROPERTY && (
        <group position={[0, 0.44, 0.55]}>
          <mesh>
            <cylinderGeometry args={[0.12, 0.12, 0.05, 12]} rotation={[Math.PI / 2, 0, 0]} />
            <meshStandardMaterial color="#FCD34D" roughness={0.3} metalness={0.2} />
          </mesh>
          <Text position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.11} color="#78350F" anchorX="center" anchorY="middle">
            ${tile.price}
          </Text>
        </group>
      )}

      {/* Buildings for properties */}
      {tile.type === TILE_TYPES.PROPERTY && tile.houses === 0 && !tile.owner && (
        <group position={[0, 0.5, 0]}>
          <CartoonBuilding color={buildingColor} roofColor={roofColor} index={index} />
        </group>
      )}

      {/* Houses */}
      {tile.type === TILE_TYPES.PROPERTY && tile.houses > 0 && tile.houses < 4 && (
        <group position={[0, 0.5, 0]}>
          {Array.from({ length: tile.houses }).map((_, i) => (
            <group key={i} position={[(i - (tile.houses - 1) / 2) * 0.26, 0, 0]}>
              <CartoonBuilding color="#22C55E" roofColor="#15803D" index={i} />
            </group>
          ))}
        </group>
      )}

      {/* Hotel */}
      {tile.type === TILE_TYPES.PROPERTY && tile.houses >= 4 && (
        <group position={[0, 0.55, 0]}>
          <CartoonHotel color="#EF4444" />
        </group>
      )}

      {/* Owner indicator */}
      {tile.owner !== null && (
        <group position={[0, 0.24, 0]}>
          <mesh>
            <cylinderGeometry args={[0.2, 0.16, 0.08, 12]} />
            <meshStandardMaterial
              color={['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'][tile.owner % 4]}
              roughness={0.3} metalness={0.2}
            />
          </mesh>
          <mesh position={[0, 0.05, 0]}>
            <sphereGeometry args={[0.12, 10, 8]} />
            <meshStandardMaterial
              color={['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'][tile.owner % 4]}
              roughness={0.3} metalness={0.2}
            />
          </mesh>
        </group>
      )}
    </group>
  );
}

function BoardBase() {
  return (
    <group>
      {/* Outer wooden border */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={[32, 0.5, 32]} />
        <meshStandardMaterial color="#D97706" roughness={0.6} metalness={0.05} />
      </mesh>

      {/* Border trim */}
      <mesh position={[0, 0.18, 0]}>
        <boxGeometry args={[30, 0.1, 30]} />
        <meshStandardMaterial color="#B45309" roughness={0.5} />
      </mesh>

      {/* Inner bright green felt */}
      <mesh position={[0, 0.22, 0]} receiveShadow>
        <boxGeometry args={[27, 0.12, 27]} />
        <meshStandardMaterial color="#22C55E" roughness={0.7} metalness={0.0} />
      </mesh>

      {/* Grid pattern */}
      {[-10, -5, 0, 5, 10].map((offset) => (
        <group key={`grid-${offset}`}>
          <mesh position={[offset, 0.285, 0]} receiveShadow>
            <boxGeometry args={[0.04, 0.01, 27]} />
            <meshStandardMaterial color="#4ADE80" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.285, offset]} receiveShadow>
            <boxGeometry args={[27, 0.01, 0.04]} />
            <meshStandardMaterial color="#4ADE80" roughness={0.8} />
          </mesh>
        </group>
      ))}

      {/* Corner dots */}
      {[[-13, 0, -13], [13, 0, -13], [-13, 0, 13], [13, 0, 13]].map(([x, y, z], i) => (
        <mesh key={i} position={[x, 0.28, z]}>
          <cylinderGeometry args={[0.8, 0.8, 0.05, 16]} />
          <meshStandardMaterial
            color={['#FF6B6B', '#F59E0B', '#3B82F6', '#10B981'][i]}
            roughness={0.3} metalness={0.2}
          />
        </mesh>
      ))}

      {/* Center decoration */}
      <group position={[0, 0.32, 0]}>
        <mesh>
          <cylinderGeometry args={[3, 3.2, 0.3, 8]} />
          <meshStandardMaterial color="#7C3AED" roughness={0.4} metalness={0.1} />
        </mesh>
        <mesh position={[0, 0.2, 0]}>
          <cylinderGeometry args={[2.8, 2.8, 0.1, 8]} />
          <meshStandardMaterial color="#A78BFA" roughness={0.3} metalness={0.15} />
        </mesh>
        <Text position={[0, 0.5, 0]} fontSize={0.6} color="#FEF08A" anchorX="center" anchorY="middle" fontWeight="bold">
          🎲 MONOPOLY 🎲
        </Text>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <mesh key={i} position={[Math.cos(i * Math.PI / 3) * 2.2, 0.35, Math.sin(i * Math.PI / 3) * 2.2]}>
            <sphereGeometry args={[0.15, 8, 8]} />
            <meshStandardMaterial color="#FBBF24" emissive="#FBBF24" emissiveIntensity={0.3} roughness={0.2} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export default function Board() {
  return (
    <group>
      <BoardBase />
      {BOARD_CONFIG.map((tile, i) => (
        <TileMesh key={tile.id} tile={tile} index={i} position={getTilePosition(i)} />
      ))}
    </group>
  );
}
