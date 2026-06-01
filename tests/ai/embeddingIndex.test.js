/**
 * Tests for EmbeddingIndex (FAISS-like ANN index)
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { EmbeddingIndex } from '../../src/game/ai/embedding/embeddingIndex.js';

describe('EmbeddingIndex', () => {
  let index;

  beforeEach(() => {
    index = new EmbeddingIndex(4); // Small dimension for testing
  });

  test('constructor initializes with correct dimension', () => {
    assert.strictEqual(index.dimension, 4);
    assert.strictEqual(index.getSize(), 0);
  });

  test('add inserts vector with valid ID', () => {
    const vector = [1.0, 2.0, 3.0, 4.0];
    const result = index.add('test1', vector);
    assert.strictEqual(result, true);
    assert.strictEqual(index.getSize(), 1);
  });

  test('add rejects vector with wrong dimension', () => {
    const vector = [1.0, 2.0, 3.0]; // Wrong dimension
    const result = index.add('test1', vector);
    assert.strictEqual(result, false);
    assert.strictEqual(index.getSize(), 0);
  });

  test('add rejects vector with NaN', () => {
    const vector = [1.0, NaN, 3.0, 4.0];
    const result = index.add('test1', vector);
    assert.strictEqual(result, false);
    assert.strictEqual(index.getSize(), 0);
  });

  test('add rejects vector with Infinity', () => {
    const vector = [1.0, Infinity, 3.0, 4.0];
    const result = index.add('test1', vector);
    assert.strictEqual(result, false);
    assert.strictEqual(index.getSize(), 0);
  });

  test('addBatch adds multiple vectors', () => {
    const ids = ['v1', 'v2', 'v3'];
    const vectors = [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
    ];
    const count = index.addBatch(ids, vectors);
    assert.strictEqual(count, 3);
    assert.strictEqual(index.getSize(), 3);
  });

  test('addBatch rejects mismatched arrays', () => {
    const ids = ['v1', 'v2'];
    const vectors = [[1, 0, 0, 0]];
    const count = index.addBatch(ids, vectors);
    assert.strictEqual(count, 0);
  });

  test('remove deletes existing vector', () => {
    index.add('v1', [1, 2, 3, 4]);
    const result = index.remove('v1');
    assert.strictEqual(result, true);
    assert.strictEqual(index.getSize(), 0);
  });

  test('remove returns false for non-existent vector', () => {
    const result = index.remove('nonexistent');
    assert.strictEqual(result, false);
  });

  test('search finds nearest neighbors', () => {
    index.addBatch(['a', 'b', 'c', 'd'], [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1],
    ]);
    
    const results = index.search([0.9, 0.1, 0, 0], 2);
    
    assert.strictEqual(results.length, 2);
    assert.strictEqual(results[0].id, 'a'); // Closest to [1,0,0,0]
  });

  test('search returns empty for empty index', () => {
    const results = index.search([1, 0, 0, 0], 5);
    assert.strictEqual(results.length, 0);
  });

  test('search returns empty for invalid query', () => {
    index.add('v1', [1, 1, 1, 1]);
    const results = index.search([1, 2], 5); // Wrong dimension
    assert.strictEqual(results.length, 0);
  });

  test('euclideanDistance calculates correctly', () => {
    const a = [1, 0, 0, 0];
    const b = [0, 1, 0, 0];
    const dist = index.euclideanDistance(a, b);
    assert.strictEqual(dist, Math.sqrt(2));
  });

  test('euclideanDistance returns 0 for identical vectors', () => {
    const a = [1, 2, 3, 4];
    const b = [1, 2, 3, 4];
    const dist = index.euclideanDistance(a, b);
    assert.strictEqual(dist, 0);
  });

  test('cosineSimilarity returns 1 for identical vectors', () => {
    const a = [1, 0, 0, 0];
    const b = [1, 0, 0, 0];
    const sim = index.cosineSimilarity(a, b);
    assert.strictEqual(sim, 1);
  });

  test('cosineSimilarity returns 0 for orthogonal vectors', () => {
    const a = [1, 0, 0, 0];
    const b = [0, 1, 0, 0];
    const sim = index.cosineSimilarity(a, b);
    assert.strictEqual(sim, 0);
  });

  test('cosineSimilarity returns -1 for opposite vectors', () => {
    const a = [1, 0, 0, 0];
    const b = [-1, 0, 0, 0];
    const sim = index.cosineSimilarity(a, b);
    assert.strictEqual(sim, -1);
  });

  test('clear removes all vectors', () => {
    index.addBatch(['a', 'b'], [[1, 0, 0, 0], [0, 1, 0, 0]]);
    index.clear();
    assert.strictEqual(index.getSize(), 0);
  });

  test('saveIndex and loadIndex work correctly', () => {
    index.addBatch(['a', 'b'], [
      [1.0, 2.0, 3.0, 4.0],
      [5.0, 6.0, 7.0, 8.0],
    ]);
    
    const json = index.saveIndex();
    const newIndex = new EmbeddingIndex(4);
    const loaded = newIndex.loadIndex(json);
    
    assert.strictEqual(loaded, true);
    assert.strictEqual(newIndex.getSize(), 2);
    assert.deepStrictEqual(newIndex.getVector('a'), [1, 2, 3, 4]);
  });

  test('loadIndex rejects invalid JSON', () => {
    const result = index.loadIndex('not valid json');
    assert.strictEqual(result, false);
  });

  test('loadIndex rejects malformed data', () => {
    const result = index.loadIndex('{"vectors": []}');
    assert.strictEqual(result, false);
  });

  test('getVector returns copy of vector', () => {
    index.add('v1', [1, 2, 3, 4]);
    const vec = index.getVector('v1');
    assert.deepStrictEqual(vec, [1, 2, 3, 4]);
    
    // Verify it's a copy, not a reference
    vec[0] = 999;
    assert.deepStrictEqual(index.getVector('v1'), [1, 2, 3, 4]);
  });

  test('getVector returns null for non-existent ID', () => {
    const vec = index.getVector('nonexistent');
    assert.strictEqual(vec, null);
  });

  test('has returns true for existing ID', () => {
    index.add('v1', [1, 2, 3, 4]);
    assert.strictEqual(index.has('v1'), true);
  });

  test('has returns false for non-existent ID', () => {
    assert.strictEqual(index.has('nonexistent'), false);
  });

  test('getAllIds returns all IDs', () => {
    index.addBatch(['a', 'b', 'c'], [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
    ]);
    
    const ids = index.getAllIds();
    assert.strictEqual(ids.length, 3);
    assert.ok(ids.includes('a'));
    assert.ok(ids.includes('b'));
    assert.ok(ids.includes('c'));
  });
});