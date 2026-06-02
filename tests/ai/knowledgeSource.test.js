import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { BlackboardStore } from '../../src/game/ai/blackboard/blackboardStore.js';
import { KnowledgeSource } from '../../src/game/ai/blackboard/knowledgeSource.js';

describe('KnowledgeSource', () => {
  let store;
  let source;

  beforeEach(() => {
    store = new BlackboardStore();
    source = new KnowledgeSource(store, 'testAgent');
  });

  describe('constructor()', () => {
    it('should require BlackboardStore', () => {
      assert.throws(
        () => new KnowledgeSource(null, 'agent1'),
        /BlackboardStore/
      );
    });

    it('should require agentId', () => {
      assert.throws(
        () => new KnowledgeSource(store, null),
        /agentId/
      );
    });

    it('should initialize with correct agentId', () => {
      const source = new KnowledgeSource(store, 'myAgent');
      assert.strictEqual(source.agentId, 'myAgent');
    });
  });

  describe('contribute()', () => {
    it('should contribute knowledge to blackboard', () => {
      const result = source.contribute('game.state', 'playing', 0.8);
      
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.key, 'game.state');
      assert.strictEqual(result.confidence, 0.8);
    });

    it('should use default confidence when not provided', () => {
      const result = source.contribute('test.key', 'value');
      
      assert.strictEqual(result.success, true);
      assert.ok(result.confidence >= 0 && result.confidence <= 1);
    });

    it('should cap confidence at 1.0', () => {
      const result = source.contribute('test.key', 'value', 1.5);
      assert.strictEqual(result.confidence, 1.0);
    });

    it('should floor confidence at 0.0', () => {
      const result = source.contribute('test.key', 'value', -0.5);
      assert.strictEqual(result.confidence, 0.0);
    });
  });

  describe('revise()', () => {
    it('should revise existing knowledge', () => {
      source.contribute('test.key', 'oldValue', 0.5);
      const result = source.revise('test.key', 'newValue', 0.9);
      
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.newKnowledge, 'newValue');
      assert.strictEqual(result.newConfidence, 0.9);
      assert.strictEqual(result.previousKnowledge, 'oldValue');
    });

    it('should contribute if key does not exist', () => {
      const result = source.revise('new.key', 'value', 0.7);
      
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.newKnowledge, 'value');
    });
  });

  describe('getConfidence()', () => {
    it('should return confidence for contributed key', () => {
      source.contribute('test.key', 'value', 0.85);
      
      assert.strictEqual(source.getConfidence('test.key'), 0.85);
    });

    it('should return -1 for non-existent key', () => {
      assert.strictEqual(source.getConfidence('nonexistent'), -1);
    });
  });

  describe('getSource()', () => {
    it('should return agent who contributed', () => {
      source.contribute('test.key', 'value', 0.5);
      
      assert.strictEqual(source.getSource('test.key'), 'testAgent');
    });

    it('should return null for non-existent key', () => {
      assert.strictEqual(source.getSource('nonexistent'), null);
    });
  });

  describe('getKnowledge()', () => {
    it('should return contributed knowledge', () => {
      source.contribute('test.key', { data: 'complex' }, 0.8);
      
      assert.deepStrictEqual(source.getKnowledge('test.key'), { data: 'complex' });
    });

    it('should return undefined for non-existent key', () => {
      assert.strictEqual(source.getKnowledge('nonexistent'), undefined);
    });
  });

  describe('getContributedKeys()', () => {
    it('should return all keys contributed by this source', () => {
      source.contribute('key1', 'v1', 0.5);
      source.contribute('key2', 'v2', 0.6);
      source.contribute('key3', 'v3', 0.7);
      
      const keys = source.getContributedKeys();
      assert.strictEqual(keys.length, 3);
      assert.ok(keys.includes('key1'));
      assert.ok(keys.includes('key2'));
      assert.ok(keys.includes('key3'));
    });
  });

  describe('queryWithConfidence()', () => {
    it('should return knowledge meeting threshold', () => {
      source.contribute('test.key', 'value', 0.8);
      
      const result = source.queryWithConfidence('test.key', 0.5);
      assert.deepStrictEqual(result, {
        knowledge: 'value',
        confidence: 0.8
      });
    });

    it('should return null below threshold', () => {
      source.contribute('test.key', 'value', 0.3);
      
      const result = source.queryWithConfidence('test.key', 0.5);
      assert.strictEqual(result, null);
    });
  });

  describe('batchContribute()', () => {
    it('should contribute multiple entries', () => {
      const entries = [
        { key: 'k1', knowledge: 'v1', confidence: 0.5 },
        { key: 'k2', knowledge: 'v2', confidence: 0.6 },
        { key: 'k3', knowledge: 'v3', confidence: 0.7 }
      ];
      
      const results = source.batchContribute(entries);
      
      assert.strictEqual(results.length, 3);
      assert.strictEqual(source.getContributedKeys().length, 3);
    });
  });
});