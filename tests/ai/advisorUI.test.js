import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createAdvisorData, getPhaseColor, formatConfidence } from '../../src/game/ai/advisor/advisorUI.js';

describe('advisorUI', () => {
  it('createAdvisorData returns valid structure', () => {
    const result = createAdvisorData(null, { turn: 5 }, 'p1');
    assert.ok(typeof result.suggestions === 'object');
    assert.ok(typeof result.phase === 'string');
  });

  it('createAdvisorData handles null inputs', () => {
    const result = createAdvisorData(null, null, null);
    assert.strictEqual(result.phase, 'unknown');
    assert.deepStrictEqual(result.suggestions, []);
  });

  it('getPhaseColor returns correct colors', () => {
    assert.strictEqual(getPhaseColor('early'), '#4CAF50');
    assert.strictEqual(getPhaseColor('mid'), '#FF9800');
    assert.strictEqual(getPhaseColor('late'), '#F44336');
    assert.strictEqual(getPhaseColor('unknown'), '#9E9E9E');
    assert.strictEqual(getPhaseColor('invalid'), '#9E9E9E');
  });

  it('formatConfidence formats numbers correctly', () => {
    assert.strictEqual(formatConfidence(0.75), '75%');
    assert.strictEqual(formatConfidence(1), '100%');
    assert.strictEqual(formatConfidence(0), '0%');
    assert.strictEqual(formatConfidence(0.333), '33%');
  });

  it('formatConfidence handles null/undefined', () => {
    assert.strictEqual(formatConfidence(null), '0%');
    assert.strictEqual(formatConfidence(undefined), '0%');
  });
});