/**
 * Replay System for Monopoly3D
 * 
 * Records game events and provides playback functionality for:
 * - Post-game replays
 * - Live game spectating
 * - AI behavior analysis
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';

// Event types that are recorded
export const REPLAY_EVENT_TYPES = [
  'roll_dice',
  'buy_property',
  'pay_toll',
  'build_house',
  'answer_question',
  'trade_property',
  'end_turn',
  'player_join',
  'player_leave',
  'game_start',
  'game_end',
  'move_token',
  'draw_card',
  'pay_rent',
  'receive_money',
  'go_to_jail',
  'escape_jail',
];

/**
 * Create a replay session for a new game
 */
export function createReplaySession(roomId, gameSettings = {}) {
  return {
    id: `replay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    roomId,
    gameSettings,
    events: [],
    players: [],
    startTime: Date.now(),
    endTime: null,
    duration: 0,
    finalState: null,
    version: '1.0.0',
  };
}

/**
 * Record an event during gameplay
 */
export function recordEvent(replayData, eventType, payload, playerId = null) {
  if (!REPLAY_EVENT_TYPES.includes(eventType)) {
    console.warn(`[ReplaySystem] Unknown event type: ${eventType}`);
    return;
  }

  const event = {
    id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: eventType,
    payload,
    playerId,
    timestamp: Date.now(),
    turnIndex: replayData.events.filter(e => e.type === 'end_turn').length,
  };

  replayData.events.push(event);
  return event;
}

/**
 * Get replay data summary for display
 */
export function getReplaySummary(replayData) {
  const duration = replayData.endTime 
    ? replayData.endTime - replayData.startTime 
    : Date.now() - replayData.startTime;

  const eventCounts = {};
  replayData.events.forEach(e => {
    eventCounts[e.type] = (eventCounts[e.type] || 0) + 1;
  });

  return {
    id: replayData.id,
    duration,
    eventCount: replayData.events.length,
    playerCount: replayData.players.length,
    eventCounts,
    startTime: replayData.startTime,
    endTime: replayData.endTime,
  };
}

/**
 * Save replay to localStorage
 */
export function saveReplayLocally(replayData) {
  try {
    const replays = getLocalReplays();
    replays.push(replayData);
    // Keep only last 20 replays
    const trimmed = replays.slice(-20);
    localStorage.setItem('monopoly3d_replays', JSON.stringify(trimmed));
    return true;
  } catch (err) {
    console.error('[ReplaySystem] Failed to save replay locally:', err);
    return false;
  }
}

/**
 * Load replays from localStorage
 */
export function getLocalReplays() {
  try {
    const data = localStorage.getItem('monopoly3d_replays');
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error('[ReplaySystem] Failed to load local replays:', err);
    return [];
  }
}

/**
 * Delete a local replay
 */
export function deleteLocalReplay(replayId) {
  try {
    const replays = getLocalReplays();
    const filtered = replays.filter(r => r.id !== replayId);
    localStorage.setItem('monopoly3d_replays', JSON.stringify(filtered));
    return true;
  } catch (err) {
    console.error('[ReplaySystem] Failed to delete replay:', err);
    return false;
  }
}

/**
 * Export replay as JSON file
 */
export function exportReplay(replayData) {
  const exportData = {
    ...replayData,
    exportedAt: new Date().toISOString(),
    version: '1.1.0', // Updated version with enhanced player data
  };
  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `monopoly3d_replay_${replayData.id.slice(-8)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Import replay from JSON file
 */
export function importReplay(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.id || !data.events) {
          reject(new Error('Invalid replay file format'));
          return;
        }
        resolve(data);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Replay Store - manages replay state and playback
 */
export const useReplayStore = (() => {
  let store = null;
  
  const getStore = () => {
    if (!store) {
      // Lazy create store to avoid circular deps
      const { create } = require('zustand');
      store = create((set, get) => ({
        // Current replay data
        currentReplay: null,
        isPlaying: false,
        playbackSpeed: 1,
        currentEventIndex: 0,
        isPaused: false,
        
        // Live spectating
        isSpectating: false,
        spectatedRoomId: null,
        liveEvents: [],
        
        // Loaded replay list
        replayList: [],
        
        // Actions
        loadReplay: (replayData) => {
          set({
            currentReplay: replayData,
            currentEventIndex: 0,
            isPlaying: false,
            isPaused: false,
          });
        },
        
        play: () => {
          const { currentReplay, currentEventIndex } = get();
          if (!currentReplay) return;
          
          set({ isPlaying: true, isPaused: false });
        },
        
        pause: () => {
          set({ isPaused: true });
        },
        
        stop: () => {
          set({
            isPlaying: false,
            isPaused: false,
            currentEventIndex: 0,
          });
        },
        
        seek: (index) => {
          set({ currentEventIndex: Math.max(0, Math.min(index, get().currentReplay?.events.length - 1 || 0)) });
        },
        
        setSpeed: (speed) => {
          set({ playbackSpeed: Math.max(0.25, Math.min(4, speed)) });
        },
        
        nextEvent: () => {
          const { currentReplay, currentEventIndex } = get();
          if (!currentReplay) return null;
          
          if (currentEventIndex < currentReplay.events.length - 1) {
            const nextIndex = currentEventIndex + 1;
            set({ currentEventIndex: nextIndex });
            return currentReplay.events[nextIndex];
          }
          
          // End of replay
          set({ isPlaying: false });
          return null;
        },
        
        getCurrentEvent: () => {
          const { currentReplay, currentEventIndex } = get();
          if (!currentReplay || !currentReplay.events[currentEventIndex]) {
            return null;
          }
          return currentReplay.events[currentEventIndex];
        },
        
        // Live spectating
        startSpectating: (roomId) => {
          set({
            isSpectating: true,
            spectatedRoomId: roomId,
            liveEvents: [],
          });
        },
        
        stopSpectating: () => {
          set({
            isSpectating: false,
            spectatedRoomId: null,
            liveEvents: [],
          });
        },
        
        addLiveEvent: (event) => {
          set(state => ({
            liveEvents: [...state.liveEvents, event],
          }));
        },
        
        // Replay list
        loadReplayList: () => {
          set({ replayList: getLocalReplays() });
        },
        
        deleteReplay: (replayId) => {
          deleteLocalReplay(replayId);
          set(state => ({
            replayList: state.replayList.filter(r => r.id !== replayId),
          }));
        },
      }));
    }
    return store;
  };
  
  return getStore;
})();

/**
 * Replay Player class for managing playback timing
 */
export class ReplayPlayer {
  constructor(replayData, callbacks = {}) {
    this.replayData = replayData;
    this.callbacks = callbacks;
    this.currentIndex = 0;
    this.isPlaying = false;
    this.speed = 1;
    this.timer = null;
    this.lastEventTime = 0;
  }

  play() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.scheduleNext();
  }

  pause() {
    this.isPlaying = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  stop() {
    this.pause();
    this.currentIndex = 0;
  }

  seek(index) {
    this.currentIndex = Math.max(0, Math.min(index, this.replayData.events.length - 1));
    if (this.callbacks.onSeek) {
      this.callbacks.onSeek(this.currentIndex, this.getCurrentEvent());
    }
  }

  setSpeed(speed) {
    this.speed = Math.max(0.25, Math.min(4, speed));
  }

  getCurrentEvent() {
    return this.replayData.events[this.currentIndex];
  }

  getProgress() {
    return {
      currentIndex: this.currentIndex,
      totalEvents: this.replayData.events.length,
      progress: this.replayData.events.length > 0 
        ? (this.currentIndex / (this.replayData.events.length - 1)) * 100 
        : 0,
      currentTime: this.getCurrentEvent()?.timestamp || 0,
      totalTime: this.replayData.endTime - this.replayData.startTime || 0,
    };
  }

  scheduleNext() {
    if (!this.isPlaying) return;
    
    const currentEvent = this.getCurrentEvent();
    const nextEvent = this.replayData.events[this.currentIndex + 1];
    
    if (!nextEvent) {
      // End of replay
      this.isPlaying = false;
      if (this.callbacks.onEnd) {
        this.callbacks.onEnd();
      }
      return;
    }

    // Calculate delay based on event timestamps
    let delay = 500; // default delay
    if (currentEvent && nextEvent && currentEvent.timestamp && nextEvent.timestamp) {
      delay = Math.max(100, (nextEvent.timestamp - currentEvent.timestamp) / this.speed);
    }
    
    this.timer = setTimeout(() => {
      this.currentIndex++;
      
      if (this.callbacks.onEvent) {
        this.callbacks.onEvent(this.currentIndex, this.getCurrentEvent());
      }
      
      this.scheduleNext();
    }, delay);
  }

  destroy() {
    this.pause();
    this.callbacks = {};
  }
}

/**
 * Connect to a live game as spectator via Supabase Realtime
 */
export async function spectateGame(roomId, onEvent, onPlayerUpdate, onGameEnd) {
  if (!isSupabaseConfigured()) {
    console.warn('[ReplaySystem] Supabase not configured, cannot spectate');
    return null;
  }

  const channel = supabase.channel(`spectate_${roomId}`);
  
  // Subscribe to game events
  channel.on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'game_events',
    filter: `room_id=eq.${roomId}`,
  }, (payload) => {
    if (onEvent) onEvent(payload.new);
  });

  // Subscribe to player updates
  channel.on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'players',
    filter: `room_id=eq.${roomId}`,
  }, (payload) => {
    if (onPlayerUpdate) onPlayerUpdate(payload.new);
  });

  // Subscribe to room status changes
  channel.on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'rooms',
    filter: `id=eq.${roomId}`,
  }, (payload) => {
    if (payload.new.status === 'finished' && onGameEnd) {
      onGameEnd(payload.new);
    }
  });

  await channel.subscribe();
  
  return {
    channel,
    unsubscribe: () => channel.unsubscribe(),
  };
}

