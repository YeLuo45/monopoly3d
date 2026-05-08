/**
 * RealtimeChannel - Supabase Realtime Channel Management
 * 
 * Manages real-time subscriptions for:
 * - Live game spectating
 * - Replay data streaming
 * - Multiplayer event synchronization
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';

/**
 * Event types for channel messaging
 */
export const CHANNEL_EVENTS = {
  PLAYER_JOINED: 'player_joined',
  PLAYER_LEFT: 'player_left',
  GAME_STATE_UPDATE: 'game_state_update',
  TURN_CHANGED: 'turn_changed',
  PROPERTY_PURCHASED: 'property_purchased',
  DICE_ROLLED: 'dice_rolled',
  QUESTION_ASKED: 'question_asked',
  ANSWER_SUBMITTED: 'answer_submitted',
  CHAT_MESSAGE: 'chat_message',
  GAME_ENDED: 'game_ended',
  SYNC_REQUEST: 'sync_request',
  SYNC_RESPONSE: 'sync_response',
};

/**
 * Create a broadcast channel for low-latency game events
 */
export function createGameBroadcastChannel(roomId, channelName = 'game events') {
  if (!isSupabaseConfigured()) {
    console.warn('[RealtimeChannel] Supabase not configured');
    return null;
  }

  const channel = supabase.channel(`${channelName}_${roomId}`, {
    config: {
      broadcast: { self: false },
    },
  });

  return channel;
}

/**
 * RealtimeChannel class for managing multiple subscriptions
 */
export class RealtimeChannel {
  constructor(options = {}) {
    this.roomId = options.roomId || null;
    this.userId = options.userId || null;
    this.channel = null;
    this.subscriptions = [];
    this.handlers = new Map();
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
    this.reconnectDelay = options.reconnectDelay || 1000;
  }

