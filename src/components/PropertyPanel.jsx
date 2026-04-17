import { useGameStore } from '../game/store';
import { BOARD_CONFIG } from '../game/boardConfig';

export default function PropertyPanel() {
  const players = useGameStore(s => s.players);
  const currentPlayerIndex = useGameStore(s => s.currentPlayerIndex);
  const buyProperty = useGameStore(s => s.buyProperty);
  const passProperty = useGameStore(s => s.passProperty);
  
  const currentPlayer = players[currentPlayerIndex];
  const tile = BOARD_CONFIG[currentPlayer.position];
  
  if (tile.type !== 'property' || tile.owner !== null) return null;
  
  const canAfford = currentPlayer.money >= tile.price;
  
  return (
    <div className="absolute bottom-20 right-4 bg-black/80 backdrop-blur-sm rounded-2xl p-6 w-72 border border-yellow-500/30">
      <div className="text-yellow-400 text-xs uppercase tracking-wider mb-2">🏠 地产购买</div>
      
      <div className="mb-4">
        <div className="text-white font-bold text-lg">{tile.name}</div>
        <div className="text-gray-400 text-sm">价格: ${tile.price}</div>
        <div className="text-gray-400 text-sm">租金: ${tile.rent[0]}</div>
      </div>
      
      <div className="text-gray-300 text-sm mb-4">
        你的现金: <span className="text-yellow-400 font-bold">${currentPlayer.money}</span>
      </div>
      
      <div className="flex flex-col gap-2">
        <button
          onClick={buyProperty}
          disabled={!canAfford}
          className={`px-6 py-3 rounded-xl font-bold text-lg transition-all ${
            canAfford
              ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:scale-105 text-white shadow-lg'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          💰 购买
        </button>
        <button
          onClick={passProperty}
          className="px-6 py-3 rounded-xl font-bold text-lg bg-gray-700 hover:bg-gray-600 text-white transition-all"
        >
          🚫 跳过
        </button>
      </div>
      
      {!canAfford && (
        <div className="mt-3 text-red-400 text-sm text-center">
          💸 现金不足，无法购买
        </div>
      )}
    </div>
  );
}
