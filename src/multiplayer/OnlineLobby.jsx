/**
 * Online Lobby Component
 * 
 * Multiplayer lobby for creating/joining rooms with online players.
 * Shows room creation options and room code input for joining.
 */

import { useState, useEffect } from 'react';
import { useGameStore } from '../game/store';
import { useMultiplayerStore } from './multiplayerStore';
import VoiceChatControls from './VoiceChatControls';
import RoomBrowser from './RoomBrowser';

export default function OnlineLobby({ onBack, onGameStart }) {
  const [mode, setMode] = useState(null); // null | 'create' | 'join' | 'browse'
  const [playerName, setPlayerName] = useState('');
  const [roomSettings, setRoomSettings] = useState({
    maxPlayers: 6,
    mapTheme: 'classic',
    startingMoney: 1500,
  });
  const [isLoading, setIsLoading] = useState(false);
  
  const {
    isConnected,
    isConnecting,
    connectionError,
    currentRoom,
    roomCode,
    isHost,
    players,
    playerName: storePlayerName,
    initialize,
    createRoom,
    joinRoom,
    joinAsSpectator,
    quickMatch,
    leaveRoom,
    setReady,
    startGame,
  } = useMultiplayerStore();
  
  // Initialize connection on mount
  useEffect(() => {
    initialize();
  }, []);
  
  // Load player name from store
  useEffect(() => {
    if (storePlayerName) {
      setPlayerName(storePlayerName);
    }
  }, [storePlayerName]);
  
  const handleCreateRoom = async () => {
    if (!playerName.trim()) {
      alert('请输入你的名字');
      return;
    }
    
    setIsLoading(true);
    try {
      const code = await createRoom(roomSettings);
      setMode('create');
    } catch (err) {
      console.error('Create room failed:', err);
    }
    setIsLoading(false);
  };

  const handleQuickMatch = async () => {
    if (!playerName.trim()) {
      alert('请输入你的名字');
      return;
    }

    setIsLoading(true);
    try {
      const code = await quickMatch();
      if (code) {
        setMode('join');
      }
    } catch (err) {
      console.error('Quick match failed:', err);
    }
    setIsLoading(false);
  };

  const handleJoinRoom = async (code) => {
    if (!playerName.trim()) {
      alert('请输入你的名字');
      return;
    }
    
    if (!code || code.length !== 6) {
      alert('请输入6位房间码');
      return;
    }
    
    setIsLoading(true);
    try {
      await joinRoom(code);
      setMode('join');
    } catch (err) {
      console.error('Join room failed:', err);
    }
    setIsLoading(false);
  };

  const handleSpectateRoom = async (code) => {
    if (!code || code.length !== 6) {
      alert('请输入6位房间码');
      return;
    }
    
    setIsLoading(true);
    try {
      const result = await joinAsSpectator(code);
      setMode('spectate');
      return result;
    } catch (err) {
      console.error('Spectate room failed:', err);
      alert(err.message || '旁观失败');
    }
    setIsLoading(false);
  };
  
  const handleLeaveRoom = () => {
    leaveRoom();
    setMode(null);
  };

  const handleExitSpectator = () => {
    useMultiplayerStore.getState().exitSpectatorMode();
    setMode(null);
  };

  const handleReady = () => {
    const myPlayer = players.find(p => p.isSelf);
    setReady(!myPlayer?.is_ready);
  };
  
  const handleStartGame = () => {
    startGame();
    if (onGameStart) {
      onGameStart();
    }
  };
  
  const handleStartOnlineGame = () => {
    // Transition to game with online multiplayer mode
    const { startOnlineGame } = useGameStore.getState();
    startOnlineGame(roomCode, isHost);
    
    // Initialize players for online game
    const store = useGameStore.getState();
    const onlinePlayers = players.map((p, i) => ({
      ...p,
      id: p.player_id,
      isAI: false,
      isOnline: true,
    }));
    
    store.setPieceSelection({});
    // Override the players with online players
    useGameStore.setState({ players: onlinePlayers });
    
    if (onGameStart) {
      onGameStart();
    }
  };
  
  // Loading state
  if (isConnecting) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-white">
        <div className="text-4xl mb-4 animate-spin">🌐</div>
        <p className="text-lg">连接中...</p>
      </div>
    );
  }
  
  // Room view (after creating or joining)
  if (mode === 'create' || mode === 'join') {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-white p-4">
        <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-3xl p-8 max-w-lg w-full border border-purple-500/30">
          {/* Room Header */}
          <div className="text-center mb-6">
            <div className="text-yellow-400 text-sm mb-1">
              {isHost ? '🏠 房主' : '👤 玩家'}
            </div>
            <div className="text-xs text-gray-400 mb-2">房间码</div>
            <div className="text-4xl font-bold tracking-widest text-yellow-400 mb-2">
              {roomCode}
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(roomCode);
                alert('房间码已复制!');
              }}
              className="text-xs text-purple-400 hover:text-purple-300 underline"
            >
              点击复制房间码
            </button>
            {/* Invite Friends Section */}
            <div className="mt-3 pt-3 border-t border-purple-500/30">
              <div className="text-xs text-gray-400 mb-1">邀请好友</div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const inviteText = `来玩Monopoly3D！房间码: ${roomCode}`;
                    navigator.clipboard.writeText(inviteText);
                    alert('邀请链接已复制!');
                  }}
                  className="flex-1 text-xs px-2 py-1 bg-purple-500/30 hover:bg-purple-500/50 rounded-lg text-purple-200 transition-colors"
                >
                  📋 复制邀请
                </button>
                <button
                  onClick={() => {
                    const shareText = `我在玩Monopoly3D！房间码是 ${roomCode}，快来加入我！🎮`;
                    if (navigator.share) {
                      navigator.share({ text: shareText });
                    } else {
                      navigator.clipboard.writeText(shareText);
                      alert('分享文本已复制!');
                    }
                  }}
                  className="flex-1 text-xs px-2 py-1 bg-blue-500/30 hover:bg-blue-500/50 rounded-lg text-blue-200 transition-colors"
                >
                  📤 分享
                </button>
              </div>
            </div>
            <div className="text-gray-400 text-sm">
              {players.length} / {currentRoom?.max_players || 6} 人
            </div>
          </div>
          
          {/* Players List */}
          <div className="bg-black/30 rounded-xl p-4 mb-4">
            <h3 className="text-sm font-bold text-purple-300 mb-3">玩家列表</h3>
            <div className="space-y-2">
              {players.map((player, index) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-black/20"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: player.color }}
                    />
                    <span className={player.isSelf ? 'text-yellow-400' : ''}>
                      {player.name}
                      {player.isSelf && ' (你)'}
                    </span>
                    {index === 0 && <span className="text-xs text-red-400">👑</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    {player.is_ready ? (
                      <span className="text-green-400 text-sm">✓ 已准备</span>
                    ) : (
                      <span className="text-gray-500 text-sm">等待中...</span>
                    )}
                    {isHost && !player.isSelf && (
                      <button
                        onClick={() => useMultiplayerStore.getState().kickPlayer(player.player_id)}
                        className="text-red-400 hover:text-red-300 text-xs px-2 py-1"
                      >
                        踢出
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {/* Empty slots */}
              {Array.from({ length: (currentRoom?.max_players || 6) - players.length }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="flex items-center p-2 rounded-lg bg-black/10 border border-dashed border-gray-600"
                >
                  <div className="w-3 h-3 rounded-full bg-gray-600 mr-2" />
                  <span className="text-gray-500 text-sm">等待加入...</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Room Settings (visible to host in waiting) */}
          {isHost && currentRoom?.status === 'waiting' && (
            <div className="bg-black/20 rounded-xl p-4 mb-4">
              <h3 className="text-sm font-bold text-purple-300 mb-3">房间设置</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">最大玩家:</span>
                  <span className="ml-2">{currentRoom?.max_players || 6}</span>
                </div>
                <div>
                  <span className="text-gray-400">初始资金:</span>
                  <span className="ml-2">${currentRoom?.settings?.startingMoney || 1500}</span>
                </div>
              </div>
            </div>
          )}

          {/* Voice Chat Controls */}
          {isInRoom && (
            <VoiceChatControls roomCode={currentRoom?.code} compact />
          )}
          
          {/* Game starting indicator */}
          {currentRoom?.status === 'playing' && (
            <div className="bg-green-900/50 rounded-xl p-4 mb-4 text-center">
              <p className="text-green-400">🎮 游戏即将开始!</p>
            </div>
          )}
          
          {/* Actions */}
          <div className="space-y-3">
            {isHost && currentRoom?.status === 'waiting' && (
              <button
                onClick={handleStartOnlineGame}
                disabled={players.length < 2}
                className="w-full px-6 py-4 bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl font-bold text-lg hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
              >
                {players.length < 2 ? '等待更多玩家...' : '🎮 开始游戏'}
              </button>
            )}
            
            {!isHost && (
              <button
                onClick={handleReady}
                className={`w-full px-6 py-4 rounded-xl font-bold text-lg transition-all ${
                  players.find(p => p.isSelf)?.is_ready
                    ? 'bg-gray-600 hover:bg-gray-500'
                    : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:scale-105'
                }`}
              >
                {players.find(p => p.isSelf)?.is_ready ? '取消准备' : '✓ 准备'}
              </button>
            )}
            
            <button
              onClick={handleLeaveRoom}
              className="w-full px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-bold transition-all"
            >
              退出房间
            </button>
          </div>
          
          {connectionError && (
            <div className="text-red-400 text-sm text-center mt-4 bg-red-900/30 rounded-lg p-2">
              {connectionError}
            </div>
          )}
        </div>
      </div>
    );
  }
  
  // Spectator view
  if (mode === 'spectate') {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-white p-4">
        <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-3xl p-8 max-w-lg w-full border border-purple-500/30">
          {/* Spectator Header */}
          <div className="text-center mb-6">
            <div className="text-purple-400 text-sm mb-1">👁️ 旁观模式</div>
            <div className="text-xs text-gray-400 mb-2">房间码</div>
            <div className="text-4xl font-bold tracking-widest text-purple-400 mb-2">
              {roomCode}
            </div>
            <div className="text-gray-400 text-sm">
              {players.length} / {currentRoom?.max_players || 6} 人
            </div>
          </div>
          
          {/* Spectator Notice */}
          <div className="bg-purple-900/50 rounded-xl p-4 mb-4 text-center">
            <p className="text-purple-300 text-sm mb-2">
              你正在旁观此游戏
            </p>
            <p className="text-gray-400 text-xs">
              你可以看到所有玩家的操作，但无法进行任何操作
            </p>
          </div>
          
          {/* Players List (Read-only) */}
          <div className="bg-black/30 rounded-xl p-4 mb-4">
            <h3 className="text-sm font-bold text-purple-300 mb-3">玩家列表</h3>
            <div className="space-y-2">
              {players.map((player, index) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-black/20"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: player.color }}
                    />
                    <span className={player.isSelf ? 'text-purple-400' : ''}>
                      {player.name}
                      {player.isSelf && ' (你-旁观)'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {player.is_online ? (
                      <span className="text-green-400 text-sm">🟢 在线</span>
                    ) : (
                      <span className="text-gray-500 text-sm">⚫ 离线</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Exit Spectator */}
          <button
            onClick={handleExitSpectator}
            className="w-full px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-bold transition-all"
          >
            退出旁观
          </button>
        </div>
      </div>
    );
  }
  
  // Main menu
  return (
    <div className="flex flex-col items-center justify-center h-screen text-white p-4">
      <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-3xl p-8 max-w-md w-full border border-purple-500/30">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="text-gray-400 hover:text-white"
          >
            ← 返回
          </button>
          <div className="text-center flex-1">
            <div className="text-4xl mb-2">🌐</div>
            <h2 className="text-xl font-bold">在线多人</h2>
          </div>
          <div className="w-8" />
        </div>
        
        {/* Connection Status */}
        {!isConnected && (
          <div className="text-center text-red-400 mb-4">
            ⚠️ 未连接到服务器
          </div>
        )}
        
        {/* Player Name Input */}
        <div className="mb-6">
          <label className="block text-sm text-purple-300 mb-2">你的名字</label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="输入你的昵称"
            maxLength={20}
            className="w-full px-4 py-3 bg-black/30 border border-purple-500/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-400"
          />
        </div>
        
        {/* Mode Selection */}
        <div className="space-y-4">
          <button
            onClick={handleCreateRoom}
            disabled={isLoading || !isConnected}
            className="w-full px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl font-bold text-lg hover:scale-105 transition-all disabled:opacity-50"
          >
            {isLoading ? '创建中...' : '🏠 创建房间'}
          </button>

          {/* Quick Match Button */}
          <button
            onClick={handleQuickMatch}
            disabled={isLoading || !isConnected}
            className="w-full px-6 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-bold text-lg hover:scale-105 transition-all disabled:opacity-50"
          >
            {isLoading ? '匹配中...' : '⚡ 快速匹配'}
          </button>
          
          <div className="text-center text-gray-500 my-2">或者</div>
          
          {/* Join by Code */}
          <JoinByCodeForm 
            onJoin={handleJoinRoom} 
            isLoading={isLoading} 
            isConnected={isConnected}
          />
          
          {/* Browse Rooms */}
          <div className="text-center text-gray-400 my-2">或者</div>
          
          <button
            onClick={() => setMode('browse')}
            disabled={!isConnected}
            className="w-full px-6 py-4 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl font-bold text-lg hover:scale-105 transition-all disabled:opacity-50"
          >
            🔍 浏览房间
          </button>
          
          {/* Spectate by Code */}
          <div className="text-center text-gray-500 my-2">或者</div>
          
          <button
            onClick={() => {
              const code = prompt('请输入要旁观的房间码:');
              if (code) handleSpectateRoom(code);
            }}
            disabled={!isConnected}
            className="w-full px-6 py-4 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl font-bold text-lg hover:scale-105 transition-all disabled:opacity-50"
          >
            👁️ 旁观房间
          </button>
        </div>
        
        {/* Room Browser */}
        {mode === 'browse' && (
          <div className="mt-6">
            <RoomBrowser
              onJoin={(code) => handleJoinRoom(code)}
              onBack={() => setMode(null)}
              onSpectate={(code) => {
                setMode(null);
                handleSpectateRoom(code);
              }}
            />
          </div>
        )}
        
        {/* Room Settings (when creating) */}
        {mode === 'create' && (
          <div className="mt-6 bg-black/30 rounded-xl p-4">
            <h3 className="text-sm font-bold text-purple-300 mb-3">房间设置</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400">最大玩家</label>
                <select
                  value={roomSettings.maxPlayers}
                  onChange={(e) => setRoomSettings(s => ({ ...s, maxPlayers: parseInt(e.target.value) }))}
                  className="w-full mt-1 px-3 py-2 bg-black/30 border border-purple-500/50 rounded-lg text-white"
                >
                  {[2, 3, 4, 5, 6].map(n => (
                    <option key={n} value={n}>{n} 人</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400">初始资金</label>
                <select
                  value={roomSettings.startingMoney}
                  onChange={(e) => setRoomSettings(s => ({ ...s, startingMoney: parseInt(e.target.value) }))}
                  className="w-full mt-1 px-3 py-2 bg-black/30 border border-purple-500/50 rounded-lg text-white"
                >
                  <option value={1000}>$1,000</option>
                  <option value={1500}>$1,500</option>
                  <option value={2000}>$2,000</option>
                  <option value={3000}>$3,000</option>
                </select>
              </div>
            </div>
          </div>
        )}
        
        {connectionError && (
          <div className="text-red-400 text-sm text-center mt-4 bg-red-900/30 rounded-lg p-2">
            {connectionError}
          </div>
        )}
      </div>
    </div>
  );
}

// Sub-component for joining by code
function JoinByCodeForm({ onJoin, isLoading, isConnected }) {
  const [code, setCode] = useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    onJoin(code);
  };
  
  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="输入房间码"
        maxLength={6}
        className="flex-1 px-4 py-3 bg-black/30 border border-purple-500/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 uppercase"
      />
      <button
        type="submit"
        disabled={isLoading || !isConnected || code.length !== 6}
        className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl font-bold hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
      >
        加入
      </button>
    </form>
  );
}
