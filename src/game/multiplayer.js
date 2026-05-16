/**
 * Multiplayer Manager using PeerJS for LAN WebRTC connections
 * 
 * Features:
 * - Host creates a room with a 6-digit code
 * - Clients join using the room code
 * - Host is authoritative for game state
 * - State synchronization via broadcast
 */

import Peer from 'peerjs';

const ROOM_CODE_LENGTH = 6;
const MAX_PLAYERS = 6;

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

class MultiplayerManager {
  constructor() {
    this.peer = null;
    this.connections = new Map(); // peerId -> connection
    this.isHost = false;
    this.roomCode = null;
    this.playerName = null;
    this.onStateUpdate = null;
    this.onPlayerJoin = null;
    this.onPlayerLeave = null;
    this.onConnectionStatusChange = null;
    this.connectedPlayers = []; // { id, name }
  }

  /**
   * Create a new room as host
   * @returns {Promise<string>} Room code
   */
  async createRoom() {
    return new Promise((resolve, reject) => {
      // Generate a unique peer ID based on room code
      this.roomCode = generateRoomCode();
      this.isHost = true;
      
      // Create peer with a predictable ID based on room code
      const peerId = `monopoly3d-${this.roomCode}`;
      
      this.peer = new Peer(peerId, {
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' },
            // TURN servers for NAT traversal
            {
              urls: 'turn:openrelay.metered.ca:80',
              username: 'openrelay',
              credential: 'openrelay',
            },
            {
              urls: 'turn:openrelay.metered.ca:443',
              username: 'openrelay',
              credential: 'openrelay',
            },
          ],
        },
      });

      this.peer.on('open', (id) => {
        console.log('[Multiplayer] Host created with ID:', id);
        this.connectedPlayers = [{ id: this.peer.id, name: '房主' }];
        this.notifyStatusChange();
        resolve(this.roomCode);
      });

      this.peer.on('error', (err) => {
        console.error('[Multiplayer] Peer error:', err);
        if (err.type === 'unavailable-id') {
          // Try again with new code
          this.roomCode = generateRoomCode();
          const newPeerId = `monopoly3d-${this.roomCode}`;
          this.peer.destroy();
          this.peer = new Peer(newPeerId, { debug: 1 });
          this.setupHostEvents(resolve, reject);
        } else {
          reject(err);
        }
      });

      this.peer.on('connection', (conn) => {
        this.handleNewConnection(conn);
      });

      this.peer.on('disconnected', () => {
        console.log('[Multiplayer] Disconnected from server, attempting reconnect...');
        this.peer.reconnect();
      });
    });
  }

  setupHostEvents(resolve, reject) {
    this.peer.on('open', (id) => {
      console.log('[Multiplayer] Host created with ID:', id);
      this.connectedPlayers = [{ id: this.peer.id, name: '房主' }];
      this.notifyStatusChange();
      resolve(this.roomCode);
    });

    this.peer.on('error', (err) => {
      console.error('[Multiplayer] Peer error:', err);
      reject(err);
    });

    this.peer.on('connection', (conn) => {
      this.handleNewConnection(conn);
    });
  }

  /**
   * Join an existing room
   * @param {string} roomCode - The room code to join
   * @returns {Promise<void>}
   */
  async joinRoom(roomCode) {
    return new Promise((resolve, reject) => {
      this.roomCode = roomCode.toUpperCase();
      this.isHost = false;

      // Connect to host using the room code
      const hostPeerId = `monopoly3d-${this.roomCode}`;
      
      this.peer = new Peer({
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' },
            // TURN servers for NAT traversal
            {
              urls: 'turn:openrelay.metered.ca:80',
              username: 'openrelay',
              credential: 'openrelay',
            },
            {
              urls: 'turn:openrelay.metered.ca:443',
              username: 'openrelay',
              credential: 'openrelay',
            },
          ],
        },
      });

      const timeout = setTimeout(() => {
        reject(new Error('连接超时，请检查房间码是否正确'));
      }, 10000);

      this.peer.on('open', (id) => {
        console.log('[Multiplayer] Connected to peer network');
        
        // Connect to host using the room code
        const hostPeerId = `monopoly3d-${this.roomCode}`;
        const conn = this.peer.connect(hostPeerId, {
          reliable: true,
          serialization: 'json',
        });

        const timeout = setTimeout(() => {
          reject(new Error('连接超时，请检查房间码是否正确'));
        }, 10000);

        conn.on('open', () => {
          console.log('[Multiplayer] Connected to host');
          clearTimeout(timeout);
          this.connections.set(hostPeerId, conn);
          this.setupClientEvents(conn);
          this.notifyStatusChange();
          resolve();
        });

        conn.on('error', (err) => {
          console.error('[Multiplayer] Connection error:', err);
          clearTimeout(timeout);
          reject(err);
        });
      });

      this.peer.on('error', (err) => {
        console.error('[Multiplayer] Peer error:', err);
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  handleNewConnection(conn) {
    console.log('[Multiplayer] New connection from:', conn.peer);
    
    // Check if room is full
    if (this.connectedPlayers.length >= MAX_PLAYERS) {
      conn.on('open', () => {
        conn.send({ type: 'error', message: '房间已满' });
        setTimeout(() => conn.close(), 100);
      });
      return;
    }

    conn.on('open', () => {
      this.connections.set(conn.peer, conn);
      this.setupClientEvents(conn);
      
      // Send current players list to new player
      conn.send({
        type: 'player-joined',
        players: this.connectedPlayers,
        isHost: this.isHost,
      });
      
      this.notifyPlayerJoin(conn.peer);
    });

    conn.on('error', (err) => {
      console.error('[Multiplayer] Connection error:', err);
      this.removeConnection(conn.peer);
    });
  }

  setupClientEvents(conn) {
    conn.on('data', (data) => {
      console.log('[Multiplayer] Received data:', data.type);
      
      switch (data.type) {
        case 'game-state':
          if (this.onStateUpdate) {
            this.onStateUpdate(data.state);
          }
          break;
          
        case 'player-joined':
          this.connectedPlayers = data.players;
          this.notifyStatusChange();
          break;
          
        case 'player-left':
          this.removeConnection(conn.peer);
          break;
          
        case 'error':
          console.error('[Multiplayer] Server error:', data.message);
          break;
          
        case 'host-transfer':
          // Host disconnected, this client becomes host
          this.isHost = true;
          this.notifyStatusChange();
          break;

        case 'chat':
          // Receive chat message from host or other clients
          if (this.onChatMessageCallback) {
            this.onChatMessageCallback(data);
          }
          break;
      }
    });

    conn.on('close', () => {
      console.log('[Multiplayer] Connection closed:', conn.peer);
      if (!this.isHost) {
        this.removeConnection(conn.peer);
        // If host left and we're not host, we might need to handle that
        this.notifyStatusChange();
      }
    });
  }

  removeConnection(peerId) {
    this.connections.delete(peerId);
    this.connectedPlayers = this.connectedPlayers.filter(p => p.id !== peerId);
    this.notifyPlayerLeave(peerId);
    this.notifyStatusChange();
  }

  /**
   * Broadcast game state to all connected peers (host only)
   * @param {Object} state - The game state to broadcast
   */
  broadcastGameState(state) {
    if (!this.isHost) {
      console.warn('[Multiplayer] Only host can broadcast state');
      return;
    }

    // Store state for late-joining spectators
    this.currentGameState = state;

    const message = {
      type: 'game-state',
      state,
      timestamp: Date.now(),
    };

    this.connections.forEach((conn) => {
      try {
        conn.send(message);
      } catch (err) {
        console.error('[Multiplayer] Failed to send to peer:', err);
      }
    });
  }

  /**
   * Register callback for state updates (client only)
   * @param {Function} callback - Called with new game state
   */
  onReceiveState(callback) {
    this.onStateUpdate = callback;
  }

  /**
   * Register callback for player join events
   * @param {Function} callback - Called with new player info
   */
  onPlayerJoined(callback) {
    this.onPlayerJoin = callback;
  }

  /**
   * Register callback for player leave events
   * @param {Function} callback - Called with departed player ID
   */
  onPlayerLeft(callback) {
    this.onPlayerLeave = callback;
  }

  notifyPlayerJoin(peerId) {
    if (this.onPlayerJoin) {
      this.onPlayerJoin({ id: peerId, name: `玩家${this.connectedPlayers.length}` });
    }
  }

  notifyPlayerLeave(peerId) {
    if (this.onPlayerLeave) {
      this.onPlayerLeave(peerId);
    }
  }

  notifyStatusChange() {
    if (this.onConnectionStatusChange) {
      this.onConnectionStatusChange({
        isHost: this.isHost,
        roomCode: this.roomCode,
        players: this.connectedPlayers,
        isConnected: this.peer?.open || false,
      });
    }
  }

  /**
   * Register callback for chat messages
   * @param {Function} callback - Called with { playerId, playerName, message }
   */
  onChatMessage(callback) {
    this.onChatMessageCallback = callback;
  }

  /**
   * Send a chat message to all players
   * @param {string} message - The chat message
   * @param {string} playerName - Sender's name
   */
  sendChatMessage(message, playerName) {
    const data = {
      type: 'chat',
      playerId: this.peer?.id || 'unknown',
      playerName: playerName || '玩家',
      message: message,
      timestamp: Date.now(),
    };

    if (this.isHost) {
      // Host broadcasts to all clients
      this.connections.forEach((conn) => {
        try {
          conn.send(data);
        } catch (err) {
          console.error('[Multiplayer] Failed to send chat:', err);
        }
      });
      // Also notify local callback
      if (this.onChatMessageCallback) {
        this.onChatMessageCallback(data);
      }
    } else {
      // Client sends to host
      this.sendToHost(data);
    }
  }

  /**
   * Register callback for connection status changes
   * @param {Function} callback - Called with status object
   */
  onStatusChange(callback) {
    this.onConnectionStatusChange = callback;
  }

  /**
   * Send a message to the host (client only)
   * @param {Object} data - Data to send
   */
  sendToHost(data) {
    if (this.isHost) {
      console.warn('[Multiplayer] Host cannot send to itself');
      return;
    }

    if (!this.connections.size) {
      console.warn('[Multiplayer] No connections to send to');
      return;
    }

    const hostConn = Array.from(this.connections.values())[0];
    if (hostConn && hostConn.open) {
      hostConn.send(data);
    }
  }

  /**
   * Broadcast data to all connections (used by host for chat/spectator sync)
   * @param {Object} data - Data to broadcast
   */
  broadcast(data) {
    this.connections.forEach((conn) => {
      try {
        conn.send(data);
      } catch (err) {
        console.error('[Multiplayer] Failed to broadcast:', err);
      }
    });
  }

  /**
   * Add a spectator connection (read-only, receives game state updates)
   * @param {Object} conn - PeerJS connection
   */
  addSpectator(conn) {
    conn.on('open', () => {
      console.log('[Multiplayer] New spectator:', conn.peer);
      conn.send({
        type: 'spectator-join',
        roomCode: this.roomCode,
      });
      // Send current game state to spectator
      if (this.currentGameState) {
        conn.send({
          type: 'game-state',
          state: this.currentGameState,
        });
      }
    });

    conn.on('data', (data) => {
      // Spectators don't send game commands, only chat
      if (data.type === 'chat' && this.onChatMessageCallback) {
        this.onChatMessageCallback({ ...data, isSpectator: true });
      }
    });

    conn.on('close', () => {
      console.log('[Multiplayer] Spectator left:', conn.peer);
    });
  }

  /**
   * Disconnect from the current session
   */
  disconnect() {
    console.log('[Multiplayer] Disconnecting...');
    
    // Notify other players
    if (this.isHost) {
      this.connections.forEach((conn) => {
        try {
          conn.send({ type: 'host-closing' });
          conn.close();
        } catch (e) {
          // Ignore
        }
      });
    } else {
      this.connections.forEach((conn) => {
        try {
          conn.send({ type: 'player-left' });
          conn.close();
        } catch (e) {
          // Ignore
        }
      });
    }

    // Clear state
    this.connections.clear();
    this.connectedPlayers = [];
    this.roomCode = null;
    this.isHost = false;

    // Destroy peer
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }

    this.notifyStatusChange();
    console.log('[Multiplayer] Disconnected');
  }

  /**
   * Check if currently in a multiplayer session
   */
  isInSession() {
    return this.peer !== null && this.peer.open;
  }

  /**
   * Get current connection status
   */
  getStatus() {
    return {
      isHost: this.isHost,
      roomCode: this.roomCode,
      players: this.connectedPlayers,
      isConnected: this.peer?.open || false,
      playerCount: this.connectedPlayers.length,
    };
  }
}

// Singleton instance
export const multiplayer = new MultiplayerManager();

// Initialize on window for store access
if (typeof window !== 'undefined') {
  window.monopolyMultiplayer = multiplayer;
}

export default multiplayer;
