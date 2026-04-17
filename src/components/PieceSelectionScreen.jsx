import { useState } from 'react';
import { useGameStore } from '../game/store';

const PIECES = [
  {
    id: 0,
    name: '小汽车',
    emoji: '🚗',
    color: '#FF6B6B',
    shape: 'car',
    desc: '速度感十足',
  },
  {
    id: 1,
    name: '小狗狗',
    emoji: '🐶',
    color: '#4ECDC4',
    shape: 'dog',
    desc: '忠诚可爱',
  },
  {
    id: 2,
    name: '小猫咪',
    emoji: '🐱',
    color: '#45B7D1',
    shape: 'cat',
    desc: '灵活敏捷',
  },
  {
    id: 3,
    name: '陀螺',
    emoji: '🎯',
    color: '#96CEB4',
    shape: 'top',
    desc: '炫酷旋转',
  },
  {
    id: 4,
    name: '奥特曼',
    emoji: '🦸',
    color: '#C0C0C0',
    shape: 'ultraman',
    desc: '光之巨人',
  },
  {
    id: 5,
    name: '皮卡丘',
    emoji: '⚡',
    color: '#FFE135',
    shape: 'pikachu',
    desc: '电耗子',
  },
  {
    id: 6,
    name: '哆啦A梦',
    emoji: '🤖',
    color: '#00A5E0',
    shape: 'doraemon',
    desc: '机器猫',
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
      alert('请先选择你的棋子！');
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
      <h2 className="text-4xl font-bold mb-2 text-yellow-300">🎮 选择你的棋子</h2>
      <p className="text-purple-200 mb-8 text-center">
        共 {totalPlayers} 名玩家（{humanCount} 人类 + {aiCount} AI）
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

              <div className="font-bold text-lg">{piece.name}</div>
              <div className="text-sm text-gray-400">{piece.desc}</div>

              {isHumanSelected && (
                <div className="absolute -top-2 -right-2 bg-yellow-400 text-black text-xs font-bold px-2 py-1 rounded-full">
                  👤 你
                </div>
              )}
              {isAiSelected && !isHumanSelected && (
                <div className="absolute -top-2 -right-2 bg-gray-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                  🤖 AI
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
            ✅ 已选择：{PIECES.find(p => p.id === selections[0])?.emoji}{' '}
            {humanPieceLocked ? '— 等待其他玩家...' : '— 点击下方确认'}
          </p>
        ) : (
          <p className="text-yellow-300 text-lg">👆 请点击选择你的棋子</p>
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
            {selections[0] !== undefined ? '🚀 确认并开始游戏' : '选择棋子后开始'}
          </button>
        )}
        {humanPieceLocked && (
          <div className="flex items-center gap-3 text-xl text-purple-200">
            <span className="animate-pulse">🎲 正在准备游戏...</span>
          </div>
        )}
      </div>
    </div>
  );
}
