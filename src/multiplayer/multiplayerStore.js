/**
 * Multiplayer Store using Supabase
 * 
 * Manages online multiplayer game state with:
 * - Room creation/joining
 * - Real-time subscriptions via Supabase Realtime
 * - Player management
 * - Game event synchronization
 * - Chat functionality
 */

import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const PLAYER_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];

// Generate a unique player ID for this browser session
const generatePlayerId = () => {
  let playerId = localStorage.getItem('monopoly3d_player_id');
  if (!playerId) {
    playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('monopoly3d_player_id', playerId);
  }
  return playerId;
};

// Generate 6-character room code
const generateRoomCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const initialState = {
  // Connection state
  isConnected: false,
  isConnecting: false,
  connectionError: null,
  
  // Player info
  playerId: generatePlayerId(),
  playerName: localStorage.getItem('monopoly3d_student_id') || '匿名玩家',
  playerColor: PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)],
  
  // Room state
  currentRoom: null,
  roomCode: null,
  isHost: false,
  
  // Spectator mode
  isSpectator: false,
  
  // Players in room
  players: [],
  playerCount: 0,
  
  // Chat
  chatMessages: [],
  unreadChatCount: 0,
  
  // Subscriptions
  subscriptions: [],
  
  // Room list (for browsing)
  availableRooms: [],
  
  // Replay recording
  isRecordingReplay: false,
  replayId: null,
  replayEvents: [],
  replayStartTime: null,
  
  // Replay playback
  isPlaybackMode: false,
  playbackEvents: [],
  playbackIndex: 0,
  playbackSpeed: 1,
};

