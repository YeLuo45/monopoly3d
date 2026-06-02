import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ErrorClassifier } from '../../src/game/ai/selfHeal/errorClassifier.js';

describe('ErrorClassifier', () => {
  describe('classify', () => {
    it('classifies timeout errors', () => {
      const classifier = new ErrorClassifier();
      const result = classifier.classify('Request timed out after 30s');
      assert.strictEqual(result.type, 'timeout');
      assert.strictEqual(result.severity, 'medium');
      assert.strictEqual(result.recoverable, true);
    });

    it('classifies memory errors', () => {
      const classifier = new ErrorClassifier();
      const result = classifier.classify('Out of memory: heap allocation failed');
      assert.strictEqual(result.type, 'memory');
      assert.strictEqual(result.severity, 'high');
    });

    it('classifies network errors', () => {
      const classifier = new ErrorClassifier();
      const result = classifier.classify('ECONNREFUSED: connection refused');
      assert.strictEqual(result.type, 'network');
    });

    it('returns unknown for unrecognized errors', () => {
      const classifier = new ErrorClassifier();
      const result = classifier.classify('Something completely unexpected');
      assert.strictEqual(result.type, 'unknown');
    });
  });

  describe('isRecoverable', () => {
    it('returns true for network errors', () => {
      const classifier = new ErrorClassifier();
      assert.strictEqual(classifier.isRecoverable('ECONNREFUSED'), true);
    });

    it('returns false for memory errors', () => {
      const classifier = new ErrorClassifier();
      assert.strictEqual(classifier.isRecoverable('Out of memory'), false);
    });
  });

  describe('getRecommendedStrategy', () => {
    it('returns retry for network errors', () => {
      const classifier = new ErrorClassifier();
      assert.strictEqual(classifier.getRecommendedStrategy('ETIMEDOUT'), 'retry');
    });

    it('returns restart for memory errors', () => {
      const classifier = new ErrorClassifier();
      assert.strictEqual(classifier.getRecommendedStrategy('heap memory error'), 'restart');
    });
  });
});