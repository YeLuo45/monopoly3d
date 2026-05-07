/**
 * Multiplayer HUD Component
 * 
 * Displays online multiplayer status during gameplay:
 * - Current turn indicator
 * - Player list with ready/status
 * - Chat panel (collapsible)
 * - Turn timer
 */

import { useState, useEffect, useRef } from 'react';
import { useMultiplayerStore } from './multiplayerStore';

export default function MultiplayerHUD({ currentPlayerIndex = 0, isMyTurn = false, turnTimeLimit = 30 }) {
  const [showChat, setShowChat] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [timeLeft, setTimeLeft] = useState(turnTimeLimit);
  const chatEndRef = useRef(null);
  
  const {
    players,
    currentRoom,
    isHost,
    chatMessages,
    unreadChatCount,
    clearUnreadChat,
    sendChatMessage,
    playerName,
  } = useMultiplayerStore();
  
  // Turn timer
  useEffect(() => {
    if (!isMyTurn || !currentRoom?.status === 'playing') return;
    
    setTimeLeft(turnTimeLimit);
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timer);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [currentPlayerIndex, isMyTurn, currentRoom?.status]);
  
  // Auto-scroll chat
  useEffect(() => {
    if (showChat && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, showChat]);
  
  // Clear unread when opening chat
  useEffect(() => {
    if (showChat) {
      clearUnreadChat();
    }
  }, [showChat]);
  
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    
    sendChatMessage(chatMessage);
    setChatMessage('');
  };
  
  if (!currentRoom) return null;
  
  return (
    <>
      {/* Main HUD - Top Right */}
      <div className="absolute top-20 right-4 z-40 flex flex-col gap-2">
        {/* Room Info */}
        <div className="bg-black/70 backdrop-blur-sm rounded-xl p-3 text-white text-sm">
          <div className="text-yellow-400 font-bold tracking-wider mb-1">
            {currentRoom.code}
          </div>
          <div className="text-gray-400 text-xs">
            {currentRoom.status === 'playing' ? '🎮 游戏中' : '⏳ 等待中'}
          </div>
        </div>
        
        {/* Players List */}
        <div className="bg-black/70 backdrop-blur-sm rounded-xl p-3 min-w-[180px]">
          <div className="text-xs text-purple-300 font-bold mb-2">
            玩家 ({players.length}/{currentRoom.max_players})
          </div>
          <div className="space-y-1">
            {players.map((player, index) => (
              <div
                key={player.id}
                className={`flex items-center gap-2 p-1.5 rounded-lg transition-all ${
                  index === currentPlayerIndex 
                    ? 'bg-yellow-500/30 border border-yellow-500/50' 
                    : ''
                }`}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: player.color }}
                />
                <span className={`text-sm truncate flex-1 ${
                  player.isSelf ? 'text-yellow-400' : 'text-white'
                }`}>
                  {player.name}
                  {player.isSelf && ' (你)'}
                </span>
                {index === currentPlayerIndex && (
                  <span className="text-xs text-yellow-400 animate-pulse">🎯</span>
                )}
                {!player.is_online && (
                  <span className="text-xs text-gray-500">离线</span>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Turn Indicator */}
        {currentRoom.status === 'playing' && (
          <div className={`bg-black/70 backdrop-blur-sm rounded-xl p-3 ${
            isMyTurn ? 'bg-yellow-600/30 border border-yellow-500/50' : ''
          }`}>
            <div className="text-xs text-gray-400 mb-1">当前回合</div>
            <div className={`font-bold ${
              isMyTurn ? 'text-yellow-400' : 'text-white'
            }`}>
              {players[currentPlayerIndex]?.name || '未知'}
            </div>
            {isMyTurn && (
              <div className="text-xs text-yellow-400 mt-1">
                ⏱️ {timeLeft}s
              </div>
            )}
          </div>
        )}
        
        {/* Host Badge */}
        {isHost && (
          <div className="bg-red-900/50 backdrop-blur-sm rounded-xl px-3 py-2 text-center">
            <span className="text-red-400 text-xs">👑 房主</span>
          </div>
        )}
      </div>
      
      {/* Chat Toggle Button */}
      <button
        onClick={() => setShowChat(!showChat)}
        className="absolute bottom-4 right-4 z-40 px-4 py-2 bg-black/70 backdrop-blur-sm rounded-xl text-white flex items-center gap-2 hover:bg-black/80 transition-all"
      >
        💬 聊天
        {unreadChatCount > 0 && (
          <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadChatCount > 9 ? '9+' : unreadChatCount}
          </span>
        )}
      </button>
      
      {/* Chat Panel */}
      {showChat && (
        <div className="absolute bottom-16 right-4 z-40 w-80 h-96 bg-black/80 backdrop-blur-sm rounded-xl flex flex-col border border-purple-500/30">
          {/* Chat Header */}
          <div className="flex items-center justify-between p-3 border-b border-purple-500/30">
            <span className="text-white font-bold">聊天室</span>
            <button
              onClick={() => setShowChat(false)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {chatMessages.length === 0 ? (
              <div className="text-center text-gray-500 text-sm py-8">
                暂无消息
              </div>
            ) : (
              chatMessages.map((msg, index) => (
                <div
                  key={index}
                  className={`text-sm ${
                    msg.player_id === useMultiplayerStore.getState().playerId 
                      ? 'text-right' 
                      : 'text-left'
                  }`}
                >
                  <div className={`inline-block max-w-[85%] rounded-lg px-3 py-2 ${
                    msg.player_id === useMultiplayerStore.getState().playerId
                      ? 'bg-blue-600/50 text-blue-100'
                      : 'bg-gray-700/50 text-gray-100'
                  }`}>
                    <div className="text-xs text-gray-400 mb-1">
                      <span style={{ color: msg.player_color }}>{msg.player_name}</span>
                    </div>
                    <div>{msg.message}</div>
                  </div>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>
          
          {/* Input */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-purple-500/30">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="输入消息..."
                maxLength={200}
                className="flex-1 px-3 py-2 bg-black/30 border border-purple-500/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 text-sm"
              />
              <button
                type="submit"
                disabled={!chatMessage.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white text-sm disabled:opacity-50"
              >
                发送
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
