/**
 * Tests for L2_WorkingMemory
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { L2_WorkingMemory } from '../../src/game/ai/memory/l2_workingMemory.js';

describe('L2_WorkingMemory', () => {
  let workingMemory;

  beforeEach(() => {
    workingMemory = new L2_WorkingMemory();
  });

  test('constructor initializes empty', () => {
    assert.strictEqual(workingMemory.size(), 0);
    assert.deepStrictEqual(workingMemory.decisions, []);
  });

  test('pushDecision adds decision with ID', () => {
    const decision = {
      playerId: 'p1',
      situation: 'buying_property',
      action: 'purchase',
      reasoning: 'High value property with rent potential',
    };
    
    const result = workingMemory.pushDecision(decision);
    
    assert.ok(result.id);
    assert.strictEqual(result.playerId, 'p1');
    assert.strictEqual(result.situation, 'buying_property');
    assert.strictEqual(result.action, 'purchase');
    assert.strictEqual(result.reasoning, 'High value property with rent potential');
    assert.ok(result.timestamp);
    assert.deepStrictEqual(result.chain, ['High value property with rent potential']);
  });

  test('getDecisions returns player decisions', () => {
    workingMemory.pushDecision({
      playerId: 'p1',
      situation: 'turn1',
      action: 'roll',
      reasoning: 'Start turn',
    });
    workingMemory.pushDecision({
      playerId: 'p2',
      situation: 'turn1',
      action: 'roll',
      reasoning: 'Start turn',
    });
    workingMemory.pushDecision({
      playerId: 'p1',
      situation: 'turn2',
      action: 'buy',
      reasoning: 'Can afford',
    });
    
    const p1Decisions = workingMemory.getDecisions('p1');
    assert.strictEqual(p1Decisions.length, 2);
  });

  test('getReasoningChain returns full chain', () => {
    const result = workingMemory.pushDecision({
      playerId: 'p1',
      situation: 'test',
      action: 'test',
      reasoning: 'Initial reasoning',
    });
    
    workingMemory.reviseDecision(result.id, 'Updated reasoning');
    
    const chain = workingMemory.getReasoningChain(result.id);
    assert.strictEqual(chain.length, 2);
    assert.strictEqual(chain[0], 'Initial reasoning');
    assert.strictEqual(chain[1], 'Updated reasoning');
  });

  test('reviseDecision updates reasoning', () => {
    const result = workingMemory.pushDecision({
      playerId: 'p1',
      situation: 'test',
      action: 'test',
      reasoning: 'Initial',
    });
    
    const updated = workingMemory.reviseDecision(result.id, 'New reasoning');
    
    assert.strictEqual(updated, true);
    const decision = workingMemory.decisions.find(d => d.id === result.id);
    assert.strictEqual(decision.reasoning, 'New reasoning');
    assert.strictEqual(decision.chain.length, 2);
  });

  test('reviseDecision returns false for unknown ID', () => {
    const result = workingMemory.reviseDecision('unknown_id', 'New reasoning');
    assert.strictEqual(result, false);
  });

  test('clear removes all decisions', () => {
    workingMemory.pushDecision({
      playerId: 'p1',
      situation: 'test',
      action: 'test',
      reasoning: 'Test',
    });
    workingMemory.pushDecision({
      playerId: 'p2',
      situation: 'test',
      action: 'test',
      reasoning: 'Test',
    });
    
    assert.strictEqual(workingMemory.size(), 2);
    
    workingMemory.clear();
    
    assert.strictEqual(workingMemory.size(), 0);
  });

  test('getAllDecisions returns all', () => {
    workingMemory.pushDecision({ playerId: 'p1', situation: 's1', action: 'a1', reasoning: 'r1' });
    workingMemory.pushDecision({ playerId: 'p2', situation: 's2', action: 'a2', reasoning: 'r2' });
    
    const all = workingMemory.getAllDecisions();
    assert.strictEqual(all.length, 2);
  });
});