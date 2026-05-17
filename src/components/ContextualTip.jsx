import { useEffect } from 'react';
import { useGameStore } from '../game/store';
import { getTutorialStep } from '../game/strategyGuide';
import { t } from '../i18n';

/**
 * ContextualTip - Shows contextual strategy tips based on game state
 * Uses StrategyGuide tool registry for intelligent advice
 */
export default function ContextualTip() {
  const showContextualTip = useGameStore(s => s.showContextualTip);
  const currentTip = useGameStore(s => s.currentTip);
  const teacherMode = useGameStore(s => s.teacherMode);
  const tutorialStep = useGameStore(s => s.tutorialStep);
  const hideTip = useGameStore(s => s.hideTip);
  const advanceTutorial = useGameStore(s => s.advanceTutorial);
  const autoShowTip = useGameStore(s => s.autoShowTip);
  const currentPlayerIndex = useGameStore(s => s.currentPlayerIndex);
  const players = useGameStore(s => s.players);

  const currentPlayer = players[currentPlayerIndex];

  // Auto-show tip when teacher mode is on and phase changes
  useEffect(() => {
    if (teacherMode && !currentPlayer?.isAI) {
      autoShowTip();
    }
  }, [teacherMode, currentPlayerIndex]);

  // Don't show if teacher mode is off and no tip
  if (!teacherMode && !showContextualTip) return null;

  // Show tutorial overlay if tutorial is active
  if (tutorialStep > 0 && currentPlayer && !currentPlayer.isAI) {
    const tutorial = getTutorialStep(currentPlayer, tutorialStep);
    return (
      <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
        <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-2xl p-6 max-w-md shadow-2xl border border-indigo-500/50">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">🎯</span>
            <div>
              <div className="text-xs text-indigo-300">新手指引 {tutorial.step}/5</div>
              <h3 className="text-xl font-bold text-white">{tutorial.title}</h3>
            </div>
          </div>
          <p className="text-indigo-200 mb-6 leading-relaxed">{tutorial.content}</p>
          <div className="flex gap-3">
            <button
              onClick={() => hideTip()}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl font-bold transition-colors"
            >
              跳过引导
            </button>
            <button
              onClick={() => {
                const next = advanceTutorial();
                if (next === null) {
                  hideTip();
                }
              }}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white rounded-xl font-bold transition-colors"
            >
              {tutorialStep < 5 ? '下一步' : '完成'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show contextual strategy tip
  if (!showContextualTip || !currentTip) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 w-96 max-w-[90vw]">
      <div className="bg-gradient-to-r from-yellow-900/95 to-orange-900/95 rounded-xl p-4 shadow-xl border border-yellow-500/50 backdrop-blur-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h4 className="font-bold text-yellow-200 mb-1">{currentTip.title}</h4>
            <p className="text-yellow-100/90 text-sm leading-relaxed whitespace-pre-line">
              {currentTip.content}
            </p>
          </div>
          <button
            onClick={() => hideTip()}
            className="text-yellow-300/70 hover:text-yellow-200 text-xl leading-none"
          >
            ×
          </button>
        </div>
        {currentTip.data?.recommendation && (
          <div className="mt-3 pt-3 border-t border-yellow-500/30">
            <button
              onClick={() => hideTip()}
              className="w-full px-3 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 rounded-lg text-yellow-200 text-sm font-bold transition-colors"
            >
              我知道了
            </button>
          </div>
        )}
      </div>
    </div>
  );
}