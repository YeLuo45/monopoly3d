import { useGameStore } from '../game/store';
import { BOARD_CONFIG } from '../game/boardConfig';

export default function HUD() {
  const players = useGameStore(s => s.players);
  const currentPlayerIndex = useGameStore(s => s.currentPlayerIndex);
  const currentRound = useGameStore(s => s.currentRound);
  const phase = useGameStore(s => s.phase);
  const diceValues = useGameStore(s => s.diceValues);
  const teacherMode = useGameStore(s => s.teacherMode);
  const saveGame = useGameStore(s => s.saveGame);
  const goToMenu = useGameStore(s => s.goToMenu);
  
  const currentPlayer = players[currentPlayerIndex];
  const currentTile = currentPlayer ? BOARD_CONFIG[currentPlayer.position] : null;
  
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Top bar - game info */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-purple-700/80 via-blue-700/80 to-purple-700/80 backdrop-blur-sm p-3 flex justify-between items-center border-b-2 border-yellow-400/40">
        <div className="flex items-center gap-4">
          <div className="text-white font-bold text-lg">
            第 <span className="text-yellow-400">{currentRound}</span> 回合 / 20
          </div>
          {phase === 'roll' && (
            <div className="text-gray-300 text-sm">
              当前: <span className="text-white font-bold">{currentPlayer?.name}</span>
              {' '}<span className="text-xs">(回合 {currentPlayer?.isAI ? '🤖' : '👤'})</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2 pointer-events-auto">
          {!teacherMode && (
            <button
              onClick={saveGame}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-bold text-white"
            >
              💾 存档
            </button>
          )}
          <button
            onClick={goToMenu}
            className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded-lg text-sm font-bold text-white"
          >
            🏠 退出
          </button>
        </div>
      </div>
      
      {/* Player panels - left side */}
      <div className="absolute left-3 top-20 flex flex-col gap-2">
        {players.map((player, idx) => (
          <div
            key={player.id}
            className={`px-4 py-2 rounded-xl backdrop-blur-sm border-2 transition-all ${
              idx === currentPlayerIndex
                ? 'bg-' + player.color + '/30 border-yellow-400'
                : 'bg-black/40 border-transparent'
            }`}
            style={{
              borderColor: idx === currentPlayerIndex ? '#fbbf24' : 'transparent',
              background: idx === currentPlayerIndex ? player.color + '50' : 'rgba(0,0,0,0.5)',
            }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: player.color }}
              />
              <span className="text-white font-bold text-sm">{player.name}</span>
              {player.isAI && <span className="text-xs">🤖</span>}
              {player.isBankrupt && <span className="text-xs text-red-400">破产</span>}
            </div>
            <div className="text-yellow-400 font-bold text-lg">
              ${player.money.toLocaleString()}
            </div>
            {player.properties.length > 0 && (
              <div className="text-xs text-gray-300">
                房产: {player.properties.length}
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Dice display */}
      {diceValues && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-700/80 to-blue-700/80 backdrop-blur-sm rounded-2xl px-8 py-4 flex items-center gap-6 border-2 border-yellow-400/50">
          <div className="text-6xl font-bold text-white">
            [{diceValues[0]}]
          </div>
          <div className="text-4xl text-gray-400">+</div>
          <div className="text-6xl font-bold text-white">
            [{diceValues[1]}]
          </div>
          <div className="text-4xl text-yellow-400 font-bold">
            = {diceValues[0] + diceValues[1]}
          </div>
        </div>
      )}
      
      {/* Current tile info */}
      {currentTile && phase !== 'moving' && phase !== 'question' && (
        <div className="absolute bottom-20 right-4 bg-black/60 backdrop-blur-sm rounded-xl px-4 py-3">
          <div className="text-xs text-gray-400 mb-1">当前位置</div>
          <div className="text-white font-bold">{currentTile.name}</div>
          <div className="text-xs text-gray-300">
            {currentTile.type === 'property'
              ? `租金: $${currentTile.rent[0]}`
              : currentTile.type === 'tax'
              ? `税金: -$${currentTile.amount}`
              : currentTile.type === 'question'
              ? '📝 知识问答'
              : currentTile.type === 'chance'
              ? '🎰 机会/命运'
              : currentTile.subtype || currentTile.type}
          </div>
        </div>
      )}
    </div>
  );
}
