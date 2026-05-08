/**
 * Room Browser Component
 * 
 * Displays a list of available rooms that players can join.
 * Real-time updates via Supabase Realtime subscription.
 */

import { useState, useEffect } from 'react';
import { useMultiplayerStore } from './multiplayerStore';

export default function RoomBrowser({ onJoin, onBack, onSpectate }) {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState(null);
  
  const {
    availableRooms,
    subscribeToRoomList,
    unsubscribeFromRoomList,
    refreshRoomList,
  } = useMultiplayerStore();
  
  // Subscribe to room list on mount
  useEffect(() => {
    subscribeToRoomList();
    setIsLoading(false);
    
    return () => {
      unsubscribeFromRoomList();
    };
  }, []);
  
  const handleJoin = (room) => {
    setSelectedRoom(room);
    onJoin(room.code);
  };

  const handleSpectate = (room) => {
    if (room.status !== 'playing') return;
    onSpectate?.(room.code);
  };
  
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = (now - date) / 1000; // seconds
    
    if (diff < 60) return '刚刚';
    if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
    return `${Math.floor(diff / 86400)} 天前`;
  };
  
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-white text-sm"
        >
          ← 返回
        </button>
        <h3 className="text-sm font-bold text-purple-300">可用房间</h3>
        <button
          onClick={refreshRoomList}
          className="text-gray-400 hover:text-white text-sm"
        >
          ↻ 刷新
        </button>
      </div>
      
      {isLoading ? (
        <div className="text-center text-gray-400 py-8">
          加载中...
        </div>
      ) : availableRooms.length === 0 ? (
        <div className="text-center text-gray-400 py-8">
          <div className="text-4xl mb-2">🔍</div>
          <p>暂无房间</p>
          <p className="text-sm mt-1">成为第一个创建房间的人吧!</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {availableRooms.map((room) => (
            <div
              key={room.id}
              className="bg-black/30 rounded-xl p-3 border border-purple-500/30 hover:border-purple-400/50 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-400 font-bold tracking-wider">
                      {room.code}
                    </span>
                    {room.host_id && (
                      <span className="text-xs text-red-400">👑</span>
                    )}
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      room.status === 'waiting' ? 'bg-green-500/30 text-green-400' :
                      room.status === 'playing' ? 'bg-blue-500/30 text-blue-400' :
                      'bg-gray-500/30 text-gray-400'
                    }`}>
                      {room.status === 'waiting' ? '等待中' : room.status === 'playing' ? '游戏中' : '已结束'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {formatTime(room.created_at)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm">
                    <span className="text-green-400">{room.playerCount || 0}</span>
                    <span className="text-gray-500"> / {room.max_players}</span>
                  </div>
                  <div className="flex gap-1 mt-1">
                    {room.status === 'playing' && (
                      <button
                        onClick={() => handleSpectate(room)}
                        className="text-xs px-2 py-1 bg-purple-500/50 hover:bg-purple-500 rounded-lg"
                        title="旁观游戏"
                      >
                        👁️ 旁观
                      </button>
                    )}
                    <button
                      onClick={() => handleJoin(room)}
                      disabled={room.playerCount >= room.max_players}
                      className="text-xs px-3 py-1 bg-blue-500/50 hover:bg-blue-500 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      加入
                    </button>
                  </div>
                </div>
              </div>
              {room.settings && (
                <div className="text-xs text-gray-500 mt-2 flex gap-3">
                  {room.settings.startingMoney && (
                    <span>💰 ${room.settings.startingMoney}</span>
                  )}
                  {room.settings.mapTheme && (
                    <span>🗺️ {room.settings.mapTheme}</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
