/**
 * Tests for GameEmbedding
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { GameEmbedding } from '../../src/game/ai/embedding/gameEmbedding.js';

describe('GameEmbedding', () => {
  let embedding;

  beforeEach(() => {
    embedding = new GameEmbedding();
  });

  test('constructor initializes with correct defaults', () => {
    assert.strictEqual(embedding.dimension, 128);
    assert.ok(embedding.index);
    assert.ok(embedding.encoder);
    assert.ok(embedding.tokenWeights);
  });

  test('encodeState returns valid vector and tokens', () => {
    const gameState = createTestGameState();
    const result = embedding.encodeState(gameState);
    
    assert.ok(Array.isArray(result.vector));
    assert.strictEqual(result.vector.length, 128);
    assert.ok(Array.isArray(result.tokens));
    assert.ok(result.tokens.length > 0);
  });

  test('encodeState produces consistent vectors for same state', () => {
    const gameState = createTestGameState();
    
    const result1 = embedding.encodeState(gameState);
    const result2 = embedding.encodeState(gameState);
    
    assert.deepStrictEqual(result1.vector, result2.vector);
  });

  test('encodeState produces normalized vectors', () => {
    const gameState = createTestGameState();
    const { vector } = embedding.encodeState(gameState);
    
    // Calculate magnitude
    let magnitude = 0;
    for (const val of vector) {
      magnitude += val * val;
    }
    magnitude = Math.sqrt(magnitude);
    
    // Normalized vectors should have magnitude close to 1
    assert.ok(Math.abs(magnitude - 1) < 0.001 || magnitude < 0.001);
  });

  test('encodeSituation includes action context', () => {
    const gameState = createTestGameState();
    const actions = [
      { type: 'buy', tileId: 'prop1' },
      { type: 'pass', tileId: null },
    ];
    
    const vector = embedding.encodeSituation('p1', gameState, actions);
    
    assert.ok(Array.isArray(vector));
    assert.strictEqual(vector.length, 128);
  });

  test('encodeSituation handles empty actions', () => {
    const gameState = createTestGameState();
    const vector = embedding.encodeSituation('p1', gameState, []);
    
    assert.ok(Array.isArray(vector));
    assert.strictEqual(vector.length, 128);
  });

  test('encodeSituation handles null playerId', () => {
    const gameState = createTestGameState();
    const vector = embedding.encodeSituation(null, gameState, []);
    
    assert.ok(Array.isArray(vector));
    assert.strictEqual(vector.length, 128);
  });

  test('cosineSimilarity returns 1 for identical vectors', () => {
    const vec = [1, 0, 0, 0, 0, 0, 0, 0];
    const sim = embedding.cosineSimilarity(vec, vec);
    assert.strictEqual(sim, 1);
  });

  test('cosineSimilarity returns 0 for orthogonal vectors', () => {
    const a = [1, 0, 0, 0, 0, 0, 0, 0];
    const b = [0, 1, 0, 0, 0, 0, 0, 0];
    const sim = embedding.cosineSimilarity(a, b);
    assert.strictEqual(sim, 0);
  });

  test('cosineSimilarity returns -1 for opposite vectors', () => {
    const a = [1, 0, 0, 0, 0, 0, 0, 0];
    const b = [-1, 0, 0, 0, 0, 0, 0, 0];
    const sim = embedding.cosineSimilarity(a, b);
    assert.strictEqual(sim, -1);
  });

  test('euclideanDistance returns 0 for identical vectors', () => {
    const vec = [1, 2, 3, 4];
    const dist = embedding.euclideanDistance(vec, vec);
    assert.strictEqual(dist, 0);
  });

  test('euclideanDistance calculates correctly', () => {
    const a = [1, 0, 0, 0];
    const b = [0, 1, 0, 0];
    const dist = embedding.euclideanDistance(a, b);
    assert.strictEqual(dist, Math.sqrt(2));
  });

  test('findSimilar returns empty for null memoryLayer', () => {
    const vector = [1, 2, 3, 4]; // Simplified 4-dim for test
    const results = embedding.findSimilar(vector, null, 5);
    assert.strictEqual(results.length, 0);
  });

  test('clusterSituations handles empty input', () => {
    const result = embedding.clusterSituations([], 5);
    assert.ok(Array.isArray(result.centroids));
    assert.strictEqual(result.centroids.length, 0);
  });

  test('clusterSituations handles input smaller than k', () => {
    const vectors = [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
    ];
    
    const result = embedding.clusterSituations(vectors, 5);
    
    // When vectors < k, each vector is its own centroid
    assert.strictEqual(result.centroids.length, 2);
    assert.strictEqual(result.assignments.length, 2);
  });

  test('clusterSituations clusters similar vectors together', () => {
    // Create 4 groups of similar vectors
    const vectors = [
      [1, 0, 0, 0],  // Cluster 0
      [0.9, 0.1, 0, 0],  // Cluster 0
      [0, 1, 0, 0],  // Cluster 1
      [0, 0.9, 0.1, 0],  // Cluster 1
      [0, 0, 1, 0],  // Cluster 2
      [0, 0, 0.9, 0.1],  // Cluster 2
      [0, 0, 0, 1],  // Cluster 3
      [0, 0, 0, 0.9],  // Cluster 3
    ];
    
    const result = embedding.clusterSituations(vectors, 4);
    
    assert.strictEqual(result.centroids.length, 4);
    assert.strictEqual(result.assignments.length, 8);
    
    // Check that similar vectors are in same cluster
    assert.strictEqual(result.assignments[0], result.assignments[1]);
    assert.strictEqual(result.assignments[2], result.assignments[3]);
    assert.strictEqual(result.assignments[4], result.assignments[5]);
    assert.strictEqual(result.assignments[6], result.assignments[7]);
  });

  test('tokensToVector produces normalized output', () => {
    const tokens = [
      'game:turn_phase:early',
      'player:money_rank:1',
      'board:property_density:2',
    ];
    
    const vector = embedding.tokensToVector(tokens);
    
    assert.ok(Array.isArray(vector));
    assert.strictEqual(vector.length, 128);
    
    // Check normalization
    let magnitude = 0;
    for (const val of vector) {
      magnitude += val * val;
    }
    magnitude = Math.sqrt(magnitude);
    assert.ok(magnitude > 0.9 && magnitude <= 1.0);
  });

  test('normalizeVector handles zero vector', () => {
    const vector = new Array(128).fill(0);
    const normalized = embedding.normalizeVector(vector);
    
    assert.ok(Array.isArray(normalized));
    assert.strictEqual(normalized.length, 128);
  });

  test('getTokenWeight returns correct weights', () => {
    const weight = embedding.getTokenWeight('game:turn_phase:early');
    assert.strictEqual(weight, 0.5);
    
    const midWeight = embedding.getTokenWeight('game:turn_phase:mid');
    assert.strictEqual(midWeight, 0.7);
    
    const lateWeight = embedding.getTokenWeight('game:turn_phase:late');
    assert.strictEqual(lateWeight, 1.0);
  });

  test('combineVectors creates weighted combination', () => {
    // Create 128-dim vectors for test
    const a = new Array(128).fill(0);
    a[0] = 1;
    const b = new Array(128).fill(0);
    b[1] = 1;
    
    const result = embedding.combineVectors(a, b, 0.5, 0.5);
    
    assert.ok(Array.isArray(result));
    assert.strictEqual(result.length, 128);
    
    // Result is normalized, so check that both dimensions have equal values
    // and that they're non-zero (since combined vector won't be zero)
    assert.ok(result[0] > 0);
    assert.ok(result[1] > 0);
    // Due to normalization, values should be equal
    assert.strictEqual(result[0], result[1]);
  });

  test('hashToken produces consistent output', () => {
    const hash1 = embedding.hashToken('test', 0);
    const hash2 = embedding.hashToken('test', 0);
    
    assert.strictEqual(hash1, hash2);
  });

  test('hashToken produces different hashes for different seeds', () => {
    const hash0 = embedding.hashToken('test', 0);
    const hash1 = embedding.hashToken('test', 1);
    
    assert.notStrictEqual(hash0, hash1);
  });

  test('actionsToVector handles empty actions', () => {
    const vector = embedding.actionsToVector([]);
    
    assert.ok(Array.isArray(vector));
    assert.strictEqual(vector.length, 128);
  });

  test('actionsToVector handles null actions', () => {
    const vector = embedding.actionsToVector(null);
    
    assert.ok(Array.isArray(vector));
    assert.strictEqual(vector.length, 128);
  });

  test('getPlayerContext handles missing player', () => {
    const gameState = { players: [] };
    const vector = embedding.getPlayerContext('nonexistent', gameState);
    
    assert.ok(Array.isArray(vector));
    assert.strictEqual(vector.length, 128);
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