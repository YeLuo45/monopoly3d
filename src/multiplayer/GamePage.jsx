/**
 * Online Game Page
 * 
 * Main game page with multiplayer integration.
 * Handles both local and online multiplayer games.
 */

import { useEffect, useState } from 'react';
import { useGameStore } from '../game/store';
import { useMultiplayerStore } from './multiplayerStore';
import GameBoard from '../components/GameBoard';
import GameControls from '../components/GameControls';
import HUD from '../components/HUD';
import MultiplayerHUD from './MultiplayerHUD';
import FloatingEffects from '../components/FloatingEffects';
import AudioControls from '../App'; // Import AudioControls from App

export default function GamePage({ isOnline = false }) {
  const [isMyTurn, setIsMyTurn] = useState(false);
  
  const {
    screen,
    players,
    currentPlayerIndex,
    phase,
    isMultiplayer,
    isHost,
    receiveState,
  } = useGameStore();
  
  const {
    currentRoom,
    players: onlinePlayers,
    playerId,
    onGameEvent,
    onGameStart,
  } = useMultiplayerStore();
  
  // Determine current player ID based on mode
  const currentPlayerId = isOnline 
    ? onlinePlayers[currentPlayerIndex]?.player_id 
    : players[currentPlayerIndex]?.id;
  
  // Check if it's local player's turn
  useEffect(() => {
    if (!isOnline) {
      const localPlayer = players.find(p => !p.isAI);
      setIsMyTurn(currentPlayerId === localPlayer?.id);
      return;
    }
    
    // Online mode: all human players share same ID format
    const myPlayer = onlinePlayers.find(p => p.isSelf);
    if (myPlayer) {
      setIsMyTurn(currentPlayerId === myPlayer.player_id);
    }
  }, [currentPlayerIndex, currentPlayerId, isOnline, players, onlinePlayers]);
  
  // Set up multiplayer callbacks
  useEffect(() => {
    if (!isOnline) return;
    
    // Handle game events from other players
    useMultiplayerStore.setState({
      onGameEvent: (event) => {
        console.log('[GamePage] Online game event:', event);
        
        // Process different event types
        switch (event.event_type) {
          case 'roll_dice':
            // Handle dice roll event
            if (event.payload.diceValues) {
              // Update dice values for animation
              useGameStore.setState({
                diceValues: event.payload.diceValues,
                phase: 'moving',
              });
            }
            break;
            
          case 'buy_property':
            // Handle property purchase
            break;
            
          case 'next_turn':
            // Move to next player's turn
            useGameStore.setState({
              currentPlayerIndex: (currentPlayerIndex + 1) % players.length,
              phase: 'roll',
            });
            break;
        }
      },
      
      onGameStart: () => {
        console.log('[GamePage] Online game starting!');
        // Transition to playing screen if not already there
        if (screen !== 'playing') {
          useGameStore.setState({ screen: 'playing' });
        }
      },
    });
  }, [isOnline, screen, currentPlayerIndex, players.length]);
  
  // Sync game state when receiving updates
  useEffect(() => {
    if (!isOnline) return;
    
    // The store handles this via subscription, but we can add
    // additional local state management here if needed
  }, [isOnline]);
  
  if (screen !== 'playing') {
    return null;
  }
  
  return (
    <div className="w-full h-screen overflow-hidden">
      {/* Audio Controls */}
      <AudioControls />
      
      {/* Regular HUD for local game */}
      {!isOnline && <HUD />}
      
      {/* Multiplayer HUD for online game */}
      {isOnline && (
        <MultiplayerHUD 
          currentPlayerIndex={currentPlayerIndex}
          isMyTurn={isMyTurn}
        />
      )}
      
      {/* Main Game Board */}
      <GameBoard />
      
      {/* Game Controls */}
      <GameControls isOnline={isOnline} isMyTurn={isMyTurn} />
      
      {/* Floating Effects */}
      <FloatingEffects />
    </div>
  );
}
