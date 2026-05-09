import { useState } from 'react';
import { useGameStore } from '../game/store';
import { t } from '../i18n';

const PIECES = [
  {
    id: 0,
    nameKey: 'piece_car',
    descKey: 'piece_car_desc',
    emoji: '🚗',
    color: '#FF6B6B',
    shape: 'car',
  },
  {
    id: 1,
    nameKey: 'piece_dog',
    descKey: 'piece_dog_desc',
    emoji: '🐶',
    color: '#4ECDC4',
    shape: 'dog',
  },
  {
    id: 2,
    nameKey: 'piece_cat',
    descKey: 'piece_cat_desc',
    emoji: '🐱',
    color: '#45B7D1',
    shape: 'cat',
  },
  {
    id: 3,
    nameKey: 'piece_top',
    descKey: 'piece_top_desc',
    emoji: '🎯',
    color: '#96CEB4',
    shape: 'top',
  },
  {
    id: 4,
    nameKey: 'piece_ultraman',
    descKey: 'piece_ultraman_desc',
    emoji: '🦸',
    color: '#C0C0C0',
    shape: 'ultraman',
  },
  {
    id: 5,
    nameKey: 'piece_pikachu',
    descKey: 'piece_pikachu_desc',
    emoji: '⚡',
    color: '#FFE135',
    shape: 'pikachu',
  },
  {
    id: 6,
    nameKey: 'piece_doraemon',
    descKey: 'piece_doraemon_desc',
    emoji: '🤖',
    color: '#00A5E0',
    shape: 'doraemon',
  },
];

export default function PieceSelectionScreen() {
  const humanCount = useGameStore(s => s.humanCount);
  const aiCount = useGameStore(s => s.aiCount);
  const setPieceSelection = useGameStore(s => s.setPieceSelection);

  const totalPlayers = humanCount + aiCount;
  const [selections, setSelections] = useState({});
  const [humanPieceLocked, setHumanPieceLocked] = useState(false);

  const handlePieceClick = (pieceId) => {
    // Don't allow changing after human locks
    if (humanPieceLocked) return;
    // Toggle human piece selection (human is always index 0)
    if (selections[0] === pieceId) {
      const newSel = { ...selections };
      delete newSel[0];
      setSelections(newSel);
    } else {
      setSelections({ ...selections, 0: pieceId });
    }
  };

  const handleLockIn = () => {
    if (selections[0] === undefined) {
      alert(t('please_select_first'));
      return;
    }
    setHumanPieceLocked(true);

    // Build the complete selection map synchronously (avoids stale state)
    const finalSelections = { ...selections };
    const usedPieces = Object.values(finalSelections);
    for (let i = 1; i < totalPlayers; i++) {
      if (finalSelections[i] === undefined) {
        const available = PIECES.find(p => !usedPieces.includes(p.id));
        if (available !== undefined) {
          finalSelections[i] = available.id;
          usedPieces.push(available.id);
        }
      }
    }

    setSelections(finalSelections);

    // Start game with the complete, final selection map
    setTimeout(() => {
      setPieceSelection(finalSelections);
    }, 300);
  };

  const usedPieces = Object.values(selections);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-white p-6">
      <h2 className="text-4xl font-bold mb-2 text-yellow-300">🎮 {t('select_your_piece')}</h2>
      <p className="text-purple-200 mb-8 text-center">
        {t('total_players_info', { humanCount, aiCount, total: totalPlayers })}
      </p>

      {/* Piece grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 mb-10">
        {PIECES.map(piece => {
          const isUsed = usedPieces.includes(piece.id);
          const isHumanSelected = selections[0] === piece.id;
          const isAiSelected = Object.entries(selections)
            .filter(([k]) => parseInt(k) > 0)
            .some(([, v]) => v === piece.id);

          return (
            <button
              key={piece.id}
              onClick={() => handlePieceClick(piece.id)}
              className={`
                relative flex flex-col items-center p-6 rounded-2xl transition-all
                ${isHumanSelected
                  ? 'bg-yellow-500/30 ring-4 ring-yellow-400 scale-105'
                  : isUsed
                    ? 'bg-gray-700/50 opacity-50'
                    : humanPieceLocked
                      ? 'bg-gray-800/50 cursor-not-allowed'
                      : 'bg-gray-800/80 hover:bg-gray-700/80 hover:scale-105 cursor-pointer'
                }
              `}
              disabled={isUsed && !isHumanSelected}
            >
              {/* Color indicator */}
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-5xl mb-3"
                style={{ backgroundColor: piece.color + '33', border: `3px solid ${piece.color}` }}
              >
                {piece.emoji}
              </div>

              <div className="font-bold text-lg">{t(piece.nameKey)}</div>
              <div className="text-sm text-gray-400">{t(piece.descKey)}</div>

              {isHumanSelected && (
                <div className="absolute -top-2 -right-2 bg-yellow-400 text-black text-xs font-bold px-2 py-1 rounded-full">
                  👤 {t('you_label')}
                </div>
              )}
              {isAiSelected && !isHumanSelected && (
                <div className="absolute -top-2 -right-2 bg-gray-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                  🤖 {t('piece_already_selected')}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Status */}
      <div className="mb-8 text-center">
        {selections[0] !== undefined ? (
          <p className="text-green-400 text-lg">
            ✅ {t('piece_selected')}：{PIECES.find(p => p.id === selections[0])?.emoji}{' '}
            {humanPieceLocked ? t('waiting_for_others') : t('click_to_confirm')}
          </p>
        ) : (
          <p className="text-yellow-300 text-lg">👆 {t('please_select_piece')}</p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-4">
        {!humanPieceLocked && (
          <button
            onClick={handleLockIn}
            disabled={selections[0] === undefined}
            className={`
              px-10 py-4 rounded-xl font-bold text-xl transition-all shadow-lg
              ${selections[0] !== undefined
                ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:scale-105'
                : 'bg-gray-600 cursor-not-allowed opacity-50'
              }
            `}
          >
            {selections[0] !== undefined ? t('confirm_and_start') : t('select_piece_to_start')}
          </button>
        )}
        {humanPieceLocked && (
          <div className="flex items-center gap-3 text-xl text-purple-200">
            <span className="animate-pulse">🎲 {t('preparing_game')}</span>
          </div>
        )}
      </div>
    </div>
  );
}
