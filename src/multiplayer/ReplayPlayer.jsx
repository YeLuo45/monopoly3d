/**
 * ReplayPlayer - React Component for Game Replay UI
 * 
 * Provides:
 * - Timeline scrubber for seeking through events
 * - Playback controls (play, pause, stop, speed)
 * - Event list display
 * - Player state visualization
 * - Live spectating mode
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ReplayPlayer as ReplayPlayerClass,
  getLocalReplays,
  deleteLocalReplay,
  exportReplay,
  useReplayStore,
} from './ReplaySystem';
import { RealtimeChannel, CHANNEL_EVENTS } from './RealtimeChannel';

/**
 * Format milliseconds to human-readable time
 */
function formatDuration(ms) {
  if (!ms || ms < 0) return '0:00';
  
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Format timestamp to local time string
 */
function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString();
}

/**
 * Get event icon for display
 */
function getEventIcon(eventType) {
  const icons = {
    roll_dice: '🎲',
    buy_property: '🏠',
    pay_toll: '💰',
    build_house: '🏗️',
    answer_question: '❓',
    trade_property: '🔄',
    end_turn: '➡️',
    player_join: '👋',
    player_leave: '👋',
    game_start: '🚀',
    game_end: '🏁',
    move_token: '🚶',
    draw_card: '📤',
    pay_rent: '💸',
    receive_money: '💵',
    go_to_jail: '🚔',
    escape_jail: '🎉',
  };
  return icons[eventType] || '📋';
}

/**
 * Get event display name
 */
function getEventName(eventType) {
  const names = {
    roll_dice: '掷骰子',
    buy_property: '购买房产',
    pay_toll: '付过路费',
    build_house: '建造房屋',
    answer_question: '回答问题',
    trade_property: '交易房产',
    end_turn: '结束回合',
    player_join: '玩家加入',
    player_leave: '玩家离开',
    game_start: '游戏开始',
    game_end: '游戏结束',
    move_token: '移动棋子',
    draw_card: '抽取卡牌',
    pay_rent: '付租金',
    receive_money: '获得金钱',
    go_to_jail: '进入监狱',
    escape_jail: '逃出监狱',
  };
  return names[eventType] || eventType;
}

/**
 * Main ReplayPlayer Component
 */
