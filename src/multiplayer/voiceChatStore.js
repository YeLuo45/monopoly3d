/**
 * Voice Chat Store using PeerJS for WebRTC voice communication
 * 
 * Features:
 * - Peer-to-peer voice chat using PeerJS
 * - Auto-detect and join voice channel on room join
 * - Mute/unmute controls
 * - Speaking indicator
 * - Volume controls per peer
 */

import { create } from 'zustand';
import Peer from 'peerjs';

// Get player info from localStorage
const getPlayerId = () => {
  let playerId = localStorage.getItem('monopoly3d_player_id');
  if (!playerId) {
    playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('monopoly3d_player_id', playerId);
  }
  return playerId;
};

const initialVoiceChatState = {
  // Voice chat connection state
  isConnected: false,
  isConnecting: false,
  localStream: null,
  peers: {}, // { peerId: { conn, stream, muted, speaking } }
  peerIds: [], // Array of connected peer IDs

  // Audio controls
  isMuted: false,
  isDeafened: false, // Can't hear others
  volume: 1.0,
  inputDeviceId: null,
  outputDeviceId: null,

  // Device enumeration
  availableInputDevices: [],
  availableOutputDevices: [],

  // Error state
  error: null,
  peerInstance: null,
  currentRoomCode: null,
};

