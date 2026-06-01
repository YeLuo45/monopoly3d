/**
 * Tests for DecisionPatternAnalyzer
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { DecisionPatternAnalyzer } from '../../src/game/ai/analysis/decisionPatternAnalyzer.js';

describe('DecisionPatternAnalyzer', () => {
  let analyzer;
  let mockMemoryLayer;
  let mockEmbeddingIndex;

  beforeEach(() => {
    mockEmbeddingIndex = {
      search: () => [],
      add: () => true,
    };

    mockMemoryLayer = {
      l2: {
        decisions: [],
        getDecisions: (playerId) => mockMemoryLayer.l2.decisions.filter(d => d.playerId === playerId),
        getAllDecisions: () => mockMemoryLayer.l2.decisions,
        getDecision: (id) => mockMemoryLayer.l2.decisions.find(d => d.id === id),
      },
      getDecisions: (playerId) => mockMemoryLayer.l2.getDecisions(playerId),
      getAllDecisions: () => mockMemoryLayer.l2.getAllDecisions(),
    };

    analyzer = new DecisionPatternAnalyzer(mockMemoryLayer, mockEmbeddingIndex);
  });

  test('constructor initializes with memory layer and embedding index', () => {
    assert.strictEqual(analyzer.memoryLayer, mockMemoryLayer);
    assert.strictEqual(analyzer.embeddingIndex, mockEmbeddingIndex);
    assert.ok(analyzer.baselineDecisions);
  });

  test('detectDecisionPatterns returns empty for no decisions', () => {
    const patterns = analyzer.detectDecisionPatterns('player1');
    assert.deepStrictEqual(patterns, []);
  });

  test('detectDecisionPatterns finds patterns in multiple similar decisions', () => {
    mockMemoryLayer.l2.decisions = [
      { playerId: 'p1', situation: 'tile1', action: 'buy', reasoning: 'good property' },
      { playerId: 'p1', situation: 'tile2', action: 'buy', reasoning: 'good property' },
      { playerId: 'p1', situation: 'tile3', action: 'buy', reasoning: 'good property' },
    ];

    const patterns = analyzer.detectDecisionPatterns('p1');
    assert.strictEqual(patterns.length, 1);
    assert.strictEqual(patterns[0].type, 'buy');
    assert.strictEqual(patterns[0].count, 3);
  });

  test('identifyBiases returns empty for no decisions', () => {
    const biases = analyzer.identifyBiases('player1');
    assert.deepStrictEqual(biases, []);
  });

  test('identifyBiases detects rent avoidance bias', () => {
    mockMemoryLayer.l2.decisions = [
      { playerId: 'p1', situation: 'rent_tile', action: 'skip', reasoning: 'avoid rent' },
      { playerId: 'p1', situation: 'rent_tile2', action: 'skip', reasoning: 'avoid rent' },
      { playerId: 'p1', situation: 'rent_tile3', action: 'skip', reasoning: 'avoid rent' },
    ];

    const biases = analyzer.identifyBiases('p1');
    assert.ok(biases.length > 0);
    assert.ok(biases.some(b => b.bias === 'rent_avoidance'));
  });

  test('findInconsistencies returns empty for insufficient decisions', () => {
    mockMemoryLayer.l2.decisions = [
      { playerId: 'p1', situation: 'single decision', action: 'buy' },
    ];

    const inconsistencies = analyzer.findInconsistencies('p1');
    assert.deepStrictEqual(inconsistencies, []);
  });

  test('findInconsistencies finds different actions in similar situations', () => {
    mockMemoryLayer.l2.decisions = [
      { playerId: 'p1', situation: 'buying property with high rent', action: 'buy' },
      { playerId: 'p1', situation: 'buying property with high rent potential', action: 'skip' },
    ];

    const inconsistencies = analyzer.findInconsistencies('p1');
    assert.ok(inconsistencies.length > 0);
  });

  test('scoreDecision returns score between 0 and 1', () => {
    const decision = {
      reasoning: 'This is a detailed reasoning for the decision',
      chain: ['step1', 'step2'],
      action: 'buy',
      type: 'property_buy',
    };

    const score = analyzer.scoreDecision(decision);
    assert.ok(score >= 0 && score <= 1);
  });

  test('scorePattern returns correct strength', () => {
    const pattern = { count: 5, type: 'test' };
    const strength = analyzer.scorePattern(pattern);
    assert.ok(strength >= 0 && strength <= 1);
    assert.strictEqual(strength, 1.0); // 5/5 = 1.0 capped
  });

  test('compareToBaseline returns comparison object', () => {
    const comparison = analyzer.compareToBaseline('player1');
    assert.ok('averageDeviation' in comparison);
    assert.ok('biasCount' in comparison);
    assert.ok('patternCount' in comparison);
    assert.ok('overallScore' in comparison);
  });

  test('generateDecisionFeedback returns feedback object', () => {
    mockMemoryLayer.l2.decisions = [
      { id: 'decision_1', playerId: 'p1', situation: 'test', action: 'buy', reasoning: 'good' },
    ];

    const feedback = analyzer.generateDecisionFeedback('decision_1');
    assert.ok('score' in feedback);
    assert.ok('explanation' in feedback);
    assert.ok('suggestion' in feedback);
  });

  test('getPatternFrequency returns frequency map', () => {
    mockMemoryLayer.l2.decisions = [
      { playerId: 'p1', situation: 't1', action: 'buy' },
      { playerId: 'p1', situation: 't2', action: 'buy' },
      { playerId: 'p1', situation: 't3', action: 'pay' },
    ];

    const freq = analyzer.getPatternFrequency('p1');
    assert.strictEqual(freq.buy, 2);
    assert.strictEqual(freq.pay, 1);
  });

  test('getDecisionTimeStats returns stats object', () => {
    mockMemoryLayer.l2.decisions = [
      { playerId: 'p1', timestamp: 1000, duration: 500 },
      { playerId: 'p1', timestamp: 2000, duration: 300 },
    ];

    const stats = analyzer.getDecisionTimeStats('p1');
    assert.ok('avg' in stats);
    assert.ok('min' in stats);
    assert.ok('max' in stats);
  });
});