/**
 * CloudSaveManager Test Suite
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { CloudSaveManager, SaveOperation, SyncStatus } from '../../src/game/ai/cloud/cloudSaveManager.js';

describe('CloudSaveManager', () => {
  let manager;

  beforeEach(() => {
    manager = new CloudSaveManager('https://test.api.example.com');
  });

  afterEach(() => {
    manager.removeAllListeners();
  });

  // Basic functionality tests
  test('constructor sets api endpoint correctly', () => {
    assert.strictEqual(manager.apiEndpoint, 'https://test.api.example.com');
    assert.ok(manager.saves instanceof Map);
    assert.ok(manager.syncQueue instanceof Map);
    assert.ok(manager.syncStatus instanceof Map);
  });

  test('saveGame throws error without required parameters', async () => {
    await assert.rejects(
      () => manager.saveGame(null, {}),
      /playerId and gameState are required/
    );
    await assert.rejects(
      () => manager.saveGame('player1', null),
      /playerId and gameState are required/
    );
  });

  test('saveGame returns save result with saveId and timestamp', async () => {
    const gameState = { board: [], players: [], turn: 1 };
    const result = await manager.saveGame('player1', gameState);

    assert.strictEqual(result.success, true);
    assert.ok(result.saveId);
    assert.ok(result.timestamp);
    assert.ok(result.cloudUrl.includes(result.saveId));
  });

  test('saveGame stores save in local cache', async () => {
    const gameState = { board: [], players: [], turn: 1 };
    await manager.saveGame('player1', gameState);

    const saves = manager.saves.get('player1');
    assert.strictEqual(saves.length, 1);
    assert.strictEqual(saves[0].playerId, 'player1');
    assert.deepStrictEqual(saves[0].gameState, gameState);
  });

  test('loadGame throws error without playerId', async () => {
    await assert.rejects(
      () => manager.loadGame(null),
      /playerId is required/
    );
  });

  test('loadGame returns most recent save when no saveId specified', async () => {
    const gameState1 = { turn: 1 };
    const gameState2 = { turn: 2 };

    await manager.saveGame('player1', gameState1);
    await manager.saveGame('player1', gameState2);

    const loaded = await manager.loadGame('player1');
    assert.deepStrictEqual(loaded, gameState2);
  });

  test('loadGame returns specific save when saveId provided', async () => {
    const gameState1 = { turn: 1 };
    const gameState2 = { turn: 2 };

    await manager.saveGame('player1', gameState1);
    const save2 = await manager.saveGame('player1', gameState2);

    const loaded = await manager.loadGame('player1', save2.saveId);
    assert.deepStrictEqual(loaded, gameState2);
  });

  test('listSaves returns list of saves for player', async () => {
    await manager.saveGame('player1', { turn: 1 });
    await manager.saveGame('player1', { turn: 2 });

    const saves = await manager.listSaves('player1');
    assert.strictEqual(saves.length, 2);
    assert.ok(saves[0].saveId);
    assert.ok(saves[0].timestamp);
  });

  test('getSyncStatus returns correct status', () => {
    const status = manager.getSyncStatus('player1');

    assert.strictEqual(status.playerId, 'player1');
    assert.strictEqual(status.status, SyncStatus.IDLE);
    assert.strictEqual(status.pendingSyncItems, 0);
    assert.strictEqual(status.needsSync, false);
  });

  test('addToSyncQueue adds item to queue', () => {
    manager.addToSyncQueue('player1', { type: 'game_state' });

    const queue = manager.getSyncQueue('player1');
    assert.strictEqual(queue.length, 1);
    assert.strictEqual(queue[0].type, 'game_state');
  });

  test('clearSyncQueue clears the queue', () => {
    manager.addToSyncQueue('player1', { type: 'game_state' });
    manager.clearSyncQueue('player1');

    const queue = manager.getSyncQueue('player1');
    assert.strictEqual(queue.length, 0);
  });

  test('getStorageUsage returns correct storage info', async () => {
    await manager.saveGame('player1', { turn: 1, data: 'x'.repeat(100) });

    const usage = manager.getStorageUsage('player1');
    assert.strictEqual(usage.playerId, 'player1');
    assert.strictEqual(usage.saveCount, 1);
    assert.ok(usage.totalSize > 0);
    assert.ok(usage.totalSizeFormatted);
  });

  test('exportPlayerData returns all player data', async () => {
    await manager.saveGame('player1', { turn: 1 });
    manager.addToSyncQueue('player1', { type: 'test' });

    const exportData = manager.exportPlayerData('player1');
    assert.strictEqual(exportData.playerId, 'player1');
    assert.ok(Array.isArray(exportData.saves));
    assert.ok(Array.isArray(exportData.syncQueue));
    assert.ok(exportData.exportedAt);
  });

  test('importPlayerData restores player data', async () => {
    const data = {
      saves: [{ saveId: 'test1', playerId: 'player1', gameState: { turn: 5 } }],
      syncQueue: [{ type: 'test' }]
    };

    manager.importPlayerData('player1', data);

    const loaded = await manager.loadGame('player1', 'test1');
    assert.deepStrictEqual(loaded, { turn: 5 });
  });

  test('emits save:completed event after save', async () => {
    let eventFired = false;
    manager.on('save:completed', () => { eventFired = true; });

    await manager.saveGame('player1', { turn: 1 });
    assert.strictEqual(eventFired, true);
  });

  test('deleteSave removes save from cache', async () => {
    const result = await manager.saveGame('player1', { turn: 1 });
    await manager.deleteSave('player1', result.saveId);

    const saves = manager.saves.get('player1');
    assert.strictEqual(saves.length, 0);
  });
});