export default function ReplayPlayer({ 
  replayData, 
  onClose, 
  isLive = false,
  liveRoomId = null,
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [showEventList, setShowEventList] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const playerRef = useRef(null);
  const timelineRef = useRef(null);
  const replayStore = useReplayStore();
  
  const totalEvents = replayData?.events?.length || 0;
  const progress = totalEvents > 0 ? (currentIndex / (totalEvents - 1)) * 100 : 0;
  
  // Initialize player
  useEffect(() => {
    if (!replayData || isLive) return;
    
    playerRef.current = new ReplayPlayerClass(replayData, {
      onEvent: (index, event) => {
        setCurrentIndex(index);
        setCurrentEvent(event);
      },
      onSeek: (index, event) => {
        setCurrentIndex(index);
        setCurrentEvent(event);
      },
      onEnd: () => {
        setIsPlaying(false);
        setCurrentIndex(totalEvents - 1);
      },
    });
    
    // Load first event
    if (replayData.events?.length > 0) {
      setCurrentEvent(replayData.events[0]);
    }
    
    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [replayData, isLive, totalEvents]);
  
  // Handle play/pause
  const handlePlay = useCallback(() => {
    if (!playerRef.current) return;
    
    if (isPaused) {
      playerRef.current.pause();
      setIsPaused(false);
    } else {
      playerRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, isPaused]);
  
  // Handle stop
  const handleStop = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.stop();
      playerRef.current.seek(0);
    }
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentIndex(0);
    setCurrentEvent(replayData?.events?.[0] || null);
  }, [replayData]);
  
  // Handle timeline click
  const handleTimelineClick = useCallback((e) => {
    if (!timelineRef.current || !replayData) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const index = Math.floor(percent * (totalEvents - 1));
    
    if (playerRef.current) {
      playerRef.current.seek(index);
    }
    setCurrentIndex(index);
    setCurrentEvent(replayData.events?.[index] || null);
  }, [replayData, totalEvents]);
  
  // Handle speed change
  const handleSpeedChange = useCallback((speed) => {
    setPlaybackSpeed(speed);
    if (playerRef.current) {
      playerRef.current.setSpeed(speed);
    }
  }, []);
  
  // Handle event click from list
  const handleEventClick = useCallback((index) => {
    if (playerRef.current) {
      playerRef.current.seek(index);
    }
    setCurrentIndex(index);
    setCurrentEvent(replayData.events?.[index] || null);
    setShowEventList(false);
  }, [replayData]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT') return;
      
      switch (e.key) {
        case ' ':
          e.preventDefault();
          handlePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (playerRef.current) {
            const newIndex = Math.max(0, currentIndex - 1);
            playerRef.current.seek(newIndex);
            setCurrentIndex(newIndex);
            setCurrentEvent(replayData.events?.[newIndex] || null);
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (playerRef.current) {
            const newIndex = Math.min(totalEvents - 1, currentIndex + 1);
            playerRef.current.seek(newIndex);
            setCurrentIndex(newIndex);
            setCurrentEvent(replayData.events?.[newIndex] || null);
          }
          break;
        case 'Escape':
          onClose?.();
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePlay, currentIndex, totalEvents, replayData, onClose]);
  
  if (isLive && liveRoomId) {
    return <LiveReplayPlayer roomId={liveRoomId} onClose={onClose} />;
  }
  
  if (!replayData || !replayData.events || replayData.events.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
          <h2 className="text-xl font-bold text-white mb-4">没有回放数据</h2>
          <p className="text-gray-300 mb-4">该游戏没有可用的回放记录。</p>
          <button
            onClick={onClose}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">
              {isLive ? '🔴 直播观战' : '游戏回放'}
            </h2>
            <p className="text-sm text-gray-400">
              {replayData.players?.length || 0} 名玩家 · {totalEvents} 个事件
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
        
        {/* Event Display */}
        <div className="p-4 bg-gray-800/50">
          {currentEvent && (
            <div className="flex items-center gap-4">
              <span className="text-3xl">{getEventIcon(currentEvent.type)}</span>
              <div>
                <p className="text-white font-medium">{getEventName(currentEvent.type)}</p>
                <p className="text-sm text-gray-400">
                  {currentEvent.playerId && `玩家: ${currentEvent.playerId.slice(-6)} · `}
                  {formatTime(currentEvent.timestamp)}
                </p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-2xl font-mono text-blue-400">
                  {currentIndex + 1} / {totalEvents}
                </p>
              </div>
            </div>
          )}
          
          {/* Event Payload Debug (optional) */}
          {currentEvent?.payload && Object.keys(currentEvent.payload).length > 0 && (
            <details className="mt-2">
              <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">
                查看事件详情
              </summary>
              <pre className="mt-2 p-2 bg-gray-900 rounded text-xs text-gray-300 overflow-auto max-h-24">
                {JSON.stringify(currentEvent.payload, null, 2)}
              </pre>
            </details>
          )}
        </div>
        
        {/* Timeline */}
        <div className="px-4 py-2">
          <div
            ref={timelineRef}
            className="relative h-8 bg-gray-700 rounded-full cursor-pointer overflow-hidden"
            onClick={handleTimelineClick}
          >
            <div
              className="absolute top-0 left-0 h-full bg-blue-600 transition-all"
              style={{ width: `${progress}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg transition-all"
              style={{ left: `calc(${progress}% - 8px)` }}
            />
          </div>
        </div>
        
        {/* Controls */}
        <div className="p-4 flex items-center justify-center gap-4">
          {/* Stop */}
          <button
            onClick={handleStop}
            className="p-3 bg-gray-700 hover:bg-gray-600 rounded-full text-white transition-colors"
            title="停止"
          >
            ⏹
          </button>
          
          {/* Play/Pause */}
          <button
            onClick={handlePlay}
            className="p-4 bg-blue-600 hover:bg-blue-500 rounded-full text-white transition-colors"
            title={isPlaying ? "暂停" : "播放"}
          >
            {isPlaying && !isPaused ? '⏸' : '▶'}
          </button>
          
          {/* Skip */}
          <button
            onClick={() => {
              const newIndex = Math.min(totalEvents - 1, currentIndex + 10);
              handleEventClick(newIndex);
            }}
            className="p-3 bg-gray-700 hover:bg-gray-600 rounded-full text-white transition-colors"
            title="快进10个事件"
          >
            ⏩
          </button>
          
          {/* Speed */}
          <div className="flex items-center gap-2 ml-4">
            <span className="text-gray-400 text-sm">速度:</span>
            {[0.5, 1, 1.5, 2, 4].map(speed => (
              <button
                key={speed}
                onClick={() => handleSpeedChange(speed)}
                className={`px-2 py-1 rounded text-sm transition-colors ${
                  playbackSpeed === speed
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
          
          {/* Event List Toggle */}
          <button
            onClick={() => setShowEventList(!showEventList)}
            className={`ml-4 px-3 py-1 rounded text-sm transition-colors ${
              showEventList
                ? 'bg-green-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            📋 事件列表
          </button>
        </div>
        
        {/* Event List */}
        {showEventList && (
          <div className="flex-1 overflow-auto border-t border-gray-700">
            <div className="max-h-64 overflow-auto">
              {replayData.events.map((event, index) => (
                <button
                  key={event.id || index}
                  onClick={() => handleEventClick(index)}
                  className={`w-full flex items-center gap-3 p-3 hover:bg-gray-800 transition-colors text-left ${
                    index === currentIndex ? 'bg-blue-900/30' : ''
                  }`}
                >
                  <span className="text-xl">{getEventIcon(event.type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">{getEventName(event.type)}</p>
                    <p className="text-gray-500 text-xs">
                      {formatTime(event.timestamp)}
                      {event.playerId && ` · ${event.playerId.slice(-6)}`}
                    </p>
                  </div>
                  <span className="text-gray-500 text-xs">{index + 1}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Players Display */}
        {replayData.players && replayData.players.length > 0 && (
          <div className="p-4 border-t border-gray-700">
            <h3 className="text-sm font-medium text-gray-400 mb-2">玩家</h3>
            <div className="flex flex-wrap gap-2">
              {replayData.players.map((player, index) => (
                <div
                  key={player.id || index}
                  className="flex items-center gap-2 px-3 py-1 bg-gray-800 rounded-full"
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: player.color || '#666' }}
                  />
                  <span className="text-white text-sm">{player.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Live Replay Player for Spectating
 */
function LiveReplayPlayer({ roomId, onClose }) {
  const [isConnected, setIsConnected] = useState(false);
  const [liveEvents, setLiveEvents] = useState([]);
  const [players, setPlayers] = useState([]);
  const [roomStatus, setRoomStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const channelRef = useRef(null);
  
  useEffect(() => {
    let mounted = true;
    
    async function connectToLiveGame() {
      try {
        const { spectateGame, fetchGameReplay } = await import('./ReplaySystem');
        
        // First fetch existing events
        const existingReplay = await fetchGameReplay(roomId);
        if (mounted && existingReplay) {
          setLiveEvents(existingReplay.events || []);
          setPlayers(existingReplay.players || []);
        }
        
        // Then connect to live updates
        const connection = await spectateGame(
          roomId,
          // onEvent
          (event) => {
            if (mounted) {
              setLiveEvents(prev => [...prev, event]);
            }
          },
          // onPlayerUpdate
          (player) => {
            if (mounted) {
              setPlayers(prev => {
                const index = prev.findIndex(p => p.id === player.id);
                if (index >= 0) {
                  const updated = [...prev];
                  updated[index] = { ...updated[index], ...player };
                  return updated;
                }
                return [...prev, player];
              });
            }
          },
          // onGameEnd
          (roomData) => {
            if (mounted) {
              setRoomStatus('finished');
            }
          }
        );
        
        if (connection && mounted) {
          channelRef.current = connection;
          setIsConnected(true);
        }
      } catch (err) {
        if (mounted) {
          setError(err.message);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }
    
    connectToLiveGame();
    
    return () => {
      mounted = false;
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, [roomId]);
  
  // Current event is the last one
  const currentEvent = liveEvents[liveEvents.length - 1];
  const totalEvents = liveEvents.length;
  
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-xl p-8 text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-white">正在连接直播...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-xl p-6 max-w-md">
          <h2 className="text-xl font-bold text-red-400 mb-4">连接失败</h2>
          <p className="text-gray-300 mb-4">{error}</p>
          <button
            onClick={onClose}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            关闭
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between bg-red-900/30">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <div>
              <h2 className="text-xl font-bold text-white">🔴 直播观战</h2>
              <p className="text-sm text-gray-400">
                {isConnected ? '已连接' : '连接中...'} · 
                {roomStatus === 'finished' ? '游戏已结束' : '正在进行'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
        
        {/* Current Event */}
        <div className="p-6 bg-gray-800/50 flex items-center justify-center min-h-32">
          {currentEvent ? (
            <div className="text-center">
              <span className="text-5xl block mb-2">{getEventIcon(currentEvent.type)}</span>
              <p className="text-xl font-medium text-white">{getEventName(currentEvent.type)}</p>
              <p className="text-sm text-gray-400 mt-1">
                {currentEvent.playerId && `玩家: ${currentEvent.playerId.slice(-6)} · `}
                {formatTime(currentEvent.timestamp)}
              </p>
            </div>
          ) : (
            <p className="text-gray-400">等待事件...</p>
          )}
        </div>
        
        {/* Live Event Feed */}
        <div className="flex-1 overflow-hidden border-t border-gray-700">
          <div className="p-2 bg-gray-800 flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-400">实时事件流</h3>
            <span className="text-xs text-gray-500">{totalEvents} 个事件</span>
          </div>
          <div className="overflow-auto max-h-48">
            {[...liveEvents].reverse().map((event, index) => (
              <div
                key={event.id || index}
                className="flex items-center gap-3 p-2 hover:bg-gray-800/50 border-b border-gray-800"
              >
                <span className="text-lg">{getEventIcon(event.type)}</span>
                <span className="text-white text-sm flex-1">{getEventName(event.type)}</span>
                <span className="text-gray-500 text-xs">{formatTime(event.timestamp)}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Players */}
        {players.length > 0 && (
          <div className="p-4 border-t border-gray-700">
            <h3 className="text-sm font-medium text-gray-400 mb-2">当前玩家</h3>
            <div className="flex flex-wrap gap-2">
              {players.map((player, index) => (
                <div
                  key={player.id || index}
                  className="flex items-center gap-2 px-3 py-1 bg-gray-800 rounded-full"
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: player.color || '#666' }}
                  />
                  <span className="text-white text-sm">{player.name}</span>
                  {player.is_online === false && (
                    <span className="text-gray-500 text-xs">(离线)</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Replay List Component - shows saved replays
 */
export function ReplayList({ onSelectReplay, onClose }) {
  const [replays, setReplays] = useState([]);
  const [selectedReplay, setSelectedReplay] = useState(null);
  
  useEffect(() => {
    setReplays(getLocalReplays());
  }, []);
  
  const handleDelete = (replayId, e) => {
    e.stopPropagation();
    if (confirm('确定删除这个回放?')) {
      deleteLocalReplay(replayId);
      setReplays(getLocalReplays());
      if (selectedReplay?.id === replayId) {
        setSelectedReplay(null);
      }
    }
  };
  
  const handleExport = (replay, e) => {
    e.stopPropagation();
    exportReplay(replay);
  };
  
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">游戏回放列表</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>
        
        {/* Replay List */}
        <div className="flex-1 overflow-auto">
          {replays.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <p className="text-4xl mb-4">📼</p>
              <p>暂无保存的回放</p>
            </div>
          ) : (
            replays.map(replay => (
              <button
                key={replay.id}
                onClick={() => setSelectedReplay(replay)}
                className={`w-full p-4 border-b border-gray-700 hover:bg-gray-700/50 text-left transition-colors ${
                  selectedReplay?.id === replay.id ? 'bg-blue-900/30' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">
                      回放 #{replay.id.slice(-8)}
                    </p>
                    <p className="text-sm text-gray-400">
                      {replay.players?.length || 0} 名玩家 · 
                      {replay.events?.length || 0} 个事件 · 
                      {formatDuration(replay.duration)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {replay.startTime && new Date(replay.startTime).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => handleExport(replay, e)}
                      className="p-2 bg-gray-700 hover:bg-gray-600 rounded text-sm text-gray-300"
                      title="导出"
                    >
                      📤
                    </button>
                    <button
                      onClick={(e) => handleDelete(replay.id, e)}
                      className="p-2 bg-red-900/50 hover:bg-red-800 rounded text-sm text-red-300"
                      title="删除"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
        
        {/* Footer */}
        {selectedReplay && (
          <div className="p-4 border-t border-gray-700 bg-gray-900">
            <p className="text-sm text-gray-400 mb-2">
              已选择: 回放 #{selectedReplay.id.slice(-8)}
            </p>
            <button
              onClick={() => onSelectReplay(selectedReplay)}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              播放此回放
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export { ReplayPlayer };