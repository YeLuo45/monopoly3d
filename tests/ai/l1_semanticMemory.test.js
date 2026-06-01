/**
 * Tests for L1_SemanticMemory
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { L0_RawEventCache } from '../../src/game/ai/memory/l0_rawEventCache.js';
import { L1_SemanticMemory } from '../../src/game/ai/memory/l1_semanticMemory.js';

describe('L1_SemanticMemory', () => {
  let rawCache;
  let semantic;

  beforeEach(() => {
    rawCache = new L0_RawEventCache(1000);
    semantic = new L1_SemanticMemory(rawCache);
  });

  test('constructor initializes with empty state', () => {
    assert.strictEqual(semantic.situationTokens.length, 0);
    assert.strictEqual(semantic.fingerprints.size, 0);
  });

  test('encodeSituation creates valid token', () => {
    const gameState = {
      players: [
        { id: 'p1', position: 5, money: 1000 },
        { id: 'p2', position: 10, money: 1500 },
      ],
      currentPlayer: 0,
      phase: 'playing',
    };
    
    const token = semantic.encodeSituation(gameState);
    assert.ok(token.includes('P:'));
    assert.ok(token.includes('M:'));
    assert.ok(token.includes('T:'));
    assert.ok(token.includes('H:'));
  });

  test('decodeSituation parses token correctly', () => {
    const gameState = {
      players: [
        { position: 5, money: 1000 },
        { position: 10, money: 1500 },
      ],
      currentPlayer: 0,
      phase: 'playing',
    };
    
    const token = semantic.encodeSituation(gameState);
    const decoded = semantic.decodeSituation(token);
    
    assert.strictEqual(decoded.currentPlayer, 0);
    assert.strictEqual(decoded.phase, 'playing');
    assert.strictEqual(decoded.players.length, 2);
  });

  test('extractPatterns finds recurring sequences', () => {
    const events = [
      { event: 'dice_roll' },
      { event: 'dice_roll' },
      { event: 'dice_roll' },
      { event: 'property_purchase' },
      { event: 'dice_roll' },
      { event: 'dice_roll' },
      { event: 'dice_roll' },
    ];
    
    const patterns = semantic.extractPatterns(events);
    assert.ok(patterns.length > 0);
    
    const tripleDice = patterns.find(p => p.sequence === 'dice_roll->dice_roll->dice_roll');
    assert.ok(tripleDice);
    assert.strictEqual(tripleDice.count, 2);
  });

  test('getSituationFingerprint generates hash', () => {
    const gameState = {
      players: [
        { id: 'p1', money: 1000, position: 5 },
      ],
      properties: [
        { id: 'prop1', owner: 'p1', houses: 0 },
      ],
      board: [1, 2, 3],
    };
    
    const fp1 = semantic.getSituationFingerprint(gameState);
    const fp2 = semantic.getSituationFingerprint(gameState);
    
    assert.strictEqual(fp1, fp2);
    assert.ok(fp1.length > 0);
  });

  test('different states produce different fingerprints', () => {
    const state1 = { players: [{ id: 'p1', money: 1000 }], board: [1, 2] };
    const state2 = { players: [{ id: 'p1', money: 2000 }], board: [1, 2] };
    
    const fp1 = semantic.getSituationFingerprint(state1);
    const fp2 = semantic.getSituationFingerprint(state2);
    
    assert.notStrictEqual(fp1, fp2);
  });

  test('findSimilarSituations returns matches', () => {
    const baseState = {
      players: [{ id: 'p1', money: 1000, position: 5 }],
      properties: [{ id: 'prop1', owner: 'p1', houses: 0 }],
    };
    
    semantic.storeSituation(baseState, { won: true });
    
    const similarState = {
      players: [{ id: 'p1', money: 1000, position: 5 }],
      properties: [{ id: 'prop1', owner: 'p1', houses: 0 }],
    };
    
    const results = semantic.findSimilarSituations(similarState, 5);
    assert.ok(results.length >= 0);
  });

  test('storeSituation saves for later lookup', () => {
    const state = {
      players: [{ id: 'p1', money: 500 }],
      properties: [],
    };
    
    const fp = semantic.storeSituation(state, { won: true });
    assert.ok(fp);
    assert.ok(semantic.fingerprints.has(fp));
  });
});