import { useRef, useMemo } from 'react';
import { Text, RoundedBox, Cylinder } from '@react-three/drei';
import useEditorStore from './editorStore';
import { TILE_TYPES } from './editorTypes';
import { BOARD_THEMES } from '../game/themes';
import * as THREE from 'three';

function getTilePosition(index, boardSize) {
  const size = 14;
  const padding = 2.0;
  const innerSize = size - padding;
  const tilesPerSide = boardSize / 4;

  if (index < tilesPerSide) {
    const t = index / tilesPerSide;
    return [innerSize, 0.3, -innerSize + 2 * innerSize * t];
  } else if (index < tilesPerSide * 2) {
    const t = (index - tilesPerSide) / tilesPerSide;
    return [innerSize - 2 * innerSize * t, 0.3, -innerSize];
  } else if (index < tilesPerSide * 3) {
    const t = (index - tilesPerSide * 2) / tilesPerSide;
    return [-innerSize, 0.3, -innerSize + 2 * innerSize * t];
  } else {
    const t = (index - tilesPerSide * 3) / tilesPerSide;
    return [-innerSize + 2 * innerSize * t, 0.3, innerSize];
  }
}

function EditorTileMesh({ tile, position, index, isSelected, theme, onClick }) {
  const meshRef = useRef();
  const isQuestionTile = tile.type === TILE_TYPES.QUESTION;
  const isChanceTile = tile.type === TILE_TYPES.CHANCE;
  const isTaxTile = tile.type === TILE_TYPES.TAX;
  const isSpecial = tile.subtype && ['GO', 'JAIL', 'FREE_PARKING', 'GO_TO_JAIL'].includes(tile.subtype);

  const tileColor = useMemo(() => {
    if (tile.type === TILE_TYPES.PROPERTY) return tile.color || '#94A3B8';
    if (isQuestionTile) return theme.questionColor;
    if (isChanceTile) return theme.chanceColor;
    if (isTaxTile) return theme.taxColor;
    if (tile.subtype === 'GO') return theme.goColor;
    if (tile.subtype === 'JAIL') return theme.jailColor;
    if (tile.subtype === 'FREE_PARKING') return theme.freeParkingColor;
    if (tile.subtype === 'GO_TO_JAIL') return theme.goToJailColor;
    return '#6B7280';
  }, [tile, isQuestionTile, isChanceTile, isTaxTile]);

  const buildingColor = theme.buildingColors[index % theme.buildingColors.length];
  const roofColor = theme.roofColors[index % theme.roofColors.length];

  return (
    <group position={position}>
      {/* Selection highlight */}
      {isSelected && (
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[1.8, 1.0, 1.8]} />
          <meshBasicMaterial color="#FBBF24" transparent opacity={0.3} />
        </mesh>
      )}

      {/* Tile base */}
      <RoundedBox 
        args={[1.6, 0.35, 1.6]} 
        radius={0.1} 
        position={[0, 0, 0]} 
        castShadow 
        receiveShadow
        onClick={(e) => { e.stopPropagation(); onClick(index); }}
        ref={meshRef}
      >
        <meshStandardMaterial 
          color={tile.sideColor || theme.tileSideColor} 
          roughness={0.5} 
          metalness={0.05} 
        />
      </RoundedBox>

      {/* Tile top surface */}
      <mesh position={[0, 0.19, 0]} receiveShadow>
        <boxGeometry args={[1.4, 0.06, 1.4]} />
        <meshStandardMaterial color={theme.tileBaseColor} roughness={0.6} />
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

      {/* Type indicator */}
      {tile.type !== TILE_TYPES.PROPERTY && !isSpecial && (
        <Text
          position={[0, 0.35, 0.5]}
          rotation={[-Math.PI / 6, 0, 0]}
          fontSize={0.15}
          color={tileColor}
          anchorX="center"
          anchorY="middle"
        >
          {tile.type === TILE_TYPES.CHANCE ? '🎰' : 
           tile.type === TILE_TYPES.QUESTION ? '❓' : 
           tile.type === TILE_TYPES.TAX ? '💰' : ''}
        </Text>
      )}

      {/* Tile label */}
      <Text
        position={[0, 0.42, 0]}
        rotation={[-Math.PI / 6, 0, 0]}
        fontSize={0.18}
        color={theme.labelStyle.textColor}
        anchorX="center"
        anchorY="middle"
        maxWidth={1.3}
        fontWeight="bold"
        outlineWidth={0.025}
        outlineColor={theme.labelStyle.outlineColor}
        shadowOffsetX={0.02}
        shadowOffsetY={-0.02}
        shadowColor="#000000"
        shadowBlur={0.1}
      >
        {tile.name}
      </Text>

      {/* Price tag for properties */}
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

      {/* Building placeholder for properties */}
      {tile.type === TILE_TYPES.PROPERTY && !tile.owner && (
        <group position={[0, 0.5, 0]}>
          <mesh position={[0, 0.15, 0]} castShadow>
            <boxGeometry args={[0.2, 0.3, 0.2]} />
            <meshStandardMaterial color={buildingColor} roughness={0.4} metalness={0.1} />
          </mesh>
          <mesh position={[0, 0.4, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
            <coneGeometry args={[0.18, 0.2, 4]} />
            <meshStandardMaterial color={roofColor} roughness={0.5} metalness={0.05} />
          </mesh>
        </group>
      )}
    </group>
  );
}

function EditorBoardBase({ theme }) {
  return (
    <group>
      {/* Outer wooden border */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={[32, 0.5, 32]} />
        <meshStandardMaterial color={theme.boardColor} roughness={0.65} metalness={0.05} />
      </mesh>

      {/* Border trim */}
      <mesh position={[0, 0.18, 0]}>
        <boxGeometry args={[30, 0.1, 30]} />
        <meshStandardMaterial color={theme.boardBorderColor} roughness={0.6} />
      </mesh>

      {/* Inner playing surface */}
      <mesh position={[0, 0.22, 0]} receiveShadow>
        <boxGeometry args={[27, 0.12, 27]} />
        <meshStandardMaterial color={theme.feltColor} roughness={0.65} metalness={0.0} />
      </mesh>

      {/* Center decoration */}
      <group position={[0, 0.32, 0]}>
        <mesh>
          <cylinderGeometry args={[3, 3.2, 0.3, 8]} />
          <meshStandardMaterial color={theme.centerColor} roughness={0.4} metalness={0.1} />
        </mesh>
        <Text position={[0, 0.5, 0]} fontSize={0.6} color={theme.textColor} anchorX="center" anchorY="middle" fontWeight="bold">
          📝 编辑器
        </Text>
      </group>
    </group>
  );
}

export default function EditorBoard({ themeKey = 'classic' }) {
  const tiles = useEditorStore((s) => s.tiles);
  const boardSize = useEditorStore((s) => s.boardSize);
  const selectedTileIndex = useEditorStore((s) => s.selectedTileIndex);
  const selectTile = useEditorStore((s) => s.selectTile);
  const theme = BOARD_THEMES[themeKey] || BOARD_THEMES.classic;

  return (
    <group>
      <EditorBoardBase theme={theme} />
      {tiles.map((tile, i) => (
        <EditorTileMesh
          key={tile.id}
          tile={tile}
          index={i}
          position={getTilePosition(i, boardSize)}
          isSelected={selectedTileIndex === i}
          theme={theme}
          onClick={selectTile}
        />
      ))}
    </group>
  );
}
