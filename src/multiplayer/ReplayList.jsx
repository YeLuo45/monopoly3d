/**
 * ReplayList Component
 * 
 * Displays a list of past game replays with:
 * - Local replays from localStorage
 * - Supabase-hosted replays (when configured)
 * - Search and filter capabilities
 * - Quick preview before loading
 */

import { useState, useEffect } from 'react';
import { getLocalReplays, deleteLocalReplay, exportReplay } from './ReplaySystem';
import { supabase, isSupabaseConfigured } from './supabaseClient';

export default function ReplayList({ onSelectReplay, onClose }) {
  const [localReplays, setLocalReplays] = useState([]);
  const [cloudReplays, setCloudReplays] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('local'); // 'local' | 'cloud'
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date'); // 'date' | 'duration' | 'players'

  // Load replays on mount
  useEffect(() => {
    loadReplays();
  }, []);

  const loadReplays = async () => {
    setIsLoading(true);
    
    // Load local replays
    const local = getLocalReplays();
    setLocalReplays(local);
    
    // Load cloud replays if configured
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('replays')
          .select('*')
          .order('recorded_at', { ascending: false })
          .limit(20);
        
        if (!error && data) {
          setCloudReplays(data);
        }
      } catch (err) {
        console.error('[ReplayList] Failed to load cloud replays:', err);
      }
    }
    
    setIsLoading(false);
  };

  const handleDeleteReplay = (replayId, isCloud = false) => {
    if (!confirm('确定删除这个回放吗？')) return;
    
    if (isCloud) {
      // Delete from Supabase
      if (isSupabaseConfigured()) {
        supabase
          .from('replays')
          .delete()
          .eq('id', replayId)
          .then(({ error }) => {
            if (!error) {
              setCloudReplays(prev => prev.filter(r => r.id !== replayId));
            }
          });
      }
    } else {
      // Delete from localStorage
      deleteLocalReplay(replayId);
      setLocalReplays(prev => prev.filter(r => r.id !== replayId));
    }
  };

  const handleExportReplay = (replay) => {
    exportReplay(replay);
  };

  const formatDuration = (ms) => {
    if (!ms) return '0:00';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = (now - date) / 1000;
    
    if (diff < 60) return '刚刚';
    if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} 天前`;
    
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  const getEventSummary = (replay) => {
    if (!replay.events || replay.events.length === 0) return '无事件';
    const eventCounts = {};
    replay.events.forEach(e => {
      eventCounts[e.type] = (eventCounts[e.type] || 0) + 1;
    });
    const topEvents = Object.entries(eventCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([type, count]) => `${type}:${count}`)
      .join(', ');
    return topEvents || '无事件';
  };

  // Filter and sort replays
  const filterAndSortReplays = (replays) => {
    let filtered = replays;
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r => 
        r.id?.toLowerCase().includes(query) ||
        r.roomId?.toLowerCase().includes(query) ||
        r.players?.some(p => p.name?.toLowerCase().includes(query))
      );
    }
    
    // Apply sort
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return (b.startTime || b.recorded_at || 0) - (a.startTime || a.recorded_at || 0);
        case 'duration':
          return (b.duration || 0) - (a.duration || 0);
        case 'players':
          return (b.players?.length || 0) - (a.players?.length || 0);
        default:
          return 0;
      }
    });
  };

  const renderReplayCard = (replay, isCloud = false) => {
    const playerCount = replay.players?.length || replay.playerCount || replay.player_count || 0;
    const eventCount = replay.events?.length || replay.event_count || 0;
    const duration = replay.duration || replay.duration_ms || 0;
    const date = replay.startTime || replay.recorded_at || Date.now();
    
    return (
      <div
        key={replay.id}
        className="bg-gray-800/50 rounded-xl p-4 border border-purple-500/20 hover:border-purple-500/40 transition-all"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded bg-purple-500/30 text-purple-300">
                {isCloud ? '☁️ 云端' : '💾 本地'}
              </span>
              {playerCount > 0 && (
                <span className="text-xs text-gray-400">
                  👥 {playerCount}人
                </span>
              )}
              {eventCount > 0 && (
                <span className="text-xs text-gray-400">
                  📋 {eventCount}事件
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {formatDate(date)} · {formatDuration(duration)}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onSelectReplay(replay)}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm text-white transition-colors"
            >
              播放
            </button>
            <button
              onClick={() => handleExportReplay(replay)}
              className="p-1.5 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
              title="导出"
            >
              📤
            </button>
            <button
              onClick={() => handleDeleteReplay(replay.id, isCloud)}
              className="p-1.5 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-red-400 transition-colors"
              title="删除"
            >
              🗑️
            </button>
          </div>
        </div>
        
        {/* Players */}
        {replay.players && replay.players.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {replay.players.slice(0, 6).map((player, idx) => (
              <div
                key={idx}
                className="flex items-center gap-1 px-2 py-0.5 bg-gray-900/50 rounded-full"
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: player.color || '#666' }}
                />
                <span className="text-xs text-gray-300">{player.name || player.name_text || '玩家'}</span>
              </div>
            ))}
            {replay.players.length > 6 && (
              <span className="text-xs text-gray-500">+{replay.players.length - 6}</span>
            )}
          </div>
        )}
        
        {/* Event Summary */}
        {eventCount > 0 && (
          <p className="text-xs text-gray-500 truncate">
            {getEventSummary(replay)}
          </p>
        )}
        
        {/* Replay ID for debugging */}
        <p className="text-xs text-gray-600 mt-2 font-mono truncate">
          {replay.id?.slice(-12) || replay.id}
        </p>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-white">游戏回放</h2>
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab('local')}
                className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                  activeTab === 'local'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                💾 本地 ({localReplays.length})
              </button>
              <button
                onClick={() => setActiveTab('cloud')}
                className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                  activeTab === 'cloud'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                ☁️ 云端 ({cloudReplays.length})
              </button>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
        
        {/* Search and Filter Bar */}
        <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索回放..."
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
          >
            <option value="date">按时间排序</option>
            <option value="duration">按时长排序</option>
            <option value="players">按玩家数排序</option>
          </select>
          <button
            onClick={loadReplays}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 text-sm transition-colors"
          >
            ↻ 刷新
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <div className="text-center text-gray-400 py-12">
              <div className="text-4xl mb-4 animate-spin">⏳</div>
              <p>加载中...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeTab === 'local' ? (
                filterAndSortReplays(localReplays).length > 0 ? (
                  filterAndSortReplays(localReplays).map(replay => 
                    renderReplayCard(replay, false)
                  )
                ) : (
                  <div className="text-center text-gray-400 py-12">
                    <div className="text-4xl mb-4">📭</div>
                    <p>暂无本地回放</p>
                    <p className="text-sm mt-1">完成游戏后会自动保存回放到这里</p>
                  </div>
                )
              ) : (
                filterAndSortReplays(cloudReplays).length > 0 ? (
                  filterAndSortReplays(cloudReplays).map(replay => 
                    renderReplayCard(replay, true)
                  )
                ) : (
                  <div className="text-center text-gray-400 py-12">
                    <div className="text-4xl mb-4">☁️</div>
                    <p>暂无云端回放</p>
                    <p className="text-sm mt-1">配置Supabase后可以保存和同步回放</p>
                  </div>
                )
              )}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-gray-800 text-center">
          <p className="text-xs text-gray-500">
            本地回放最多保存20个 · 云端回放需要配置Supabase
          </p>
        </div>
      </div>
    </div>
  );
}