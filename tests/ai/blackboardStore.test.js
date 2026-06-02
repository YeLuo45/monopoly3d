import { describe, it, before, beforeEach } from 'node:test';
import assert from 'node:assert';
import { BlackboardStore } from '../../src/game/ai/blackboard/blackboardStore.js';

describe('BlackboardStore', () => {
  let store;

  before(() => {
    store = new BlackboardStore();
  });

  beforeEach(() => {
    store.clear();
  });

  describe('write()', () => {
    it('should write a value to the blackboard', () => {
      const result = store.write('player1.position', { x: 10, y: 20 }, 'agent1');
      
      assert.strictEqual(result.key, 'player1.position');
      assert.deepStrictEqual(result.value, { x: 10, y: 20 });
      assert.strictEqual(result.sourceAgent, 'agent1');
      assert.strictEqual(result.version, 1);
    });

    it('should track contributors when writing', () => {
      store.write('test.key', 'value1', 'agent1');
      store.write('test.key', 'value2', 'agent2');
      store.write('test.key', 'value3', 'agent3');
      
      const contributors = store.getContributors('test.key');
      assert.deepStrictEqual(contributors, ['agent1', 'agent2', 'agent3']);
    });

    it('should increment version on subsequent writes', () => {
      store.write('key', 'value1', 'agent1');
      store.write('key', 'value2', 'agent2');
      store.write('key', 'value3', 'agent3');
      
      assert.strictEqual(store.read('key'), 'value3');
    });
  });

  describe('update()', () => {
    it('should perform partial update on existing object', () => {
      store.write('player', { name: 'Alice', score: 100, level: 5 }, 'agent1');
      store.update('player', { score: 150 }, 'agent2');
      
      const result = store.read('player');
      assert.deepStrictEqual(result, { name: 'Alice', score: 150, level: 5 });
    });

    it('should treat non-existent key as write', () => {
      store.update('newkey', { data: 'value' }, 'agent1');
      
      assert.deepStrictEqual(store.read('newkey'), { data: 'value' });
    });
  });

  describe('read()', () => {
    it('should read written values', () => {
      store.write('gamedata.turn', 5, 'system');
      assert.strictEqual(store.read('gamedata.turn'), 5);
    });

    it('should return default value for missing keys', () => {
      assert.strictEqual(store.read('nonexistent', 'default'), 'default');
      assert.strictEqual(store.read('nonexistent', 42), 42);
    });
  });

  describe('readAll()', () => {
    it('should return all entries matching a pattern', () => {
      store.write('player.1.name', 'Alice', 'agent1');
      store.write('player.1.score', 100, 'agent1');
      store.write('player.2.name', 'Bob', 'agent2');
      store.write('enemy.1.type', 'dragon', 'system');
      
      const results = store.readAll('player.*');
      assert.strictEqual(results.length, 3);
    });

    it('should support regex patterns', () => {
      store.write('player_1_score', 100, 'agent1');
      store.write('player_2_score', 200, 'agent2');
      store.write('enemy_1_type', 'dragon', 'system');
      
      const results = store.readAll(/^player_\d+_score$/);
      assert.strictEqual(results.length, 2);
    });
  });

  describe('getHistory()', () => {
    it('should return history of key changes', () => {
      store.write('key', 'value1', 'agent1');
      store.write('key', 'value2', 'agent2');
      store.write('key', 'value3', 'agent3');
      
      const history = store.getHistory('key');
      assert.strictEqual(history.length, 3);
      assert.strictEqual(history[0].value, 'value1');
      assert.strictEqual(history[2].value, 'value3');
    });

    it('should respect limit parameter', () => {
      store.write('key', 'v1', 'a1');
      store.write('key', 'v2', 'a2');
      store.write('key', 'v3', 'a3');
      
      const recent = store.getHistory('key', 2);
      assert.strictEqual(recent.length, 2);
      assert.strictEqual(recent[0].value, 'v2');
      assert.strictEqual(recent[1].value, 'v3');
    });
  });

  describe('getContributors()', () => {
    it('should return all agents who contributed to a key', () => {
      store.write('shared.data', 'test', 'agent1');
      store.update('shared.data', { updated: true }, 'agent2');
      
      const contributors = store.getContributors('shared.data');
      assert.ok(contributors.includes('agent1'));
      assert.ok(contributors.includes('agent2'));
    });

    it('should return empty array for non-existent key', () => {
      const contributors = store.getContributors('nonexistent');
      assert.deepStrictEqual(contributors, []);
    });
  });

  describe('has()', () => {
    it('should return true for existing keys', () => {
      store.write('exists', 'value', 'agent');
      assert.strictEqual(store.has('exists'), true);
    });

    it('should return false for non-existent keys', () => {
      assert.strictEqual(store.has('nonexistent'), false);
    });
  });

  describe('delete()', () => {
    it('should delete a key from the store', () => {
      store.write('to.delete', 'value', 'agent');
      assert.strictEqual(store.has('to.delete'), true);
      
      store.delete('to.delete', 'agent');
      assert.strictEqual(store.has('to.delete'), false);
    });
  });

  describe('keys()', () => {
    it('should return all keys in the store', () => {
      store.write('key1', 'v1', 'a1');
      store.write('key2', 'v2', 'a2');
      store.write('key3', 'v3', 'a3');
      
      const keys = store.keys();
      assert.strictEqual(keys.length, 3);
      assert.ok(keys.includes('key1'));
      assert.ok(keys.includes('key2'));
      assert.ok(keys.includes('key3'));
    });
  });

  describe('getMetadata()', () => {
    it('should return metadata for a key', () => {
      store.write('meta.key', 'value', 'sourceAgent');
      
      const metadata = store.getMetadata('meta.key');
      assert.strictEqual(metadata.key, 'meta.key');
      assert.strictEqual(metadata.sourceAgent, 'sourceAgent');
      assert.strictEqual(metadata.version, 1);
      assert.ok(metadata.timestamp > 0);
    });

    it('should return null for non-existent key', () => {
      const metadata = store.getMetadata('nonexistent');
      assert.strictEqual(metadata, null);
    });
  });
});