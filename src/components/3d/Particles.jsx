import { useRef, useEffect, useState } from 'react';
import { Sparkles } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../../game/store';
import * as THREE from 'three';

// Particle effect for property purchase - green sparkles burst
export function PurchaseParticles({ position, active }) {
  const groupRef = useRef();
  const [scale, setScale] = useState(0);

  useEffect(() => {
    if (active) {
      setScale(1);
      const timer = setTimeout(() => setScale(0), 1500);
      return () => clearTimeout(timer);
    }
  }, [active]);

  useFrame(({ clock }) => {
    if (groupRef.current && active) {
      const t = clock.elapsedTime;
      groupRef.current.rotation.y = t * 2;
    }
  });

  if (!active || scale === 0) return null;

  return (
    <group ref={groupRef} position={position} scale={scale}>
      <Sparkles
        count={30}
        scale={3}
        size={6}
        position={[0, 0.5, 0]}
        color="#50fa7b"
        speed={0.5}
        noise={0.5}
        lifetime={1.2}
      />
      <Sparkles
        count={15}
        scale={2}
        size={4}
        position={[0, 0.8, 0]}
        color="#ffd700"
        speed={0.8}
        noise={0.3}
        lifetime={1}
      />
    </group>
  );
}

// Particle effect for correct answer - green rising particles
export function CorrectParticles({ position, active }) {
  const groupRef = useRef();
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    if (active) {
      setOpacity(1);
      const timer = setTimeout(() => setOpacity(0), 1200);
      return () => clearTimeout(timer);
    }
  }, [active]);

  useFrame(({ clock }) => {
    if (groupRef.current && active) {
      const t = clock.elapsedTime;
      groupRef.current.position.y = position[1] + t * 0.8;
    }
  });

  if (!active || opacity === 0) return null;

  return (
    <group ref={groupRef} position={position}>
      <Sparkles
        count={20}
        scale={2}
        size={4}
        position={[0, 0, 0]}
        color="#00ff00"
        speed={0.8}
        noise={0.4}
        lifetime={1}
        opacity={opacity}
      />
      <Sparkles
        count={10}
        scale={1.5}
        size={3}
        position={[0, 0.3, 0]}
        color="#7fff00"
        speed={1}
        noise={0.2}
        lifetime={0.8}
        opacity={opacity}
      />
    </group>
  );
}

// Particle effect for wrong answer - red falling particles
export function WrongParticles({ position, active }) {
  const groupRef = useRef();
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    if (active) {
      setOpacity(1);
      const timer = setTimeout(() => setOpacity(0), 1200);
      return () => clearTimeout(timer);
    }
  }, [active]);

  useFrame(({ clock }) => {
    if (groupRef.current && active) {
      const t = clock.elapsedTime;
      groupRef.current.position.y = position[1] - t * 0.5;
    }
  });

  if (!active || opacity === 0) return null;

  return (
    <group ref={groupRef} position={position}>
      <Sparkles
        count={20}
        scale={2}
        size={4}
        position={[0, 0, 0]}
        color="#ff0000"
        speed={0.3}
        noise={0.5}
        lifetime={1}
        opacity={opacity}
      />
      <Sparkles
        count={10}
        scale={1.5}
        size={3}
        position={[0, -0.3, 0]}
        color="#ff4444"
        speed={0.4}
        noise={0.3}
        lifetime={0.8}
        opacity={opacity}
      />
    </group>
  );
}

// Particle effect for building - brick burst
export function BuildParticles({ position, active }) {
  const groupRef = useRef();
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    if (active) {
      setOpacity(1);
      const timer = setTimeout(() => setOpacity(0), 1000);
      return () => clearTimeout(timer);
    }
  }, [active]);

  if (!active || opacity === 0) return null;

  return (
    <group ref={groupRef} position={position}>
      <Sparkles
        count={25}
        scale={2}
        size={5}
        position={[0, 0.2, 0]}
        color="#f97316"
        speed={0.7}
        noise={0.6}
        lifetime={0.9}
        opacity={opacity}
      />
      <Sparkles
        count={15}
        scale={1.5}
        size={3}
        position={[0, 0.4, 0]}
        color="#fbbf24"
        speed={0.9}
        noise={0.4}
        lifetime={0.7}
        opacity={opacity}
      />
    </group>
  );
}

// Win celebration particles
export function WinParticles({ position, active }) {
  const groupRef = useRef();

  useFrame(({ clock }) => {
    if (groupRef.current && active) {
      const t = clock.elapsedTime;
      groupRef.current.rotation.y = t * 1.5;
    }
  });

  if (!active) return null;

  return (
    <group ref={groupRef} position={position}>
      <Sparkles
        count={50}
        scale={4}
        size={8}
        position={[0, 1, 0]}
        color="#ffd700"
        speed={0.6}
        noise={0.7}
        lifetime={3}
      />
      <Sparkles
        count={30}
        scale={3}
        size={5}
        position={[0, 0.5, 0]}
        color="#ff6b6b"
        speed={0.8}
        noise={0.5}
        lifetime={2.5}
      />
      <Sparkles
        count={30}
        scale={3}
        size={5}
        position={[0, 0.5, 0]}
        color="#4ecdc4"
        speed={0.7}
        noise={0.5}
        lifetime={2.5}
      />
    </group>
  );
}

// Manager component that listens to game events and triggers particles
export function ParticleManager({ position = [0, 0.5, 0] }) {
  const [purchaseActive, setPurchaseActive] = useState(false);
  const [correctActive, setCorrectActive] = useState(false);
  const [wrongActive, setWrongActive] = useState(false);
  const [buildActive, setBuildActive] = useState(false);
  const [winActive, setWinActive] = useState(false);
  const [prevMoney, setPrevMoney] = useState({});
  const [prevQuestion, setPrevQuestion] = useState(null);

  useEffect(() => {
    const unsubscribe = useGameStore.subscribe((state, prevState) => {
      const currentPlayer = state.players[state.currentPlayerIndex];
      const prevPlayer = prevState.players[state.currentPlayerIndex];

      // Detect property purchase (money decreased, properties increased)
      if (currentPlayer && prevPlayer) {
        // Check if properties increased (purchase happened)
        if (currentPlayer.properties.length > prevPlayer.properties.length) {
          setPurchaseActive(true);
          setTimeout(() => setPurchaseActive(false), 1500);
        }

        // Detect question answer
        if (state.questionAnswered !== null && prevState.questionAnswered === null) {
          if (state.questionAnswered === 'correct') {
            setCorrectActive(true);
            setTimeout(() => setCorrectActive(false), 1200);
          } else {
            setWrongActive(true);
            setTimeout(() => setWrongActive(false), 1200);
          }
        }
      }

      // Detect build house
      const boardConfig = state.players[state.currentPlayerIndex]?.properties;
      const prevBoard = prevState.players[prevState.currentPlayerIndex]?.properties;
      if (boardConfig && prevBoard) {
        // Simplified - would need more state tracking for build detection
      }

      // Detect win
      if (state.winner && !prevState.winner) {
        setWinActive(true);
        setTimeout(() => setWinActive(false), 3000);
      }
    });

    return unsubscribe;
  }, []);

  return (
    <group>
      <PurchaseParticles position={position} active={purchaseActive} />
      <CorrectParticles position={position} active={correctActive} />
      <WrongParticles position={position} active={wrongActive} />
      <BuildParticles position={position} active={buildActive} />
      <WinParticles position={position} active={winActive} />
    </group>
  );
}

export default {
  PurchaseParticles,
  CorrectParticles,
  WrongParticles,
  BuildParticles,
  WinParticles,
  ParticleManager,
};
