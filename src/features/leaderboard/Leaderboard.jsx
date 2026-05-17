/**
 * Leaderboard - Global rankings and player statistics display
 * 
 * Features:
 * - Multiple ranking categories (wins, games, achievements, etc.)
 * - Weekly/All-time/Seasonal period filters
 * - Personal rank highlight
 * - Player stats on hover/click
 */

import { useState, useEffect } from 'react';
import {
  useLeaderboardStore,
  LEADERBOARD_CATEGORIES,
  TIME_PERIODS,
} from './leaderboardStore';

const CATEGORY_LABELS = {
  [LEADERBOARD_CATEGORIES.WINS]: { label: '🏆 胜场', icon: '🏆', color: 'text-yellow-400' },
  [LEADERBOARD_CATEGORIES.GAMES_PLAYED]: { label: '🎮 局数', icon: '🎮', color: 'text-blue-400' },
  [LEADERBOARD_CATEGORIES.WIN_RATE]: { label: '📊 胜率', icon: '📊', color: 'text-green-400' },
  [LEADERBOARD_CATEGORIES.ACHIEVEMENTS]: { label: '⭐ 成就', icon: '⭐', color: 'text-purple-400' },
  [LEADERBOARD_CATEGORIES.WEALTH]: { label: '💰 财富', icon: '💰', color: 'text-yellow-500' },
  [LEADERBOARD_CATEGORIES.STREAK]: { label: '🔥 连胜', icon: '🔥', color: 'text-orange-400' },
};

const PERIOD_LABELS = {
  [TIME_PERIODS.WEEKLY]: '本周',
  [TIME_PERIODS.MONTHLY]: '本月',
  [TIME_PERIODS.ALL_TIME]: '全部',
  [TIME_PERIODS.SEASONAL]: '赛季',
};

