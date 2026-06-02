/**
 * MultiplayerManager - Game Room Management System
 * 
 * Manages multiplayer game rooms including creation, joining, leaving,
 * and room state tracking for multiplayer Monopoly3D sessions.
 */

export class MultiplayerManager {
  constructor() {
    this.rooms = new Map();
    this.playerRooms = new Map(); // playerId -> roomId
    this.roomIdCounter = 1;
    this.MAX_PLAYERS_PER_ROOM = 6;
    this.DEFAULT_ROOM_SETTINGS = {
      maxPlayers: 6,
      isPrivate: false,
      gameMode: 'classic',
      difficulty: 'normal'
    };
  }

  /**
   * Generate a unique room ID
   * @returns {string} Unique room identifier
   */
  generateRoomId() {
    const id = `room_${this.roomIdCounter++}_${Date.now().toString(36)}`;
    return id;
  }

  /**
   * Create a new game room
   * @param {string} hostId - ID of the player creating the room
   * @param {Object} settings - Optional room settings
   * @returns {Object} Created room information
   */
  createRoom(hostId, settings = {}) {
    const roomId = this.generateRoomId();
    const roomSettings = { ...this.DEFAULT_ROOM_SETTINGS, ...settings };
    
    const room = {
      id: roomId,
      hostId: hostId,
      players: [hostId],
      maxPlayers: roomSettings.maxPlayers || this.MAX_PLAYERS_PER_ROOM,
      isPrivate: roomSettings.isPrivate || false,
      gameMode: roomSettings.gameMode || 'classic',
      difficulty: roomSettings.difficulty || 'normal',
      status: 'waiting', // waiting, starting, in_progress, finished
      createdAt: Date.now(),
      settings: roomSettings
    };

    this.rooms.set(roomId, room);
    this.playerRooms.set(hostId, roomId);

    return {
      roomId,
      room: this.getRoomState(roomId)
    };
  }

  /**
   * Join an existing game room
   * @param {string} roomId - ID of the room to join
   * @param {string} playerId - ID of the player joining
   * @returns {Object} Join result with success status and room state
   */
  joinRoom(roomId, playerId) {
    const room = this.rooms.get(roomId);
    
    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    if (room.players.includes(playerId)) {
      return { success: false, error: 'Player already in room' };
    }

    if (room.players.length >= room.maxPlayers) {
      return { success: false, error: 'Room is full' };
    }

    if (room.status !== 'waiting') {
      return { success: false, error: 'Room is not accepting players' };
    }

    // Remove player from their current room if any
    this.leaveCurrentRoom(playerId);

    room.players.push(playerId);
    this.playerRooms.set(playerId, roomId);

    // If room is now full, update status
    if (room.players.length >= room.maxPlayers) {
      room.status = 'starting';
    }

    return {
      success: true,
      room: this.getRoomState(roomId)
    };
  }

  /**
   * Leave a game room
   * @param {string} roomId - ID of the room to leave
   * @param {string} playerId - ID of the player leaving
   * @returns {Object} Leave result with success status
   */
  leaveRoom(roomId, playerId) {
    const room = this.rooms.get(roomId);
    
    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    const playerIndex = room.players.indexOf(playerId);
    if (playerIndex === -1) {
      return { success: false, error: 'Player not in room' };
    }

    room.players.splice(playerIndex, 1);
    this.playerRooms.delete(playerId);

    // If host leaves, assign new host or close room
    if (room.hostId === playerId) {
      if (room.players.length > 0) {
        room.hostId = room.players[0]; // New host is first player
      } else {
        // No players left, delete room but return success
        this.rooms.delete(roomId);
        return { success: true, roomClosed: true, room: null };
      }
    }

    // If room was full but now has space, set back to waiting
    if (room.status === 'starting' && room.players.length < room.maxPlayers) {
      room.status = 'waiting';
    }

    return { success: true, roomClosed: false, room: this.getRoomState(roomId) };
  }

  /**
   * Leave player's current room (helper method)
   * @param {string} playerId - ID of the player
   */
  leaveCurrentRoom(playerId) {
    const currentRoomId = this.playerRooms.get(playerId);
    if (currentRoomId) {
      this.leaveRoom(currentRoomId, playerId);
    }
  }

  /**
   * Get complete room state
   * @param {string} roomId - ID of the room
   * @returns {Object|null} Room state or null if not found
   */
  getRoomState(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    return {
      id: room.id,
      hostId: room.hostId,
      players: [...room.players],
      playerCount: room.players.length,
      maxPlayers: room.maxPlayers,
      isPrivate: room.isPrivate,
      gameMode: room.gameMode,
      difficulty: room.difficulty,
      status: room.status,
      createdAt: room.createdAt
    };
  }

  /**
   * Check if a room is full
   * @param {string} roomId - ID of the room
   * @returns {boolean} True if room is full
   */
  isRoomFull(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    return room.players.length >= room.maxPlayers;
  }

  /**
   * Get list of all available (public) rooms
   * @returns {Array} List of room states
   */
  getAvailableRooms() {
    const available = [];
    for (const [roomId, room] of this.rooms) {
      if (!room.isPrivate && room.status === 'waiting') {
        available.push(this.getRoomState(roomId));
      }
    }
    return available;
  }

  /**
   * Get player's current room ID
   * @param {string} playerId - ID of the player
   * @returns {string|null} Room ID or null if not in a room
   */
  getPlayerRoom(playerId) {
    return this.playerRooms.get(playerId) || null;
  }

  /**
   * Update room status
   * @param {string} roomId - ID of the room
   * @param {string} status - New status
   * @returns {boolean} Success status
   */
  updateRoomStatus(roomId, status) {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    
    const validStatuses = ['waiting', 'starting', 'in_progress', 'finished'];
    if (!validStatuses.includes(status)) return false;
    
    room.status = status;
    return true;
  }

  /**
   * Close a room
   * @param {string} roomId - ID of the room
   * @returns {boolean} Success status
   */
  closeRoom(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    // Remove all players from the room tracking
    for (const playerId of room.players) {
      this.playerRooms.delete(playerId);
    }

    this.rooms.delete(roomId);
    return true;
  }

  /**
   * Get all rooms (for debugging/admin)
   * @returns {Array} List of all room states
   */
  getAllRooms() {
    const allRooms = [];
    for (const roomId of this.rooms.keys()) {
      allRooms.push(this.getRoomState(roomId));
    }
    return allRooms;
  }

  /**
   * Get room count
   * @returns {number} Total number of rooms
   */
  getRoomCount() {
    return this.rooms.size;
  }
}

export default MultiplayerManager;
