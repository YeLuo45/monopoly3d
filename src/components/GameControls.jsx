import { useEffect } from 'react';
import { useGameStore } from '../game/store';
import { BOARD_CONFIG } from '../game/boardConfig';
import { t, getTileName } from '../i18n';

export default function GameControls() {
  const phase = useGameStore(s => s.phase);
  const rollDice = useGameStore(s => s.rollDice);
  const players = useGameStore(s => s.players);
  const currentPlayerIndex = useGameStore(s => s.currentPlayerIndex);
  const currentRound = useGameStore(s => s.currentRound);
  const diceRolling = useGameStore(s => s.diceRolling);
  const aiTurn = useGameStore(s => s.aiTurn);
  
  const currentPlayer = players[currentPlayerIndex];
  const tile = currentPlayer ? BOARD_CONFIG[currentPlayer.position] : null;
  
  const isAITurn = currentPlayer?.isAI;
  
  // Auto-trigger AI turn using effect
  useEffect(() => {
    if (isAITurn && phase === 'roll' && !diceRolling) {
      const timer = setTimeout(() => aiTurn(), 1500);
      return () => clearTimeout(timer);
    }
  }, [isAITurn, phase, diceRolling, aiTurn]);
  
  // Roll button only shown in roll phase for human players
  const showRollButton = phase === 'roll' && !isAITurn && !diceRolling;
  
  return (
    <div className="absolute top-1/2 right-4 -translate-y-1/2 flex flex-col gap-3 pointer-events-auto">
      {showRollButton && (
        <button
          onClick={rollDice}
          className="px-8 py-6 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 rounded-2xl shadow-2xl hover:scale-110 transition-all text-white font-black text-2xl animate-pulse"
        >
          🎲<br />
          <span className="text-sm font-bold">{t('roll_dice')}</span>
        </button>
      )}
      
      {diceRolling && (
        <div className="px-6 py-4 bg-gray-800/80 backdrop-blur-sm rounded-2xl text-center">
          <div className="text-3xl animate-bounce">🎲</div>
          <div className="text-white text-sm font-bold mt-1">{t('rolling')}</div>
        </div>
      )}
      
      {phase === 'tile_event' && tile?.type === 'property' && tile.owner === null && !isAITurn && (
        <div className="bg-black/60 backdrop-blur-sm rounded-xl p-4 text-center">
          <div className="text-white text-sm">{t('empty_land')}</div>
        </div>
      )}
      
      {phase === 'moving' && (
        <div className="px-6 py-4 bg-blue-900/60 backdrop-blur-sm rounded-2xl text-center">
          <div className="text-2xl animate-bounce">🚶</div>
          <div className="text-white text-sm font-bold mt-1">{t('moving')}</div>
        </div>
      )}
      
      {/* Player properties quick view */}
      {currentPlayer && currentPlayer.properties.length > 0 && (
        <div className="bg-black/60 backdrop-blur-sm rounded-xl p-3 w-48">
          <div className="text-gray-400 text-xs mb-2">{t('your_properties')}</div>
          <div className="flex flex-wrap gap-1">
            {currentPlayer.properties.map(propId => (
              <span
                key={propId}
                className="px-2 py-1 rounded text-xs font-bold text-white"
                style={{ backgroundColor: BOARD_CONFIG[propId]?.color || '#666' }}
              >
                {getTileName(BOARD_CONFIG[propId])}
              </span>
            ))}
          </div>
        </div>
      )}
      
      {/* Round indicator */}
      <div className="bg-black/60 backdrop-blur-sm rounded-xl p-3 text-center">
        <div className="text-gray-400 text-xs">{t('round_indicator')}</div>
        <div className="text-yellow-400 font-bold">{currentRound}/20</div>
      </div>
    </div>
  );
}
