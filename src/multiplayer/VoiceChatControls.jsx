/**
 * VoiceChatControls - In-game voice chat controls
 * 
 * Features:
 * - Mute/unmute toggle
 * - Deafen toggle
 * - Volume slider
 * - Connected peers list
 * - Device selector
 */

import { useState, useEffect } from 'react';
import { useVoiceChatStore } from './voiceChatStore';

export default function VoiceChatControls({ roomCode, compact = false }) {
  const [showSettings, setShowSettings] = useState(false);
  const [activePeers, setActivePeers] = useState([]);

  // Voice chat state
  const {
    isConnected,
    isConnecting,
    isMuted,
    isDeafened,
    volume,
    error,
    peers,
    peerIds,
    availableInputDevices,
    availableOutputDevices,
    inputDeviceId,
    outputDeviceId,
    initialize,
    connectToRoom,
    disconnectFromRoom,
    toggleMute,
    toggleDeafen,
    setVolume,
    setInputDevice,
    setOutputDevice,
  } = useVoiceChatStore();

  // Initialize on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Connect to room when roomCode changes
  useEffect(() => {
    if (roomCode && !isConnected && !isConnecting) {
      connectToRoom(roomCode);
    }
  }, [roomCode, isConnected, isConnecting, connectToRoom]);

  // Update active peers list
  useEffect(() => {
    setActivePeers(peerIds.map(id => ({
      id,
      shortId: id.split('-').pop(),
      speaking: peers[id]?.speaking || false,
    })));
  }, [peerIds, peers]);

  if (!roomCode) return null;

  const handleToggleVoice = () => {
    if (isConnected) {
      disconnectFromRoom();
    } else {
      connectToRoom(roomCode);
    }
  };

  if (compact) {
    // Compact mode for lobby
    return (
      <div className="bg-black/20 rounded-xl p-3 mb-4">
        <div className="flex items-center gap-3">
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            {isConnecting && (
              <div className="w-3 h-3 rounded-full bg-yellow-400 animate-pulse" />
            )}
            {isConnected && !isMuted && (
              <div className="w-3 h-3 rounded-full bg-green-400" />
            )}
            {isConnected && isMuted && (
              <div className="w-3 h-3 rounded-full bg-red-400" />
            )}
            {!isConnected && !isConnecting && (
              <div className="w-3 h-3 rounded-full bg-gray-500" />
            )}
            <span className="text-xs text-gray-400">
              {isConnecting ? '连接中...' : isConnected ? `${peerIds.length + 1}人` : '未连接'}
            </span>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 flex-1">
            {/* Mute Button */}
            <button
              onClick={toggleMute}
              disabled={!isConnected}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                isMuted
                  ? 'bg-red-500/30 text-red-300 hover:bg-red-500/50'
                  : 'bg-gray-500/30 text-gray-300 hover:bg-gray-500/50'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isMuted ? '🔇' : '🎤'}
            </button>

            {/* Deafen Button */}
            <button
              onClick={toggleDeafen}
              disabled={!isConnected}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                isDeafened
                  ? 'bg-red-500/30 text-red-300 hover:bg-red-500/50'
                  : 'bg-gray-500/30 text-gray-300 hover:bg-gray-500/50'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isDeafened ? '🔕' : '🔊'}
            </button>

            {/* Settings */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              disabled={!isConnected}
              className="px-2 py-1.5 rounded-lg bg-gray-500/30 text-gray-300 hover:bg-gray-500/50 text-sm disabled:opacity-50"
            >
              ⚙️
            </button>
          </div>

          {/* Join/Leave */}
          {!isConnected && !isConnecting && (
            <button
              onClick={handleToggleVoice}
              className="px-4 py-1.5 bg-green-500/30 hover:bg-green-500/50 rounded-lg text-green-200 text-sm transition-colors"
            >
              加入语音
            </button>
          )}
        </div>

        {/* Settings Panel */}
        {showSettings && isConnected && (
          <div className="mt-3 pt-3 border-t border-gray-700">
            {/* Volume */}
            <div className="mb-3">
              <label className="text-xs text-gray-400 mb-1 block">音量</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={isDeafened ? 0 : volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-full"
                disabled={isDeafened}
              />
            </div>

            {/* Input Device */}
            {availableInputDevices.length > 1 && (
              <div className="mb-3">
                <label className="text-xs text-gray-400 mb-1 block">麦克风</label>
                <select
                  value={inputDeviceId || ''}
                  onChange={(e) => setInputDevice(e.target.value || null)}
                  className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-xs"
                >
                  <option value="">默认设备</option>
                  {availableInputDevices.map(d => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `麦克风 ${d.deviceId.slice(0, 8)}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Output Device */}
            {availableOutputDevices.length > 1 && (
              <div className="mb-3">
                <label className="text-xs text-gray-400 mb-1 block">扬声器</label>
                <select
                  value={outputDeviceId || ''}
                  onChange={(e) => setOutputDevice(e.target.value || null)}
                  className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-xs"
                >
                  <option value="">默认设备</option>
                  {availableOutputDevices.map(d => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `扬声器 ${d.deviceId.slice(0, 8)}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-2 text-xs text-red-400">
            {error}
          </div>
        )}
      </div>
    );
  }

  // Full mode (for settings panel)
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-purple-300">🎤 语音聊天</h3>
        <div className="flex items-center gap-2">
          {isConnected && (
            <span className="text-xs text-green-400">已连接</span>
          )}
          {isConnecting && (
            <span className="text-xs text-yellow-400">连接中...</span>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleMute}
          disabled={!isConnected}
          className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
            isMuted
              ? 'bg-red-500/30 text-red-300 border border-red-500/50 hover:bg-red-500/50'
              : 'bg-green-500/30 text-green-200 border border-green-500/50 hover:bg-green-500/50'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isMuted ? '🔇 取消静音' : '🎤 静音'}
        </button>

        <button
          onClick={toggleDeafen}
          disabled={!isConnected}
          className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
            isDeafened
              ? 'bg-red-500/30 text-red-300 border border-red-500/50 hover:bg-red-500/50'
              : 'bg-gray-500/30 text-gray-300 border border-gray-500/50 hover:bg-gray-500/50'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isDeafened ? '🔕 取消屏蔽' : '🔊 屏蔽声音'}
        </button>
      </div>

      {/* Volume */}
      <div>
        <label className="text-xs text-gray-400 mb-1 block">
          音量 ({Math.round((isDeafened ? 0 : volume) * 100)}%)
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={isDeafened ? 0 : volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="w-full"
          disabled={isDeafened}
        />
      </div>

      {/* Connected Peers */}
      {isConnected && peerIds.length > 0 && (
        <div>
          <label className="text-xs text-gray-400 mb-2 block">
            通话中的玩家 ({peerIds.length})
          </label>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {activePeers.map(peer => (
              <div
                key={peer.id}
                className="flex items-center gap-2 px-2 py-1 bg-black/20 rounded"
              >
                <div className={`w-2 h-2 rounded-full ${
                  peer.speaking ? 'bg-green-400 animate-pulse' : 'bg-gray-500'
                }`} />
                <span className="text-xs text-gray-300">
                  玩家 {peer.shortId}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-xs text-red-400 bg-red-500/10 p-2 rounded">
          {error}
        </div>
      )}

      {/* Leave Button */}
      {isConnected && (
        <button
          onClick={disconnectFromRoom}
          className="w-full px-4 py-2 bg-gray-500/30 hover:bg-gray-500/50 rounded-lg text-gray-300 text-sm transition-colors"
        >
          离开语音
        </button>
      )}
    </div>
  );
}