export default function Leaderboard({ onClose }) {
  const {
    entries,
    userRank,
    isLoading,
    error,
    category,
    period,
    personalStats,
    fetchLeaderboard,
    setCategory,
    setPeriod,
  } = useLeaderboardStore();

  const [selectedEntry, setSelectedEntry] = useState(null);
  const [hoveredEntry, setHoveredEntry] = useState(null);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const formatValue = (entry, cat) => {
    switch (cat) {
      case LEADERBOARD_CATEGORIES.WINS:
        return entry.wins || 0;
      case LEADERBOARD_CATEGORIES.GAMES_PLAYED:
        return entry.games_played || 0;
      case LEADERBOARD_CATEGORIES.WIN_RATE:
        return `${((entry.win_rate || 0) * 100).toFixed(1)}%`;
      case LEADERBOARD_CATEGORIES.ACHIEVEMENTS:
        return entry.achievement_points || 0;
      case LEADERBOARD_CATEGORIES.WEALTH:
        return formatMoney(entry.total_wealth || 0);
      case LEADERBOARD_CATEGORIES.STREAK:
        return `${entry.current_streak || 0} 连胜`;
      default:
        return '-';
    }
  };

  const formatMoney = (amount) => {
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
    return amount.toLocaleString();
  };

  const getRankStyle = (rank) => {
    switch (rank) {
      case 1: return 'bg-yellow-500/20 border-yellow-500 text-yellow-400';
      case 2: return 'bg-gray-400/20 border-gray-400 text-gray-300';
      case 3: return 'bg-orange-600/20 border-orange-600 text-orange-400';
      default: return 'bg-gray-700/50 border-gray-600 text-gray-400';
    }
  };

  const getCategoryValue = (entry) => {
    switch (category) {
      case LEADERBOARD_CATEGORIES.WINS: return entry.wins || 0;
      case LEADERBOARD_CATEGORIES.GAMES_PLAYED: return entry.games_played || 0;
      case LEADERBOARD_CATEGORIES.WIN_RATE: return entry.win_rate || 0;
      case LEADERBOARD_CATEGORIES.ACHIEVEMENTS: return entry.achievement_points || 0;
      case LEADERBOARD_CATEGORIES.WEALTH: return entry.total_wealth || 0;
      case LEADERBOARD_CATEGORIES.STREAK: return entry.current_streak || 0;
      default: return 0;
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          📊 全球排行榜
        </h2>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Category Tabs */}
      <div className="px-4 py-3 border-b border-gray-800 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {Object.entries(CATEGORY_LABELS).map(([key, { label, icon, color }]) => (
            <button
              key={key}
              onClick={() => setCategory(key)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                category === key
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <span>{icon}</span>
              <span>{label.split(' ')[1]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Period Filter */}
      <div className="px-4 py-2 border-b border-gray-800 flex items-center gap-2">
        <span className="text-xs text-gray-500">周期:</span>
        <div className="flex gap-1">
          {Object.entries(PERIOD_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                period === key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        
        {/* Refresh button */}
        <button
          onClick={() => fetchLeaderboard()}
          className="ml-auto p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
          title="刷新"
        >
          🔄
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="text-gray-400">加载中...</div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <div className="text-red-400">加载失败</div>
            <button
              onClick={() => fetchLeaderboard()}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-sm text-white"
            >
              重试
            </button>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-gray-400">
            暂无数据
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {/* Top 3 highlight */}
            <div className="grid grid-cols-3 gap-2 p-4 bg-gradient-to-b from-yellow-900/10 to-transparent">
              {entries.slice(0, 3).map((entry, idx) => (
                <div
                  key={entry.player_id}
                  className={`relative p-3 rounded-xl border ${
                    idx === 0 
                      ? 'col-span-1 row-span-2 bg-yellow-500/10 border-yellow-500/40' 
                      : 'bg-gray-800/50 border-gray-600'
                  }`}
                  onClick={() => setSelectedEntry(entry)}
                >
                  {/* Rank badge */}
                  <div className={`absolute -top-2 -left-2 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
                    idx === 0 ? 'bg-yellow-500 border-yellow-400 text-yellow-900' :
                    idx === 1 ? 'bg-gray-400 border-gray-300 text-gray-800' :
                    'bg-orange-600 border-orange-500 text-orange-100'
                  }`}>
                    {idx + 1}
                  </div>
                  
                  {/* Avatar */}
                  <div className="text-3xl text-center mt-2 mb-1">
                    {entry.avatar || '👤'}
                  </div>
                  
                  {/* Name */}
                  <div className="text-center">
                    <div className="text-white font-medium text-sm truncate">
                      {entry.player_name || '玩家'}
                    </div>
                    <div className={`text-lg font-bold ${CATEGORY_LABELS[category].color}`}>
                      {formatValue(entry, category)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Rest of the list */}
            <div className="p-2">
              {entries.slice(3).map((entry, idx) => (
                <div
                  key={entry.player_id}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                    hoveredEntry === entry.player_id ? 'bg-gray-700/50' : ''
                  } ${userRank?.player_id === entry.player_id ? 'bg-blue-900/20 border border-blue-500/30 rounded-xl' : ''}`}
                  onMouseEnter={() => setHoveredEntry(entry.player_id)}
                  onMouseLeave={() => setHoveredEntry(null)}
                  onClick={() => setSelectedEntry(entry)}
                >
                  {/* Rank */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 ${getRankStyle(entry.rank)}`}>
                    {entry.rank}
                  </div>
                  
                  {/* Avatar */}
                  <div className="text-2xl">{entry.avatar || '👤'}</div>
                  
                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium truncate">
                      {entry.player_name || '玩家'}
                    </div>
                    {userRank?.player_id === entry.player_id && (
                      <div className="text-xs text-blue-400">你的排名</div>
                    )}
                  </div>
                  
                  {/* Value */}
                  <div className={`text-xl font-bold ${CATEGORY_LABELS[category].color}`}>
                    {formatValue(entry, category)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Selected Entry Detail */}
      {selectedEntry && (
        <div className="p-4 border-t border-gray-700 bg-gray-800/50">
          <div className="flex items-center gap-4">
            <div className="text-4xl">{selectedEntry.avatar || '👤'}</div>
            <div className="flex-1">
              <div className="text-white font-bold text-lg">
                {selectedEntry.player_name || '玩家'}
              </div>
              <div className="text-gray-400 text-sm">
                排名 #{selectedEntry.rank} · {CATEGORY_LABELS[category].label}
              </div>
            </div>
            <button
              onClick={() => setSelectedEntry(null)}
              className="p-2 hover:bg-gray-700 rounded-lg text-gray-400"
            >
              ✕
            </button>
          </div>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-gray-900 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-yellow-400">{selectedEntry.wins || 0}</div>
              <div className="text-xs text-gray-500">胜场</div>
            </div>
            <div className="bg-gray-900 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-400">{selectedEntry.games_played || 0}</div>
              <div className="text-xs text-gray-500">总局数</div>
            </div>
            <div className="bg-gray-900 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-400">
                {selectedEntry.win_rate ? `${(selectedEntry.win_rate * 100).toFixed(1)}%` : '0%'}
              </div>
              <div className="text-xs text-gray-500">胜率</div>
            </div>
            <div className="bg-gray-900 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-purple-400">{selectedEntry.achievement_points || 0}</div>
              <div className="text-xs text-gray-500">成就分</div>
            </div>
            <div className="bg-gray-900 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-yellow-500">{formatMoney(selectedEntry.total_wealth || 0)}</div>
              <div className="text-xs text-gray-500">累计财富</div>
            </div>
            <div className="bg-gray-900 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-orange-400">{selectedEntry.current_streak || 0}</div>
              <div className="text-xs text-gray-500">连胜</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}