export const useVoiceChatStore = create((set, get) => ({
  ...initialVoiceChatState,

  /**
   * Initialize PeerJS and enumerate devices
   */
  initialize: async () => {
    try {
      // Enumerate audio devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputDevices = devices.filter(d => d.kind === 'audioinput');
      const outputDevices = devices.filter(d => d.kind === 'audiooutput');

      set({
        availableInputDevices: inputDevices,
        availableOutputDevices: outputDevices,
      });

      console.log('[VoiceChat] Devices enumerated:', {
        inputs: inputDevices.length,
        outputs: outputDevices.length,
      });
    } catch (err) {
      console.error('[VoiceChat] Device enumeration failed:', err);
      set({ error: '无法获取音频设备' });
    }
  },

  /**
   * Connect to voice chat for a specific room
   */
  connectToRoom: async (roomCode) => {
    const { peerInstance, currentRoomCode, isConnecting } = get();

    // Don't reconnect to same room
    if (currentRoomCode === roomCode && isConnecting) {
      console.log('[VoiceChat] Already connecting to room:', roomCode);
      return;
    }

    // Disconnect from current room first
    if (peerInstance) {
      get().disconnectFromRoom();
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    set({ isConnecting: true, error: null, currentRoomCode: roomCode });

    try {
      // Get local audio stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Create PeerJS instance
      const playerId = getPlayerId();
      const peer = new Peer(`monopoly3d-${roomCode}-${playerId}`, {
        debug: 1,
      });

      set({ localStream: stream, peerInstance: peer });

      // Handle incoming connections
      peer.on('connection', (conn) => {
        console.log('[VoiceChat] Incoming connection from:', conn.peer);
        get()._handleIncomingConnection(conn);
      });

      // Handle incoming calls
      peer.on('call', (call) => {
        console.log('[VoiceChat] Incoming call from:', call.peer);
        // Answer with our stream
        const { localStream, isMuted } = get();
        if (localStream) {
          // If muted, don't send audio
          const streamToSend = isMuted ? new MediaStream() : localStream;
          call.answer(streamToSend);
          get()._handleCall(call);
        }
      });

      peer.on('open', (id) => {
        console.log('[VoiceChat] Peer opened with ID:', id);
        set({ isConnected: true, isConnecting: false });
      });

      peer.on('error', (err) => {
        console.error('[VoiceChat] Peer error:', err);
        set({
          error: `连接错误: ${err.message}`,
          isConnected: false,
          isConnecting: false,
        });
      });

      peer.on('disconnected', () => {
        console.log('[VoiceChat] Peer disconnected');
        set({ isConnected: false });
        // Attempt to reconnect
        peer.reconnect();
      });

      // Broadcast our presence via Supabase (if configured)
      await get()._broadcastPresence(roomCode, true);

    } catch (err) {
      console.error('[VoiceChat] Connection failed:', err);
      set({
        error: `无法连接语音: ${err.message}`,
        isConnected: false,
        isConnecting: false,
      });
    }
  },

  /**
   * Handle incoming data connection (for signaling)
   */
  _handleIncomingConnection: (conn) => {
    conn.on('open', () => {
      console.log('[VoiceChat] Data connection opened with:', conn.peer);
    });

    conn.on('data', (data) => {
      console.log('[VoiceChat] Received data from', conn.peer, ':', data);
    });

    conn.on('close', () => {
      console.log('[VoiceChat] Data connection closed with:', conn.peer);
      set(state => {
        const peers = { ...state.peers };
        delete peers[conn.peer];
        return {
          peers,
          peerIds: Object.keys(peers),
        };
      });
    });
  },

  /**
   * Handle incoming call
   */
  _handleCall: (call) => {
    const { isDeafened } = get();

    call.on('stream', (remoteStream) => {
      console.log('[VoiceChat] Received remote stream from:', call.peer);
      const volume = isDeafened ? 0 : get().volume;

      set(state => ({
        peers: {
          ...state.peers,
          [call.peer]: {
            call,
            conn: null,
            stream: remoteStream,
            muted: false,
            speaking: false,
            volume,
          },
        },
        peerIds: Object.keys({
          ...get().peers,
          [call.peer]: { call },
        }),
      }));

      // Attach remote stream to audio element
      get()._attachRemoteStream(call.peer, remoteStream, volume);
    });

    call.on('close', () => {
      console.log('[VoiceChat] Call closed with:', call.peer);
      get()._removePeer(call.peer);
    });

    call.on('error', (err) => {
      console.error('[VoiceChat] Call error with', call.peer, ':', err);
      get()._removePeer(call.peer);
    });
  },

  /**
   * Attach remote stream to audio element
   */
  _attachRemoteStream: (peerId, stream, volume) => {
    // Create or find audio element for this peer
    let audioEl = document.getElementById(`voice-audio-${peerId}`);
    if (!audioEl) {
      audioEl = document.createElement('audio');
      audioEl.id = `voice-audio-${peerId}`;
      audioEl.autoplay = true;
      audioEl.style.display = 'none';
      document.body.appendChild(audioEl);
    }

    audioEl.srcObject = stream;
    audioEl.volume = volume;
    audioEl.play().catch(err => {
      console.log('[VoiceChat] Audio play blocked:', err.message);
    });
  },

  /**
   * Remove peer from state
   */
  _removePeer: (peerId) => {
    set(state => {
      const peers = { ...state.peers };
      delete peers[peerId];

      // Remove audio element
      const audioEl = document.getElementById(`voice-audio-${peerId}`);
      if (audioEl) audioEl.remove();

      return {
        peers,
        peerIds: Object.keys(peers),
      };
    });
  },

  /**
   * Broadcast presence to room (via Supabase if configured)
   */
  _broadcastPresence: async (roomCode, isJoining) => {
    try {
      const { supabase, isSupabaseConfigured } = await import('./supabaseClient');
      if (!isSupabaseConfigured) return;

      const playerId = getPlayerId();

      if (isJoining) {
        await supabase.from('voice_participants').upsert({
          room_code: roomCode,
          player_id: playerId,
          joined_at: new Date().toISOString(),
        });
      } else {
        await supabase.from('voice_participants')
          .delete()
          .eq('room_code', roomCode)
          .eq('player_id', playerId);
      }
    } catch (err) {
      console.log('[VoiceChat] Presence broadcast failed:', err.message);
    }
  },

  /**
   * Call a specific peer in the room
   */
  callPeer: async (peerId) => {
    const { peerInstance, localStream, isMuted } = get();
    if (!peerInstance || !localStream) {
      console.log('[VoiceChat] Cannot call - not connected');
      return;
    }

    try {
      // Muted stream if muted
      const streamToSend = isMuted ? new MediaStream(localStream.getAudioTracks()) : localStream;

      const call = peerInstance.call(peerId, streamToSend);

      set(state => ({
        peers: {
          ...state.peers,
          [peerId]: {
            call,
            conn: null,
            stream: null,
            muted: false,
            speaking: false,
            volume: state.volume,
          },
        },
      }));

      // Handle incoming stream from peer
      call.on('stream', (remoteStream) => {
        console.log('[VoiceChat] Received stream from called peer:', peerId);
        const { isDeafened, volume } = get();
        set(state => ({
          peers: {
            ...state.peers,
            [peerId]: {
              ...state.peers[peerId],
              stream: remoteStream,
              volume: isDeafened ? 0 : volume,
            },
          },
        }));
        get()._attachRemoteStream(peerId, remoteStream, isDeafened ? 0 : volume);
      });

      call.on('close', () => {
        get()._removePeer(peerId);
      });

    } catch (err) {
      console.error('[VoiceChat] Call failed:', err);
    }
  },

  /**
   * Toggle mute
   */
  toggleMute: () => {
    const { localStream, isMuted, peers } = get();

    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = isMuted; // If was muted, now enabled
      });
    }

    // Update all peer calls with new muted state
    Object.values(peers).forEach(peer => {
      if (peer.call && peer.call.localStream) {
        peer.call.localStream.getAudioTracks().forEach(track => {
          track.enabled = !isMuted;
        });
      }
    });

    set({ isMuted: !isMuted });
  },

  /**
   * Toggle deafen (can't hear others)
   */
  toggleDeafen: () => {
    const { isDeafened, peers, volume } = get();

    // Update all peer volumes
    const newVolume = isDeafened ? get().volume : 0;
    Object.keys(peers).forEach(peerId => {
      const audioEl = document.getElementById(`voice-audio-${peerId}`);
      if (audioEl) {
        audioEl.volume = newVolume;
      }
    });

    set({ isDeafened: !isDeafened });
  },

  /**
   * Set volume for all peers
   */
  setVolume: (volume) => {
    const { peers, isDeafened } = get();
    const effectiveVolume = isDeafened ? 0 : volume;

    Object.keys(peers).forEach(peerId => {
      const audioEl = document.getElementById(`voice-audio-${peerId}`);
      if (audioEl) {
        audioEl.volume = effectiveVolume;
      }
    });

    set(state => ({
      volume,
      peers: Object.fromEntries(
        Object.entries(state.peers).map(([id, p]) => [id, { ...p, volume: effectiveVolume }])
      ),
    }));
  },

  /**
   * Set input device
   */
  setInputDevice: async (deviceId) => {
    const { localStream, currentRoomCode } = get();

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
      });

      // Replace tracks in all active calls
      const { peers, isMuted } = get();
      const audioTrack = newStream.getAudioTracks()[0];
      if (audioTrack && !isMuted) {
        audioTrack.enabled = true;
      } else if (audioTrack) {
        audioTrack.enabled = false;
      }

      Object.values(peers).forEach(peer => {
        if (peer.call) {
          const sender = peer.call.peerConnection?.getSenders().find(s => s.track?.kind === 'audio');
          if (sender && audioTrack) {
            sender.replaceTrack(audioTrack);
          }
        }
      });

      // Stop old stream
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }

      set({ localStream: newStream, inputDeviceId: deviceId });
    } catch (err) {
      console.error('[VoiceChat] Failed to change input device:', err);
      set({ error: '无法切换音频设备' });
    }
  },

  /**
   * Set output device
   */
  setOutputDevice: (deviceId) => {
    set({ outputDeviceId: deviceId });
  },

  /**
   * Disconnect from voice chat
   */
  disconnectFromRoom: () => {
    const { peerInstance, localStream, currentRoomCode } = get();

    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }

    // Close all peer connections
    const { peers } = get();
    Object.values(peers).forEach(peer => {
      if (peer.call) peer.call.close();
      if (peer.conn) peer.conn.close();
    });

    // Destroy peer
    if (peerInstance) {
      peerInstance.destroy();
    }

    // Remove all audio elements
    document.querySelectorAll('[id^="voice-audio-"]').forEach(el => el.remove());

    // Broadcast leaving
    if (currentRoomCode) {
      get()._broadcastPresence(currentRoomCode, false);
    }

    set({
      ...initialVoiceChatState,
      availableInputDevices: get().availableInputDevices,
      availableOutputDevices: get().availableOutputDevices,
    });
  },

  /**
   * Get speaking state for a peer
   */
  isPeerSpeaking: (peerId) => {
    const { peers } = get();
    return peers[peerId]?.speaking || false;
  },
}));