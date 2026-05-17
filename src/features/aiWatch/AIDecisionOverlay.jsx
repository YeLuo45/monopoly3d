/**
 * AIDecisionOverlay - Visual overlay showing AI decision-making process
 * 
 * Features:
 * - Floating panel showing current AI decision
 * - Decision options with scores
 * - Timer for ongoing decisions
 * - Toggle panel visibility
 */

import { useState, useEffect, useRef } from 'react';
import { useAIWatchStore, DECISION_TYPES, DECISION_PHASES } from './aiWatchStore';
import { AI_PERSONALITY } from '../../game/aiBrain.js';

const DECISION_TYPE_LABELS = {
  [DECISION_TYPES.PROPERTY_PURCHASE]: '购买地产',
  [DECISION_TYPES.BUILD_HOUSE]: '建造房屋',
  [DECISION_TYPES.TRADE_OFFER]: '交易提议',
  [DECISION_TYPES.AUCTION_BID]: '拍卖出价',
  [DECISION_TYPES.JAIL_DECISION]: '监狱决策',
  [DECISION_TYPES.MORTGAGE]: '抵押',
  [DECISION_TYPES.UNMORTGAGE]: '解除抵押',
};

const DECISION_TYPE_ICONS = {
  [DECISION_TYPES.PROPERTY_PURCHASE]: '🏠',
  [DECISION_TYPES.BUILD_HOUSE]: '🏗️',
  [DECISION_TYPES.TRADE_OFFER]: '🤝',
  [DECISION_TYPES.AUCTION_BID]: '🔨',
  [DECISION_TYPES.JAIL_DECISION]: '⛓️',
  [DECISION_TYPES.MORTGAGE]: '💰',
  [DECISION_TYPES.UNMORTGAGE]: '🔓',
};

export default function AIDecisionOverlay({ visible = true }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef(null);

  const {
    activeDecision,
    isWatchMode,
    isPaused,
    playbackSpeed,
    currentSessionDecisions,
    aiPlayerSnapshots,
    togglePause,
    setPlaybackSpeed,
    getPersonalityLabel,
    getDifficultyLabel,
    getFilteredDecisions,
    getPlayerDecisionSummary,
  } = useAIWatchStore();

  // Timer for active decision
  useEffect(() => {
    if (activeDecision && !isPaused) {
      timerRef.current = setInterval(() => {
        setElapsedTime(Date.now() - activeDecision.startTime);
      }, 100);
    } else {
      clearInterval(timerRef.current);
      setElapsedTime(0);
    }

    return () => clearInterval(timerRef.current);
  }, [activeDecision, isPaused]);

  if (!visible || !isWatchMode) return null;

  const formatTime = (ms) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const filteredDecisions = getFilteredDecisions();
  const recentDecisions = filteredDecisions.slice(-5);

  return (
    <div className="absolute top-4 right-4 z-30 w-80">
      {/* Header */}
      <div className="bg-gray-900/95 backdrop-blur-sm rounded-xl border border-purple-500/30 overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-3 py-2 bg-purple-600/50">
          <div className="flex items-center gap-2">
            <span className="text-lg">👁️</span>
            <span className="text-sm font-bold text-white">AI观战模式</span>
            {isPaused && (
              <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded">暂停</span>
            )}
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-white/70 hover:text-white text-lg"
          >
            {isExpanded ? '−' : '+'}
          </button>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="p-3 space-y-3">
            {/* Active Decision */}
            {activeDecision && (
              <div className="bg-black/30 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">
                      {DECISION_TYPE_ICONS[activeDecision.type] || '🤔'}
                    </span>
                    <div>
                      <div className="text-sm font-medium text-white">
                        {DECISION_TYPE_LABELS[activeDecision.type] || '决策中'}
                      </div>
                      <div className="text-xs text-gray-400">
                        玩家: {activeDecision.playerId?.slice(-6) || '未知'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-mono ${elapsedTime > 5000 ? 'text-red-400' : 'text-green-400'}`}>
                      {formatTime(elapsedTime)}
                    </div>
                  </div>
                </div>

                {/* Options being considered */}
                {activeDecision.options.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="text-xs text-gray-400 mb-1">考虑中的选项:</div>
                    {activeDecision.options
                      .sort((a, b) => (b.score || 0) - (a.score || 0))
                      .slice(0, 4)
                      .map((opt, i) => (
                        <div
                          key={i}
                          className={`flex items-center justify-between text-xs px-2 py-1 rounded ${
                            opt.option === activeDecision.selectedOption
                              ? 'bg-green-500/30 text-green-300 border border-green-500/50'
                              : 'bg-gray-800/50 text-gray-300'
                          }`}
                        >
                          <span className="truncate flex-1">{opt.option || '选项'}</span>
                          <span className="ml-2 font-mono">
                            {opt.score?.toFixed(1) || '?'}
                          </span>
                        </div>
                      ))}
                  </div>
                )}

                {/* Final decision made */}
                {activeDecision.selectedOption && (
                  <div className="mt-2 pt-2 border-t border-gray-700">
                    <div className="text-xs text-gray-400 mb-1">最终决策:</div>
                    <div className="text-sm text-yellow-400 font-medium">
                      {activeDecision.selectedOption}
                      {activeDecision.score !== null && (
                        <span className="ml-2 text-xs text-gray-500">
                          (得分: {activeDecision.score.toFixed(2)})
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={togglePause}
                className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isPaused
                    ? 'bg-green-500/30 text-green-300 hover:bg-green-500/50'
                    : 'bg-red-500/30 text-red-300 hover:bg-red-500/50'
                }`}
              >
                {isPaused ? '▶️ 继续' : '⏸️ 暂停'}
              </button>

              <select
                value={playbackSpeed}
                onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                className="px-2 py-1.5 bg-gray-800 border border-gray-600 rounded-lg text-white text-xs"
              >
                <option value="0.5">0.5x</option>
                <option value="1">1x</option>
                <option value="2">2x</option>
                <option value="4">4x</option>
              </select>
            </div>

            {/* Recent Decisions */}
            {recentDecisions.length > 0 && (
              <div>
                <div className="text-xs text-gray-400 mb-2">
                  最近决策 ({filteredDecisions.length}条)
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {recentDecisions.map((decision, i) => (
                    <div
                      key={decision.timestamp || i}
                      className="flex items-center gap-2 text-xs px-2 py-1 bg-black/20 rounded"
                    >
                      <span>{DECISION_TYPE_ICONS[decision.type] || '•'}</span>
                      <span className="text-gray-400 flex-1 truncate">
                        {decision.selectedOption || '...'}
                      </span>
                      <span className="text-gray-500 font-mono">
                        {formatTime(decision.decisionTime || 0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Player Snapshots */}
            {Object.keys(aiPlayerSnapshots).length > 0 && (
              <div>
                <div className="text-xs text-gray-400 mb-2">AI玩家状态</div>
                <div className="space-y-1">
                  {Object.entries(aiPlayerSnapshots).map(([playerId, snapshot]) => (
                    <div
                      key={playerId}
                      className="flex items-center justify-between text-xs px-2 py-1 bg-black/20 rounded"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: snapshot.color || '#888' }}
                        />
                        <span className="text-gray-300">
                          {snapshot.name || playerId.slice(-6)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {getPersonalityLabel(snapshot.personality)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-gray-400">
                        <span>💰 {snapshot.money || 0}</span>
                        <span>🏠 {(snapshot.properties || []).length}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}