/**
 * Fetch historical game events for replay
 */
export async function fetchGameReplay(roomId) {
  if (!isSupabaseConfigured()) {
    console.warn('[ReplaySystem] Supabase not configured');
    return null;
  }

  try {
    const [eventsResult, playersResult, roomResult] = await Promise.all([
      supabase
        .from('game_events')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at'),
      supabase
        .from('players')
        .select('*')
        .eq('room_id', roomId),
      supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single(),
    ]);

    if (eventsResult.error) throw eventsResult.error;

    const replayData = createReplaySession(roomId, roomResult.data?.settings);
    replayData.events = eventsResult.data.map(e => ({
      id: e.id,
      type: e.event_type,
      payload: e.payload,
      playerId: e.player_id,
      timestamp: new Date(e.created_at).getTime(),
      turnIndex: e.turn_index,
    }));
    replayData.players = playersResult.data || [];
    replayData.startTime = replayData.events[0]?.timestamp || Date.now();
    replayData.endTime = replayData.events[replayData.events.length - 1]?.timestamp || Date.now();
    replayData.duration = replayData.endTime - replayData.startTime;
    replayData.finalState = roomResult.data;

    return replayData;
  } catch (err) {
    console.error('[ReplaySystem] Failed to fetch game replay:', err);
    return null;
  }
}

export default {
  createReplaySession,
  recordEvent,
  getReplaySummary,
  saveReplayLocally,
  getLocalReplays,
  deleteLocalReplay,
  exportReplay,
  importReplay,
  useReplayStore,
  ReplayPlayer,
  spectateGame,
  fetchGameReplay,
  REPLAY_EVENT_TYPES,
};