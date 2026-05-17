import { useState } from 'react';
import { useGameStore } from '../game/store';
import { BOARD_CONFIG } from '../game/boardConfig';
import { t, getTileName } from '../i18n';

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
            {t('hud_round')} <span className="text-yellow-400">{currentRound}</span> {t('hud_round_of')} 20
          </div>
          {phase === 'roll' && (
            <div className="text-gray-300 text-sm">
              {t('hud_current')}: <span className="text-white font-bold">{currentPlayer?.name}</span>
              {' '}<span className="text-xs">({t('hud_turn')} {currentPlayer?.isAI ? '🤖' : '👤'})</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          {!teacherMode && (
            <button
              onClick={saveGame}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-bold text-white"
            >
              💾 {t('hud_save')}
            </button>
          )}
          <button
            onClick={goToMenu}
            className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded-lg text-sm font-bold text-white"
          >
            🏠 {t('hud_exit')}
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
              {player.isBankrupt && <span className="text-xs text-red-400">{t('hud_bankrupt')}</span>}
            </div>
            <div className="text-yellow-400 font-bold text-lg">
              ${player.money.toLocaleString()}
            </div>
            {player.properties.length > 0 && (
              <div className="text-xs text-gray-300">
                {t('hud_properties')}: {player.properties.length}
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

      {/* Current tile info - moved to left side, below player panels */}
      {currentTile && phase !== 'moving' && phase !== 'question' && (
        <div className="absolute left-3 bottom-4 bg-black/60 backdrop-blur-sm rounded-xl px-4 py-3 max-w-[200px]">
          <div className="text-xs text-gray-400 mb-1">{t('hud_current_position')}</div>
          <div className="text-white font-bold">{getTileName(currentTile)}</div>
          <div className="text-xs text-gray-300">
            {currentTile.type === 'property'
              ? `${t('hud_rent')}: $${currentTile.rent[0]}`
              : currentTile.type === 'tax'
              ? `${t('hud_tax')}: -$${currentTile.amount}`
              : currentTile.type === 'question'
              ? t('hud_question_tile')
              : currentTile.type === 'chance'
              ? t('hud_chance_tile')
              : currentTile.subtype || currentTile.type}
          </div>
        </div>
      )}

      {/* Emote Picker - moved to top-right, below top bar */}
      <div className="absolute top-16 right-4 pointer-events-auto">
        <EmotePicker />
      </div>
    </div>
  );
}

/**
 * EmotePicker - Quick emote selector for current player
 */
function EmotePicker() {
  const [open, setOpen] = useState(false);
  const currentPlayerIndex = useGameStore(s => s.currentPlayerIndex);
  const players = useGameStore(s => s.players);
  const sendEmote = useGameStore(s => s.sendEmote);

  const currentPlayer = players[currentPlayerIndex];
  const isHuman = currentPlayer && !currentPlayer.isAI;

  const EMOTES = ['😀', '😎', '😍', '🥳', '😤', '😭', '🤔', '🙄', '😴', '🤝'];

  if (!isHuman) return null;

  const handleEmote = (emote) => {
    sendEmote(currentPlayer.id, emote, { position: currentPlayer.position });
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-12 h-12 bg-purple-600 hover:bg-purple-500 rounded-full flex items-center justify-center text-2xl shadow-lg transition-transform hover:scale-110"
      >
        😀
      </button>

      {open && (
        <div className="absolute bottom-14 right-0 bg-gray-900/95 backdrop-blur-sm rounded-xl p-2 border border-purple-500/50 shadow-2xl">
          <div className="grid grid-cols-5 gap-1">
            {EMOTES.map((emote, i) => (
              <button
                key={i}
                onClick={() => handleEmote(emote)}
                className="w-10 h-10 hover:bg-purple-600 rounded-lg text-xl transition-colors"
              >
                {emote}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}