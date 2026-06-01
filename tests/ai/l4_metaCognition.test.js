/**
 * Tests for L4_MetaCognition
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { L3_LongTermMemory } from '../../src/game/ai/memory/l3_longTermMemory.js';
import { L2_WorkingMemory } from '../../src/game/ai/memory/l2_workingMemory.js';
import { L4_MetaCognition } from '../../src/game/ai/memory/l4_metaCognition.js';

describe('L4_MetaCognition', () => {
  let longTermMemory;
  let workingMemory;
  let metaCognition;

  beforeEach(() => {
    longTermMemory = new L3_LongTermMemory('test-meta-l3-' + Date.now());
    workingMemory = new L2_WorkingMemory();
    metaCognition = new L4_MetaCognition(longTermMemory, workingMemory);
  });

  test('constructor initializes empty state', () => {
    assert.strictEqual(metaCognition.performanceLog.size, 0);
    assert.strictEqual(metaCognition.selfConfidence.size, 0);
  });

  test('assessDecisionQuality returns score 0-1', () => {
    const decision = workingMemory.pushDecision({
      playerId: 'p1',
      situation: 'test',
      action: 'test',
      reasoning: 'Simple because it looks good',
    });
    
    const quality = metaCognition.assessDecisionQuality(decision.id);
    
    assert.ok(quality >= 0);
    assert.ok(quality <= 1);
  });

  test('assessDecisionQuality returns 0 for unknown ID', () => {
    const quality = metaCognition.assessDecisionQuality('unknown_id');
    assert.strictEqual(quality, 0);
  });

  test('getSelfConfidence returns 0.5 when no data', () => {
    const confidence = metaCognition.getSelfConfidence('p1');
    assert.strictEqual(confidence, 0.5);
  });

  test('getSelfConfidence increases with more decisions', () => {
    for (let i = 0; i < 20; i++) {
      workingMemory.pushDecision({
        playerId: 'p1',
        situation: 'test',
        action: 'test',
        reasoning: 'Reasoning ' + i,
      });
    }
    
    const confidence = metaCognition.getSelfConfidence('p1');
    assert.ok(confidence > 0.5);
    assert.ok(confidence <= 0.95);
  });

  test('identifyWeakPatterns finds low win rate strategies', () => {
    // Create a single strategy with multiple losses
    const id = longTermMemory.saveStrategy('p1', 'situation1', 'bad_strategy', { won: false });
    longTermMemory.updateStrategy(id, { won: false });
    longTermMemory.updateStrategy(id, { won: false });
    
    const weakPatterns = metaCognition.identifyWeakPatterns('p1');
    
    assert.ok(weakPatterns.length > 0);
    const badPattern = weakPatterns.find(p => p.issue === 'Low win rate');
    assert.ok(badPattern);
  });

  test('suggestImprovement returns suggestion text', () => {
    const suggestion = metaCognition.suggestImprovement('short_reasoning');
    
    assert.ok(suggestion.length > 0);
    assert.ok(suggestion.includes('reasoning'));
  });

  test('trackPerformance records game outcome', () => {
    metaCognition.trackPerformance('p1', { won: true, score: 100 });
    metaCognition.trackPerformance('p1', { won: false, score: 50 });
    
    const log = metaCognition.performanceLog.get('p1');
    assert.strictEqual(log.length, 2);
    assert.strictEqual(log[0].won, true);
    assert.strictEqual(log[1].won, false);
  });

  test('getPerformanceTrend returns array of 1s and 0s', () => {
    metaCognition.trackPerformance('p1', { won: true });
    metaCognition.trackPerformance('p1', { won: false });
    metaCognition.trackPerformance('p1', { won: true });
    
    const trend = metaCognition.getPerformanceTrend('p1', 5);
    
    assert.deepStrictEqual(trend, [1, 0, 1]);
  });

  test('getPerformanceTrend returns empty for unknown player', () => {
    const trend = metaCognition.getPerformanceTrend('unknown');
    assert.deepStrictEqual(trend, []);
  });

  test('getDetailedStats returns correct stats', () => {
    metaCognition.trackPerformance('p1', { won: true, score: 100 });
    metaCognition.trackPerformance('p1', { won: false, score: 50 });
    metaCognition.trackPerformance('p1', { won: true, score: 150 });
    
    const stats = metaCognition.getDetailedStats('p1', 10);
    
    assert.strictEqual(stats.games, 3);
    assert.strictEqual(stats.wins, 2);
    assert.strictEqual(stats.winRate, 2/3);
    assert.strictEqual(stats.avgScore, 100);
  });

  test('getDetailedStats returns zeros for unknown player', () => {
    const stats = metaCognition.getDetailedStats('unknown');
    
    assert.strictEqual(stats.games, 0);
    assert.strictEqual(stats.wins, 0);
    assert.strictEqual(stats.winRate, 0);
  });
});