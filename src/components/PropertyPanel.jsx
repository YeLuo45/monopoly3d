import { useGameStore } from '../game/store';
import { BOARD_CONFIG } from '../game/boardConfig';
import { t, getTileName } from '../i18n';

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
      <div className="text-yellow-400 text-xs uppercase tracking-wider mb-2">🏠 {t('property_purchase')}</div>
      
      <div className="mb-4">
        <div className="text-white font-bold text-lg">{getTileName(tile)}</div>
        <div className="text-gray-400 text-sm">{t('price_label')}: ${tile.price}</div>
        <div className="text-gray-400 text-sm">{t('rent_label')}: ${tile.rent[0]}</div>
      </div>
      
      <div className="text-gray-300 text-sm mb-4">
        {t('your_cash')}: <span className="text-yellow-400 font-bold">${currentPlayer.money}</span>
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
          💰 {t('buy')}
        </button>
        <button
          onClick={passProperty}
          className="px-6 py-3 rounded-xl font-bold text-lg bg-gray-700 hover:bg-gray-600 text-white transition-all"
        >
          🚫 {t('skip_action')}
        </button>
      </div>
      
      {!canAfford && (
        <div className="mt-3 text-red-400 text-sm text-center">
          💸 {t('insufficient_funds')}
        </div>
      )}
    </div>
  );
}
