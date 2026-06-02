/**
 * Tests for MultiplayerManager
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { MultiplayerManager } from '../../src/game/ai/social/multiplayerManager.js';

describe('MultiplayerManager', () => {
  let manager;

  beforeEach(() => {
    manager = new MultiplayerManager();
  });

  test('constructor initializes empty state', () => {
    assert.strictEqual(manager.getRoomCount(), 0);
    assert.strictEqual(manager.rooms.size, 0);
  });

  test('createRoom creates a new room with host', () => {
    const result = manager.createRoom('player1');
    
    assert.ok(result.roomId);
    assert.strictEqual(result.room.hostId, 'player1');
    assert.deepStrictEqual(result.room.players, ['player1']);
    assert.strictEqual(result.room.status, 'waiting');
    assert.strictEqual(result.room.maxPlayers, 6);
  });

  test('createRoom with custom settings', () => {
    const result = manager.createRoom('player1', {
      maxPlayers: 4,
      isPrivate: true,
      gameMode: 'teams'
    });
    
    assert.strictEqual(result.room.maxPlayers, 4);
    assert.strictEqual(result.room.isPrivate, true);
    assert.strictEqual(result.room.gameMode, 'teams');
  });

  test('joinRoom adds player to existing room', () => {
    const { roomId } = manager.createRoom('player1');
    const result = manager.joinRoom(roomId, 'player2');
    
    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(result.room.players, ['player1', 'player2']);
  });

  test('joinRoom fails for non-existent room', () => {
    const result = manager.joinRoom('nonexistent', 'player2');
    
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error, 'Room not found');
  });

  test('joinRoom fails when room is full', () => {
    const { roomId } = manager.createRoom('player1', { maxPlayers: 2 });
    manager.joinRoom(roomId, 'player2');
    const result = manager.joinRoom(roomId, 'player3');
    
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error, 'Room is full');
  });

  test('joinRoom prevents duplicate player', () => {
    const { roomId } = manager.createRoom('player1');
    const result = manager.joinRoom(roomId, 'player1');
    
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error, 'Player already in room');
  });

  test('leaveRoom removes player from room', () => {
    const { roomId } = manager.createRoom('player1');
    manager.joinRoom(roomId, 'player2');
    const result = manager.leaveRoom(roomId, 'player2');
    
    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(result.room.players, ['player1']);
  });

  test('leaveRoom reassigns host when host leaves', () => {
    const { roomId } = manager.createRoom('player1');
    manager.joinRoom(roomId, 'player2');
    manager.leaveRoom(roomId, 'player1');
    
    const room = manager.getRoomState(roomId);
    assert.strictEqual(room.hostId, 'player2');
  });

  test('leaveRoom closes room when last player leaves', () => {
    const { roomId } = manager.createRoom('player1');
    const result = manager.leaveRoom(roomId, 'player1');
    
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.roomClosed, true);
    assert.strictEqual(manager.getRoomState(roomId), null);
  });

  test('getRoomState returns correct room info', () => {
    const { roomId } = manager.createRoom('player1');
    manager.joinRoom(roomId, 'player2');
    
    const state = manager.getRoomState(roomId);
    
    assert.strictEqual(state.id, roomId);
    assert.strictEqual(state.playerCount, 2);
    assert.strictEqual(state.players.length, 2);
  });

  test('getRoomState returns null for non-existent room', () => {
    assert.strictEqual(manager.getRoomState('nonexistent'), null);
  });

  test('isRoomFull returns true when room is at capacity', () => {
    const { roomId } = manager.createRoom('player1', { maxPlayers: 2 });
    manager.joinRoom(roomId, 'player2');
    
    assert.strictEqual(manager.isRoomFull(roomId), true);
  });

  test('isRoomFull returns false when room has space', () => {
    const { roomId } = manager.createRoom('player1');
    
    assert.strictEqual(manager.isRoomFull(roomId), false);
  });

  test('getAvailableRooms returns only public waiting rooms', () => {
    const { roomId: room1 } = manager.createRoom('player1');
    manager.createRoom('player2', { isPrivate: true });
    
    const available = manager.getAvailableRooms();
    
    assert.strictEqual(available.length, 1);
    assert.strictEqual(available[0].id, room1);
  });

  test('updateRoomStatus changes room status', () => {
    const { roomId } = manager.createRoom('player1');
    
    const result = manager.updateRoomStatus(roomId, 'in_progress');
    
    assert.strictEqual(result, true);
    assert.strictEqual(manager.getRoomState(roomId).status, 'in_progress');
  });

  test('updateRoomStatus rejects invalid status', () => {
    const { roomId } = manager.createRoom('player1');
    
    const result = manager.updateRoomStatus(roomId, 'invalid_status');
    
    assert.strictEqual(result, false);
  });

  test('closeRoom removes room and players', () => {
    const { roomId } = manager.createRoom('player1');
    manager.joinRoom(roomId, 'player2');
    
    const result = manager.closeRoom(roomId);
    
    assert.strictEqual(result, true);
    assert.strictEqual(manager.getRoomState(roomId), null);
  });

  test('getAllRooms returns all rooms', () => {
    manager.createRoom('player1');
    manager.createRoom('player2');
    
    const allRooms = manager.getAllRooms();
    
    assert.strictEqual(allRooms.length, 2);
  });
});
