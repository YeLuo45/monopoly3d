/**
 * WatchModePanel - Menu option to enter AI watch/spectator mode
 * 
 * Features:
 * - Start watching an AI vs AI game
 * - View decision history
 * - Configure watch settings
 */

import { useState } from 'react';
import { useAIWatchStore } from './aiWatchStore';
import { useGameStore } from '../../game/store';

export default function WatchModePanel({ onClose }) {
  const [selectedDifficulty, setSelectedDifficulty] = useState('normal');
  const [numAIPlayers, setNumAIPlayers] = useState(3);
  const [selectedPersonality, setSelectedPersonality] = useState('mixed');

  const {
    isWatchMode,
    stats,
    currentSessionDecisions,
    startWatching,
    stopWatching,
    clearHistory,
    exportDecisions,
  } = useAIWatchStore();

  const startGameWatch = () => {
    // Generate AI player IDs for watching
    const aiPlayerIds = Array.from({ length: numAIPlayers }, (_, i) => `ai_player_${i + 1}`);
    const gameId = `watch_${Date.now()}`;

    startWatching(gameId, aiPlayerIds);

    // TODO: Start AI vs AI game with these settings
    // For now, just enable watch mode - actual game integration would happen in GameBoard

    // Close panel and navigate to game
    if (onClose) onClose();
  };

  const personalityOptions = [
    { value: 'mixed', label: '混合性格' },
    { value: 'aggressive', label: '激进型' },
    { value: 'conservative', label: '保守型' },
    { value: 'balanced', label: '均衡型' },
  ];

  const difficultyOptions = [
    { value: 'easy', label: '简单' },
    { value: 'normal', label: '普通' },
    { value: 'hard', label: '困难' },
    { value: 'adaptive', label: '自适应' },
  ];

  if (isWatchMode) {
    // Watch mode active - show stats
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-purple-300">👁️ AI观战模式</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-green-400">● 观战中</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-black/30 rounded-lg p-3">
            <div className="text-2xl font-bold text-white">{stats.totalDecisions}</div>
            <div className="text-xs text-gray-400">决策总数</div>
          </div>
          <div className="bg-black/30 rounded-lg p-3">
            <div className="text-2xl font-bold text-white">
              {stats.averageDecisionTime > 0
                ? `${(stats.averageDecisionTime / 1000).toFixed(2)}s`
                : '-'}
            </div>
            <div className="text-xs text-gray-400">平均决策时间</div>
          </div>
        </div>

        {/* Decisions by type */}
        {Object.keys(stats.decisionsByType).length > 0 && (
          <div>
            <div className="text-xs text-gray-400 mb-2">决策类型分布</div>
            <div className="space-y-1">
              {Object.entries(stats.decisionsByType).map(([type, count]) => (
                <div
                  key={type}
                  className="flex items-center justify-between text-xs px-2 py-1 bg-black/20 rounded"
                >
                  <span className="text-gray-400">{type.replace('_', ' ')}</span>
                  <span className="text-white font-medium">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={exportDecisions}
            className="flex-1 px-4 py-2 bg-blue-500/30 hover:bg-blue-500/50 rounded-lg text-blue-200 text-sm transition-colors"
          >
            📥 导出数据
          </button>
          <button
            onClick={clearHistory}
            className="flex-1 px-4 py-2 bg-red-500/30 hover:bg-red-500/50 rounded-lg text-red-200 text-sm transition-colors"
          >
            🗑️ 清空记录
          </button>
        </div>

        <button
          onClick={stopWatching}
          className="w-full px-4 py-2 bg-gray-500/30 hover:bg-gray-500/50 rounded-lg text-gray-300 text-sm transition-colors"
        >
          退出观战
        </button>
      </div>
    );
  }

  // Watch mode setup
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-purple-300">👁️ AI观战模式</h3>

      <p className="text-sm text-gray-400">
        观看AI玩家之间的对战，观察它们的决策过程和策略。
      </p>

      {/* Number of AI players */}
      <div>
        <label className="text-sm text-gray-400 mb-2 block">AI玩家数量</label>
        <div className="flex gap-2">
          {[2, 3, 4].map(num => (
            <button
              key={num}
              onClick={() => setNumAIPlayers(num)}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                numAIPlayers === num
                  ? 'bg-purple-500/50 text-white border border-purple-500'
                  : 'bg-gray-800/50 text-gray-400 border border-gray-700 hover:bg-gray-700/50'
              }`}
            >
              {num}个AI
            </button>
          ))}
        </div>
      </div>

      {/* Difficulty */}
      <div>
        <label className="text-sm text-gray-400 mb-2 block">AI难度</label>
        <select
          value={selectedDifficulty}
          onChange={(e) => setSelectedDifficulty(e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm"
        >
          {difficultyOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Personality */}
      <div>
        <label className="text-sm text-gray-400 mb-2 block">AI性格分布</label>
        <select
          value={selectedPersonality}
          onChange={(e) => setSelectedPersonality(e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm"
        >
          {personalityOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Start button */}
      <button
        onClick={startGameWatch}
        className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl text-white font-medium hover:scale-[1.02] transition-all"
      >
        开始观战
      </button>
    </div>
  );
}