  /**
   * Connect to a room's realtime channel
   */
  async connect(roomId) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured');
    }

    this.roomId = roomId;
    this.channel = supabase.channel(`room_${roomId}`, {
      config: {
        presence: {
          key: this.userId,
        },
        broadcast: {
          self: false,
        },
      },
    });

    this.setupDefaultHandlers();
    
    try {
      await this.channel.subscribe((status) => {
        this.isConnected = status === 'SUBSCRIBED';
        console.log(`[RealtimeChannel] Subscription status: ${status}`);
      });
      
      return true;
    } catch (err) {
      console.error('[RealtimeChannel] Connection failed:', err);
      return false;
    }
  }

  /**
   * Set up default presence and broadcast handlers
   */
  setupDefaultHandlers() {
    if (!this.channel) return;

    // Presence tracking
    this.channel.on('presence', { event: 'sync' }, () => {
      const presenceState = this.channel.presenceState();
      this.trigger('presence_sync', presenceState);
    });

    this.channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
      this.trigger('player_joined', { key, presences: newPresences });
    });

    this.channel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      this.trigger('player_left', { key, presences: leftPresences });
    });

    // Broadcast (low-latency messaging)
    this.channel.on('broadcast', { event: '*' }, ({ payload }) => {
      this.trigger(payload.type, payload.data);
    });
  }

  /**
   * Subscribe to presence (who's online)
   */
  async trackPresence(userInfo) {
    if (!this.channel) return;

    await this.channel.track({
      user_id: this.userId,
      ...userInfo,
      online_at: new Date().toISOString(),
    });
  }

  /**
   * Stop tracking presence
   */
  async untrackPresence() {
    if (!this.channel) return;
    await this.channel.untrack();
  }

  /**
   * Broadcast an event to all room participants
   */
  async broadcast(eventType, data) {
    if (!this.channel || !this.isConnected) {
      console.warn('[RealtimeChannel] Cannot broadcast: not connected');
      return false;
    }

    try {
      await this.channel.send({
        type: 'broadcast',
        event: eventType,
        payload: { type: eventType, data },
      });
      return true;
    } catch (err) {
      console.error('[RealtimeChannel] Broadcast failed:', err);
      return false;
    }
  }

  /**
   * Subscribe to database changes
   */
  subscribeToTable(tableName, filter, callback) {
    if (!this.channel) return null;

    const subscription = supabase
      .channel(`${tableName}_subscription_${this.roomId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: tableName,
        filter: filter ? `${filter.split('.')[0]}=eq.${filter.split('=')[1]}` : undefined,
      }, (payload) => {
        callback(payload);
      })
      .subscribe();

    this.subscriptions.push(subscription);
    return subscription;
  }

  /**
   * Subscribe to game events table
   */
  subscribeToGameEvents(callback) {
    return this.subscribeToTable(
      'game_events',
      `room_id=eq.${this.roomId}`,
      ({ payload }) => callback(payload.new || payload)
    );
  }

  /**
   * Subscribe to players table
   */
  subscribeToPlayers(callback) {
    return this.subscribeToTable(
      'players',
      `room_id=eq.${this.roomId}`,
      ({ payload }) => callback(payload.new || payload)
    );
  }

  /**
   * Subscribe to room updates
   */
  subscribeToRoom(callback) {
    return this.subscribeToTable(
      'rooms',
      `id=eq.${this.roomId}`,
      ({ payload }) => callback(payload.new || payload)
    );
  }

  /**
   * Subscribe to chat messages
   */
  subscribeToChat(callback) {
    return this.subscribeToTable(
      'chat_messages',
      `room_id=eq.${this.roomId}`,
      ({ payload }) => callback(payload.new || payload)
    );
  }

  /**
   * Register an event handler
   */
  on(eventType, handler) {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType).push(handler);
    
    // Return unsubscribe function
    return () => {
      const handlers = this.handlers.get(eventType);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    };
  }

  /**
   * Remove an event handler
   */
  off(eventType, handler) {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Trigger handlers for an event
   */
  trigger(eventType, data) {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (err) {
          console.error(`[RealtimeChannel] Handler error for ${eventType}:`, err);
        }
      });
    }
  }

  /**
   * Get current presence state
   */
  getPresence() {
    if (!this.channel) return {};
    return this.channel.presenceState();
  }

  /**
   * Check if connected
   */
  getConnectionStatus() {
    return this.isConnected;
  }

  /**
   * Disconnect and cleanup
   */
  disconnect() {
    // Unsubscribe from all
    this.subscriptions.forEach(sub => {
      if (sub) sub.unsubscribe();
    });
    this.subscriptions = [];

    // Remove all handlers
    this.handlers.clear();

    // Disconnect channel
    if (this.channel) {
      this.channel.unsubscribe();
      this.channel = null;
    }

    this.isConnected = false;
    this.roomId = null;
  }

  /**
   * Reconnect with exponential backoff
   */
  async reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[RealtimeChannel] Max reconnection attempts reached');
      return false;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`[RealtimeChannel] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    if (this.roomId) {
      return this.connect(this.roomId);
    }
    
    return false;
  }
}

/**
 * Factory function to create a realtime channel
 */
export function createRealtimeChannel(options = {}) {
  return new RealtimeChannel(options);
}

/**
 * Hook-friendly channel manager for React components
 */
export function createChannelManager() {
  const channels = new Map();
  
  return {
    /**
     * Get or create a channel for a room
     */
    getChannel(roomId, options = {}) {
      if (channels.has(roomId)) {
        return channels.get(roomId);
      }
      
      const channel = createRealtimeChannel({ ...options, roomId });
      channels.set(roomId, channel);
      return channel;
    },
    
    /**
     * Remove a channel
     */
    removeChannel(roomId) {
      const channel = channels.get(roomId);
      if (channel) {
        channel.disconnect();
        channels.delete(roomId);
      }
    },
    
    /**
     * Get all active channels
     */
    getAllChannels() {
      return Array.from(channels.values());
    },
    
    /**
     * Disconnect all channels
     */
    disconnectAll() {
      channels.forEach(channel => channel.disconnect());
      channels.clear();
    },
  };
}

export default {
  RealtimeChannel,
  createRealtimeChannel,
  createChannelManager,
  createGameBroadcastChannel,
  CHANNEL_EVENTS,
};