export const useMultiplayerStore = create((set, get) => ({
  ...initialState,
  
  // ============================================
  // CONNECTION
  // ============================================
  
  /**
   * Initialize Supabase connection and anonymous auth
   */
  initialize: async () => {
    if (!isSupabaseConfigured()) {
      set({ connectionError: 'Supabase未配置，请设置环境变量' });
      return false;
    }
    
    set({ isConnecting: true, connectionError: null });
    
    try {
      // Sign in anonymously
      const { data: { session }, error } = await supabase.auth.signInAnonymously();
      
      if (error) throw error;
      
      set({ 
        isConnected: true, 
        isConnecting: false,
        playerId: session?.user?.id || get().playerId,
      });
      
      console.log('[MultiplayerStore] Connected to Supabase');
      return true;
    } catch (err) {
      console.error('[MultiplayerStore] Connection error:', err);
      set({ 
        isConnected: false, 
        isConnecting: false,
        connectionError: err.message,
      });
      return false;
    }
  },
  
  /**
   * Disconnect and cleanup subscriptions
   */
  disconnect: () => {
    const { subscriptions } = get();
    
    // Unsubscribe from all channels
    subscriptions.forEach(sub => {
      if (sub) sub.unsubscribe();
    });
    
    set({
      ...initialState,
      playerId: get().playerId,
      playerName: get().playerName,
      playerColor: get().playerColor,
    });
  },
  
  // ============================================
  // ROOM MANAGEMENT
  // ============================================
  
  /**
   * Create a new room as host
   */
  createRoom: async (settings = {}) => {
    const { playerId, playerName, playerColor } = get();
    const code = generateRoomCode();
    
    set({ isConnecting: true, connectionError: null });
    
    try {
      // Insert room into database
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .insert({
          code,
          host_id: playerId,
          status: 'waiting',
          max_players: settings.maxPlayers || 6,
          settings: settings,
        })
        .select()
        .single();
      
      if (roomError) throw roomError;
      
      // Add self as first player
      const { data: player, error: playerError } = await supabase
        .from('players')
        .insert({
          room_id: room.id,
          player_id: playerId,
          name: playerName,
          color: playerColor,
          order_index: 0,
          is_ready: false,
          is_online: true,
        })
        .select()
        .single();
      
      if (playerError) throw playerError;
      
      set({
        currentRoom: room,
        roomCode: code,
        isHost: true,
        players: [{ ...player, isSelf: true }],
        playerCount: 1,
        isConnecting: false,
      });
      
      // Subscribe to room updates
      get().subscribeToRoom(room.id);
      
      console.log('[MultiplayerStore] Room created:', code);
      return code;
    } catch (err) {
      console.error('[MultiplayerStore] Create room error:', err);
      set({ 
        isConnecting: false,
        connectionError: '创建房间失败: ' + err.message,
      });
      throw err;
    }
  },
  
  /**
   * Join an existing room by code
   */
  joinRoom: async (code) => {
    const { playerId, playerName, playerColor } = get();
    const upperCode = code.toUpperCase();
    
    set({ isConnecting: true, connectionError: null });
    
    try {
      // Find room by code
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('code', upperCode)
        .single();
      
      if (roomError) throw new Error('房间不存在');
      if (room.status !== 'waiting') throw new Error('房间已开始游戏');
      
      // Check if player already in room (reconnection)
      const { data: existingPlayer } = await supabase
        .from('players')
        .select('*')
        .eq('room_id', room.id)
        .eq('player_id', playerId)
        .single();
      
      if (existingPlayer) {
        // Update online status
        await supabase
          .from('players')
          .update({ is_online: true })
          .eq('id', existingPlayer.id);
        
        set({
          currentRoom: room,
          roomCode: upperCode,
          isHost: room.host_id === playerId,
          isConnecting: false,
        });
        
        get().subscribeToRoom(room.id);
        return;
      }
      
      // Check room capacity
      const { count } = await supabase
        .from('players')
        .select('*', { count: 'exact' })
        .eq('room_id', room.id);
      
      if (count >= room.max_players) {
        throw new Error('房间已满');
      }
      
      // Add player to room
      const { data: player, error: playerError } = await supabase
        .from('players')
        .insert({
          room_id: room.id,
          player_id: playerId,
          name: playerName,
          color: playerColor,
          is_ready: false,
          is_online: true,
        })
        .select()
        .single();
      
      if (playerError) throw playerError;
      
      set({
        currentRoom: room,
        roomCode: upperCode,
        isHost: room.host_id === playerId,
        isConnecting: false,
      });
      
      // Subscribe to room updates
      get().subscribeToRoom(room.id);
      
      console.log('[MultiplayerStore] Joined room:', upperCode);
    } catch (err) {
      console.error('[MultiplayerStore] Join room error:', err);
      set({
        isConnecting: false,
        connectionError: err.message,
      });
      throw err;
    }
  },
  
  /**
   * Leave current room
   */
  leaveRoom: async () => {
    const { currentRoom, playerId } = get();
    
    if (!currentRoom) return;
    
    try {
      // Update player status to offline
      await supabase
        .from('players')
        .update({ is_online: false })
        .eq('room_id', currentRoom.id)
        .eq('player_id', playerId);
      
      // If host leaving, transfer host or close room
      if (get().isHost) {
        const { data: otherPlayers } = await supabase
          .from('players')
          .select('*')
          .eq('room_id', currentRoom.id)
          .eq('is_online', true)
          .neq('player_id', playerId)
          .limit(1);
        
        if (otherPlayers && otherPlayers.length > 0) {
          // Transfer host to other player
          await supabase
            .from('rooms')
            .update({ host_id: otherPlayers[0].player_id })
            .eq('id', currentRoom.id);
        } else {
          // No other players, delete room
          await supabase
            .from('rooms')
            .delete()
            .eq('id', currentRoom.id);
        }
      }
    } catch (err) {
      console.error('[MultiplayerStore] Leave room error:', err);
    }
    
    get().disconnect();
  },
  
  /**
   * Subscribe to room updates via Realtime
   */
  subscribeToRoom: (roomId) => {
    const { subscriptions } = get();
    
    // Subscribe to players changes
    const playersChannel = supabase
      .channel(`room_${roomId}_players`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'players',
        filter: `room_id=eq.${roomId}`,
      }, (payload) => {
        console.log('[MultiplayerStore] Players changed:', payload);
        get().refreshPlayers();
      })
      .subscribe();
    
    // Subscribe to room changes
    const roomChannel = supabase
      .channel(`room_${roomId}_room`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'rooms',
        filter: `id=eq.${roomId}`,
      }, (payload) => {
        console.log('[MultiplayerStore] Room updated:', payload);
        const { currentRoom } = get();
        if (currentRoom) {
          set({ currentRoom: { ...currentRoom, ...payload.new } });
          
          // Check if game started
          if (payload.new.status === 'playing' && currentRoom.status === 'waiting') {
            get().onGameStart();
          }
        }
      })
      .subscribe();
    
    // Subscribe to game events
    const eventsChannel = supabase
      .channel(`room_${roomId}_events`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'game_events',
        filter: `room_id=eq.${roomId}`,
      }, (payload) => {
        console.log('[MultiplayerStore] Game event:', payload);
        get().onGameEvent(payload.new);
      })
      .subscribe();
    
    // Subscribe to chat messages
    const chatChannel = supabase
      .channel(`room_${roomId}_chat`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `room_id=eq.${roomId}`,
      }, (payload) => {
        console.log('[MultiplayerStore] Chat message:', payload);
        get().addChatMessage(payload.new);
      })
      .subscribe();
    
    set({
      subscriptions: [...subscriptions, playersChannel, roomChannel, eventsChannel, chatChannel],
    });
    
    // Initial load of players
    get().refreshPlayers();
  },
  
  /**
   * Refresh players list from database
   */
  refreshPlayers: async () => {
    const { currentRoom, playerId } = get();
    if (!currentRoom) return;
    
    try {
      const { data: players, error } = await supabase
        .from('players')
        .select('*')
        .eq('room_id', currentRoom.id)
        .order('order_index');
      
      if (error) throw error;
      
      set({
        players: players.map(p => ({
          ...p,
          isSelf: p.player_id === playerId,
        })),
        playerCount: players.length,
      });
    } catch (err) {
      console.error('[MultiplayerStore] Refresh players error:', err);
    }
  },
  
  // ============================================
  // PLAYER ACTIONS
  // ============================================
  
  /**
   * Set player ready status
   */
  setReady: async (isReady) => {
    const { currentRoom, playerId } = get();
    if (!currentRoom) return;
    
    try {
      await supabase
        .from('players')
        .update({ is_ready: isReady })
        .eq('room_id', currentRoom.id)
        .eq('player_id', playerId);
    } catch (err) {
      console.error('[MultiplayerStore] Set ready error:', err);
    }
  },
  
  /**
   * Update player position and money
   */
  updatePlayerState: async (updates) => {
    const { currentRoom, playerId } = get();
    if (!currentRoom) return;
    
    try {
      await supabase
        .from('players')
        .update(updates)
        .eq('room_id', currentRoom.id)
        .eq('player_id', playerId);
    } catch (err) {
      console.error('[MultiplayerStore] Update player state error:', err);
    }
  },
  
  /**
   * Kick a player (host only)
   */
  kickPlayer: async (targetPlayerId) => {
    const { isHost, currentRoom } = get();
    if (!isHost || !currentRoom) return;
    
    try {
      await supabase
        .from('players')
        .delete()
        .eq('room_id', currentRoom.id)
        .eq('player_id', targetPlayerId);
    } catch (err) {
      console.error('[MultiplayerStore] Kick player error:', err);
    }
  },
  
  // ============================================
  // GAME ACTIONS
  // ============================================
  
  /**
   * Start the game (host only)
   */
  startGame: async () => {
    const { currentRoom, isHost, players } = get();
    if (!currentRoom || !isHost) return;
    
    // Check all players are ready
    const allReady = players.every(p => p.is_ready || p.isSelf);
    if (!allReady) {
      set({ connectionError: '等待其他玩家准备' });
      return;
    }
    
    try {
      await supabase
        .from('rooms')
        .update({ status: 'playing' })
        .eq('id', currentRoom.id);
    } catch (err) {
      console.error('[MultiplayerStore] Start game error:', err);
    }
  },
  
  /**
   * Record a game event (dice roll, property purchase, etc.)
   */
  recordGameEvent: async (eventType, payload) => {
    const { currentRoom, playerId, currentRoom: { current_turn } } = get();
    if (!currentRoom) return;
    
    try {
      await supabase
        .from('game_events')
        .insert({
          room_id: currentRoom.id,
          player_id: playerId,
          event_type: eventType,
          payload,
          turn_index: current_turn,
        });
    } catch (err) {
      console.error('[MultiplayerStore] Record game event error:', err);
    }
  },
  
  /**
   * Advance to next turn
   */
  nextTurn: async () => {
    const { currentRoom, players, currentRoom: { current_turn } } = get();
    if (!currentRoom) return;
    
    const nextTurn = (current_turn + 1) % players.length;
    
    try {
      await supabase
        .from('rooms')
        .update({ current_turn: nextTurn })
        .eq('id', currentRoom.id);
    } catch (err) {
      console.error('[MultiplayerStore] Next turn error:', err);
    }
  },
  
  /**
   * Handle game start callback - override this in component
   */
  onGameStart: () => {
    console.log('[MultiplayerStore] Game started!');
    // This will be connected to the game store
  },
  
  /**
   * Handle incoming game event - override this in component
   */
  onGameEvent: (event) => {
    console.log('[MultiplayerStore] Game event received:', event);
  },
  
  // ============================================
  // CHAT
  // ============================================
  
  /**
   * Send a chat message
   */
  sendChatMessage: async (message) => {
    const { currentRoom, playerId, playerName, playerColor } = get();
    if (!currentRoom || !message.trim()) return;
    
    try {
      await supabase
        .from('chat_messages')
        .insert({
          room_id: currentRoom.id,
          player_id: playerId,
          player_name: playerName,
          player_color: playerColor,
          message: message.trim(),
        });
    } catch (err) {
      console.error('[MultiplayerStore] Send chat error:', err);
    }
  },
  
  /**
   * Add a chat message to local state
   */
  addChatMessage: (message) => {
    set(state => ({
      chatMessages: [...state.chatMessages, message],
      unreadChatCount: state.unreadChatCount + 1,
    }));
  },
  
  /**
   * Clear unread chat count
   */
  clearUnreadChat: () => {
    set({ unreadChatCount: 0 });
  },
  
  // ============================================
  // ROOM BROWSER
  // ============================================
  
  /**
   * Subscribe to available rooms list
   */
  subscribeToRoomList: () => {
    const channel = supabase
      .channel('room_list')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'rooms',
      }, () => {
        get().refreshRoomList();
      })
      .subscribe();
    
    set(state => ({
      subscriptions: [...state.subscriptions, channel],
    }));
    
    // Initial load
    get().refreshRoomList();
  },
  
  /**
   * Refresh available rooms list
   */
  refreshRoomList: async () => {
    try {
      const { data: rooms, error } = await supabase
        .from('rooms')
        .select('*, players(count)')
        .eq('status', 'waiting')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      
      set({
        availableRooms: rooms.map(room => ({
          ...room,
          playerCount: room.players?.[0]?.count || 0,
        })),
      });
    } catch (err) {
      console.error('[MultiplayerStore] Refresh room list error:', err);
    }
  },
  
  /**
   * Unsubscribe from room list
   */
  unsubscribeFromRoomList: () => {
    const channel = supabase.channel('room_list');
    channel.unsubscribe();
    set(state => ({
      subscriptions: state.subscriptions.filter(s => s !== channel),
    }));
  },

  // ============================================
  // SPECTATOR MODE
  // ============================================

  /**
   * Join a room as a spectator (watch-only mode)
   */
  joinAsSpectator: async (code) => {
    const { playerName, playerColor } = get();
    const upperCode = code.toUpperCase();
    
    set({ isConnecting: true, connectionError: null });
    
    try {
      // Find room by code
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('code', upperCode)
        .single();
      
      if (roomError) throw new Error('房间不存在');
      if (room.status !== 'playing') throw new Error('游戏未开始，无法旁观');
      
      // Get current game state for spectators
      const { data: players } = await supabase
        .from('players')
        .select('*')
        .eq('room_id', room.id)
        .order('order_index');
      
      // Get game events for replay
      const { data: events } = await supabase
        .from('game_events')
        .select('*')
        .eq('room_id', room.id)
        .order('created_at', { ascending: true });
      
      // Get chat messages
      const { data: chatMessages } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', room.id)
        .order('created_at', { ascending: true });
      
      set({
        currentRoom: room,
        roomCode: upperCode,
        isHost: false,
        isSpectator: true,
        players: players || [],
        playerCount: players?.length || 0,
        chatMessages: chatMessages || [],
        isConnecting: false,
      });
      
      // Subscribe to room updates
      get().subscribeToRoom(room.id);
      
      console.log('[MultiplayerStore] Joined as spectator:', upperCode);
      return { players, events, room };
    } catch (err) {
      console.error('[MultiplayerStore] Join as spectator error:', err);
      set({
        isConnecting: false,
        connectionError: err.message,
      });
      throw err;
    }
  },

  /**
   * Exit spectator mode
   */
  exitSpectatorMode: () => {
    const { subscriptions } = get();
    
    subscriptions.forEach(sub => {
      if (sub) sub.unsubscribe();
    });
    
    set({
      ...initialState,
      playerId: get().playerId,
      playerName: get().playerName,
      playerColor: get().playerColor,
    });
  },

  // ============================================
  // REPLAY RECORDING
  // ============================================

  /**
   * Start recording a game replay
   */
  startReplayRecording: async () => {
    const { currentRoom, replayEvents, replayStartTime } = get();
    if (!currentRoom) return;
    
    const replayId = `replay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    set({
      isRecordingReplay: true,
      replayId,
      replayEvents: [],
      replayStartTime: Date.now(),
    });
    
    console.log('[MultiplayerStore] Started replay recording:', replayId);
  },

  /**
   * Record a game event to replay
   */
  recordReplayEvent: async (eventType, payload) => {
    const { isRecordingReplay, replayEvents, replayId, replayStartTime, currentRoom, playerId, current_turn } = get();
    if (!isRecordingReplay || !currentRoom) return;
    
    const event = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      replay_id: replayId,
      room_id: currentRoom.id,
      player_id: playerId,
      event_type: eventType,
      payload,
      turn_index: current_turn || 0,
      timestamp: Date.now() - replayStartTime,
      created_at: new Date().toISOString(),
    };
    
    set({ replayEvents: [...replayEvents, event] });
    
    // Also persist to database for cross-session replays
    try {
      await supabase
        .from('game_events')
        .insert(event);
    } catch (err) {
      console.error('[MultiplayerStore] Record replay event error:', err);
    }
  },

  /**
   * Stop and save replay recording
   */
  stopReplayRecording: async () => {
    const { isRecordingReplay, replayId, replayEvents, currentRoom, replayStartTime } = get();
    if (!isRecordingReplay || !currentRoom) return null;
    
    const duration = Date.now() - replayStartTime;
    
    // Save replay metadata
    try {
      const { data: replay, error } = await supabase
        .from('replays')
        .insert({
          id: replayId,
          room_id: currentRoom.id,
          room_code: currentRoom.code,
          duration,
          event_count: replayEvents.length,
          events: replayEvents,
          recorded_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (error) throw error;
      
      console.log('[MultiplayerStore] Replay saved:', replayId);
      
      set({
        isRecordingReplay: false,
        replayId: null,
        replayEvents: [],
        replayStartTime: null,
      });
      
      return replay;
    } catch (err) {
      console.error('[MultiplayerStore] Save replay error:', err);
      set({
        isRecordingReplay: false,
        replayId: null,
        replayEvents: [],
        replayStartTime: null,
      });
      return null;
    }
  },

  /**
   * Load a replay for playback
   */
  loadReplay: async (replayId) => {
    try {
      const { data: replay, error } = await supabase
        .from('replays')
        .select('*')
        .eq('id', replayId)
        .single();
      
      if (error) throw error;
      
      // Parse events if stored as string
      const events = typeof replay.events === 'string' 
        ? JSON.parse(replay.events) 
        : replay.events;
      
      set({
        isPlaybackMode: true,
        playbackEvents: events,
        playbackIndex: 0,
        playbackSpeed: 1,
        currentRoom: {
          id: replay.room_id,
          code: replay.room_code,
          status: 'finished',
        },
      });
      
      console.log('[MultiplayerStore] Replay loaded:', replayId);
      return replay;
    } catch (err) {
      console.error('[MultiplayerStore] Load replay error:', err);
      throw err;
    }
  },

  /**
   * Load replay by room code (finds most recent replay for that room)
   */
  loadReplayByRoomCode: async (roomCode) => {
    try {
      const { data: replay, error } = await supabase
        .from('replays')
        .select('*')
        .eq('room_code', roomCode)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error) throw error;
      if (!replay) throw new Error('未找到该房间的回放');
      
      return get().loadReplay(replay.id);
    } catch (err) {
      console.error('[MultiplayerStore] Load replay by code error:', err);
      throw err;
    }
  },

  /**
   * Get next event in playback
   */
  getNextPlaybackEvent: () => {
    const { playbackEvents, playbackIndex } = get();
    if (playbackIndex >= playbackEvents.length) return null;
    return playbackEvents[playbackIndex];
  },

  /**
   * Advance playback to next event
   */
  advancePlayback: () => {
    const { playbackIndex, playbackEvents } = get();
    if (playbackIndex >= playbackEvents.length - 1) {
      // Replay finished
      set({ playbackIndex: playbackEvents.length });
      return null;
    }
    set({ playbackIndex: playbackIndex + 1 });
    return playbackEvents[playbackIndex + 1];
  },

  /**
   * Set playback speed
   */
  setPlaybackSpeed: (speed) => {
    set({ playbackSpeed: Math.max(0.25, Math.min(4, speed)) });
  },

  /**
   * Exit playback mode
   */
  exitPlaybackMode: () => {
    set({
      isPlaybackMode: false,
      playbackEvents: [],
      playbackIndex: 0,
      playbackSpeed: 1,
      currentRoom: null,
    });
  },

  /**
   * Get list of saved replays
   */
  getReplayList: async () => {
    try {
      const { data: replays, error } = await supabase
        .from('replays')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return replays || [];
    } catch (err) {
      console.error('[MultiplayerStore] Get replay list error:', err);
      return [];
    }
  },

  /**
   * Delete a replay
   */
  deleteReplay: async (replayId) => {
    try {
      await supabase
        .from('replays')
        .delete()
        .eq('id', replayId);
      
      console.log('[MultiplayerStore] Replay deleted:', replayId);
    } catch (err) {
      console.error('[MultiplayerStore] Delete replay error:', err);
    }
  },
}));

export default useMultiplayerStore;
