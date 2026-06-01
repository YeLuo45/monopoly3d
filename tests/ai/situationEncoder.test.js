/**
 * Tests for SituationEncoder
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { SituationEncoder } from '../../src/game/ai/embedding/situationEncoder.js';

describe('SituationEncoder', () => {
  let encoder;

  beforeEach(() => {
    encoder = new SituationEncoder();
  });

  test('constructor initializes correctly', () => {
    assert.ok(encoder.colorGroups);
    assert.ok(encoder.propertyColors);
    assert.ok(encoder.turnPhaseThresholds);
  });

  test('encode returns fingerprint, tokens, and summary', () => {
    const gameState = createTestGameState();
    const result = encoder.encode(gameState);
    
    assert.ok(result.fingerprint);
    assert.ok(Array.isArray(result.tokens));
    assert.ok(result.summary);
    assert.ok(result.tokens.length > 0);
  });

  test('extractTokens creates correct token types', () => {
    const gameState = createTestGameState();
    const tokens = encoder.extractTokens(gameState);
    
    // Check for expected token types
    assert.ok(tokens.some(t => t.startsWith('game:turn_phase:')));
    assert.ok(tokens.some(t => t.startsWith('board:property_density:')));
    assert.ok(tokens.some(t => t.startsWith('board:debt_level:')));
    assert.ok(tokens.some(t => t.startsWith('player:money_rank:')));
    assert.ok(tokens.some(t => t.startsWith('player:property_count:')));
    assert.ok(tokens.some(t => t.startsWith('player:jail_status:')));
  });

  test('toToken returns stable token string', () => {
    const gameState = createTestGameState();
    const token1 = encoder.toToken(gameState);
    const token2 = encoder.toToken(gameState);
    
    assert.strictEqual(token1, token2);
    assert.ok(token1.includes(';'));
  });

  test('toFingerprint generates consistent hash', () => {
    const gameState = createTestGameState();
    const fp1 = encoder.toFingerprint(gameState);
    const fp2 = encoder.toFingerprint(gameState);
    
    assert.strictEqual(fp1, fp2);
    assert.ok(fp1.length > 0);
  });

  test('different states produce different fingerprints', () => {
    const state1 = { ...createTestGameState(), currentRound: 1 };
    const state2 = { ...createTestGameState(), currentRound: 10 };
    
    const fp1 = encoder.toFingerprint(state1);
    const fp2 = encoder.toFingerprint(state2);
    
    assert.notStrictEqual(fp1, fp2);
  });

  test('toSummary returns human-readable string', () => {
    const gameState = createTestGameState();
    const summary = encoder.toSummary(gameState);
    
    assert.ok(summary.includes('回合'));
    assert.ok(summary.includes('玩家'));
  });

  test('compare returns similarity score 0-1', () => {
    const state1 = createTestGameState();
    const state2 = createTestGameState();
    
    const similarity = encoder.compare(state1, state2);
    
    assert.ok(similarity >= 0);
    assert.ok(similarity <= 1);
    assert.strictEqual(similarity, 1); // Same state should be identical
  });

  test('compare returns 0 for completely different states', () => {
    const state1 = {
      players: [{ id: 'p1', money: 1000000, position: 0, properties: [] }],
      currentRound: 1,
    };
    const state2 = {
      players: [{ id: 'p2', money: 0, position: 39, properties: Array(20).fill(1) }],
      currentRound: 20,
    };
    
    const similarity = encoder.compare(state1, state2);
    assert.ok(similarity < 1);
  });

  test('calculatePropertyDensity handles empty properties', () => {
    const gameState = { properties: [] };
    const density = encoder.calculatePropertyDensity(gameState);
    assert.strictEqual(density, 0);
  });

  test('calculatePropertyDensity handles null properties', () => {
    const gameState = { properties: null };
    const density = encoder.calculatePropertyDensity(gameState);
    assert.strictEqual(density, 0);
  });

  test('calculateDebtLevel returns low for no players', () => {
    const gameState = { players: [] };
    const level = encoder.calculateDebtLevel(gameState);
    assert.strictEqual(level, 'low');
  });

  test('getTurnPhase returns early for early rounds', () => {
    const gameState = { currentRound: 3 };
    const phase = encoder.getTurnPhase(gameState);
    assert.strictEqual(phase, 'early');
  });

  test('getTurnPhase returns mid for mid rounds', () => {
    const gameState = { currentRound: 10 };
    const phase = encoder.getTurnPhase(gameState);
    assert.strictEqual(phase, 'mid');
  });

  test('getTurnPhase returns late for late rounds', () => {
    const gameState = { currentRound: 20 };
    const phase = encoder.getTurnPhase(gameState);
    assert.strictEqual(phase, 'late');
  });

  test('calculateMoneyRanks sorts players correctly', () => {
    const players = [
      { id: 'p1', money: 500 },
      { id: 'p2', money: 1000 },
      { id: 'p3', money: 750 },
    ];
    
    const ranks = encoder.calculateMoneyRanks(players);
    
    assert.strictEqual(ranks.get('p2'), 1); // Richest
    assert.strictEqual(ranks.get('p3'), 2);
    assert.strictEqual(ranks.get('p1'), 3); // Poorest
  });

  test('jail_status token reflects jail state', () => {
    const gameState = {
      players: [{ id: 'p1', money: 1000, position: 0, properties: [], inJail: true, jailTurns: 3 }],
      currentRound: 1,
    };
    
    const tokens = encoder.extractTokens(gameState);
    const jailToken = tokens.find(t => t.includes('jail_status'));
    
    assert.ok(jailToken.includes('yes'));
  });

  test('hashString produces different hashes for different inputs', () => {
    const hash1 = encoder.hashString('test1');
    const hash2 = encoder.hashString('test2');
    
    assert.notStrictEqual(hash1, hash2);
  });

  test('hashString produces same hash for same input', () => {
    const hash1 = encoder.hashString('consistent');
    const hash2 = encoder.hashString('consistent');
    
    assert.strictEqual(hash1, hash2);
  });
});

/**
 * Helper to create test game state
 */
function createTestGameState() {
  return {
    players: [
      { id: 'p1', name: '玩家1', money: 1000, position: 5, properties: ['prop1', 'prop2'], inJail: false, jailTurns: 0 },
      { id: 'p2', name: '玩家2', money: 1500, position: 10, properties: ['prop3'], inJail: false, jailTurns: 0 },
    ],
    properties: [
      { id: 'prop1', owner: 'p1', colorGroup: 'red' },
      { id: 'prop2', owner: 'p1', colorGroup: 'blue' },
      { id: 'prop3', owner: 'p2', colorGroup: 'red' },
    ],
    currentRound: 5,
    phase: 'roll',
  };
}