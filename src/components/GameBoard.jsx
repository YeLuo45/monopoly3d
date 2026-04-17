import { useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useGameStore } from '../game/store';
import Board from './3d/Board';
import Dice from './3d/Dice';
import Players from './3d/Players';
import MoveAnimator from './3d/MoveAnimator';
import HUD from './HUD';
import QuestionModal from './QuestionModal';
import PropertyPanel from './PropertyPanel';
import GameControls from './GameControls';
import * as THREE from 'three';

// Board tile positions — must match Board.jsx and Players.jsx (36 tiles, 9 per side)
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

// Smooth camera that follows the current player during movement
function CameraController() {
  const { camera } = useThree();

  // Persistent camera position/target using refs (not React state — avoids re-renders)
  const camPosRef = useRef(new THREE.Vector3(0, 18, 14));
  const targetLookRef = useRef(new THREE.Vector3(0, 0, 0));

  useFrame(() => {
    const state = useGameStore.getState();
    const { phase, currentPlayerIndex, players, movingPath, animationStep } = state;
    const currentPlayer = players[currentPlayerIndex];
    if (!currentPlayer) return;

    let targetTilePos;
    if (phase === 'moving' && movingPath.length > 0) {
      const stepPos = Math.min(animationStep, movingPath.length - 1);
      targetTilePos = getTilePosition(movingPath[stepPos]);
    } else {
      targetTilePos = getTilePosition(currentPlayer.position);
    }

    // Camera offset: slightly above and toward camera direction, relative to target tile
    const desiredCam = new THREE.Vector3(targetTilePos[0] + 2, 18, targetTilePos[2] + 12);
    const desiredLook = new THREE.Vector3(targetTilePos[0], 0, targetTilePos[2]);

    // Faster follow during movement, gentle return to default when idle
    const lerpFactor = phase === 'moving' ? 0.07 : 0.03;

    camPosRef.current.lerp(desiredCam, lerpFactor);
    targetLookRef.current.lerp(desiredLook, lerpFactor * 1.5);

    camera.position.copy(camPosRef.current);
    camera.lookAt(targetLookRef.current);
  });

  return null;
}

export default function GameBoard() {
  const phase = useGameStore(s => s.phase);
  const currentQuestion = useGameStore(s => s.currentQuestion);
  const players = useGameStore(s => s.players);
  const currentPlayerIndex = useGameStore(s => s.currentPlayerIndex);
  
  return (
    <div className="relative w-full h-full">
      {/* 3D Canvas */}
      <Canvas camera={{ position: [0, 18, 14], fov: 45 }} shadows>
        {/* Brighter ambient — cartoon style needs well-lit scene */}
        <ambientLight intensity={1.2} color="#fff8f0" />
        
        {/* Warm sunlight from upper right */}
        <directionalLight
          position={[12, 22, 10]}
          intensity={1.8}
          color="#fff5e0"
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={60}
          shadow-camera-left={-20}
          shadow-camera-right={20}
          shadow-camera-top={20}
          shadow-camera-bottom={-20}
        />
        
        {/* Soft fill light from left — cool blue tint */}
        <pointLight position={[-12, 12, -8]} intensity={0.6} color="#a0d8ef" />
        
        {/* Warm fill from below-front — gives nice cartoon bounce */}
        <pointLight position={[0, 4, 14]} intensity={0.4} color="#ffe4b5" />
        
        <Board />
        <Players />
        <Dice />
        <MoveAnimator />
        <CameraController />
        
        <OrbitControls
          enablePan={false}
          minDistance={10}
          maxDistance={35}
          minPolarAngle={0.2}
          maxPolarAngle={Math.PI / 2.2}
        />
      </Canvas>
      
      {/* HUD Overlay */}
      <HUD />
      
      {/* Game Controls */}
      <GameControls />
      
      {/* Property Panel (when on buy_property phase) */}
      {phase === 'buy_property' && <PropertyPanel />}
      
      {/* Question Modal */}
      {currentQuestion && <QuestionModal />}
    </div>
  );
}
