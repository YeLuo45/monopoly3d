/**
 * Tests for MetricsAggregator
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { MetricsAggregator } from '../../src/game/ai/dashboard/metricsAggregator.js';

describe('MetricsAggregator', () => {
  let aggregator;
  let mockMemoryLayer;

  beforeEach(() => {
    // Create mock memory layer
    mockMemoryLayer = {
      l4: {
        performanceLog: new Map(),
        getDetailedStats(playerId, games) {
          const log = this.performanceLog.get(playerId);
          if (!log || log.length === 0) {
            return { games: 0, wins: 0, winRate: 0, avgScore: 0 };
          }
          const recent = log.slice(-games);
          const wins = recent.filter(e => e.won).length;
          return {
            games: recent.length,
            wins,
            winRate: wins / recent.length,
            avgScore: recent.reduce((a, e) => a + (e.score || 0), 0) / recent.length,
          };
        },
        getSelfConfidence(playerId) {
          return 0.7;
        },
      },
      l3: {
        strategies: new Map(),
      },
      l2: {
        getDecisions(playerId) {
          return [];
        },
        getQuestionsAnswered(playerId) {
          return 0;
        },
      },
    };

    aggregator = new MetricsAggregator(mockMemoryLayer);
  });

  test('constructor initializes with supported metrics', () => {
    assert.ok(aggregator.supportedMetrics.includes('win_rate'));
    assert.ok(aggregator.supportedMetrics.includes('avg_placement'));
    assert.ok(aggregator.supportedMetrics.includes('money_final'));
    assert.ok(aggregator.supportedMetrics.includes('rent_collected'));
    assert.ok(aggregator.supportedMetrics.includes('properties_owned'));
    assert.ok(aggregator.supportedMetrics.includes('questions_answered'));
    assert.ok(aggregator.supportedMetrics.includes('trade_count'));
    assert.ok(aggregator.supportedMetrics.includes('decisions_made'));
    assert.ok(aggregator.supportedMetrics.includes('self_assessment_accuracy'));
  });

  test('getRawMetric returns 0 for unknown metric', () => {
    const value = aggregator.getRawMetric('p1', 'unknown_metric', 20);
    assert.strictEqual(value, 0);
  });

  test('getRawMetric win_rate returns correct value', () => {
    mockMemoryLayer.l4.performanceLog.set('p1', [
      { won: true },
      { won: true },
      { won: false },
      { won: true },
    ]);

    const winRate = aggregator.getRawMetric('p1', 'win_rate', 10);
    assert.strictEqual(winRate, 0.75);
  });

  test('getRawMetric returns 0 when no performance data', () => {
    const winRate = aggregator.getRawMetric('p1', 'win_rate', 10);
    assert.strictEqual(winRate, 0);
  });

  test('aggregate calculates avg, min, max, median correctly', () => {
    const result = aggregator.aggregate('test', [10, 20, 30, 40, 50]);

    assert.strictEqual(result.avg, 30);
    assert.strictEqual(result.min, 10);
    assert.strictEqual(result.max, 50);
    assert.strictEqual(result.median, 30);
  });

  test('aggregate handles even-length array for median', () => {
    const result = aggregator.aggregate('test', [10, 20, 30, 40]);

    assert.strictEqual(result.median, 25); // (20 + 30) / 2
  });

  test('aggregate returns zeros for empty array', () => {
    const result = aggregator.aggregate('test', []);

    assert.strictEqual(result.avg, 0);
    assert.strictEqual(result.min, 0);
    assert.strictEqual(result.max, 0);
    assert.strictEqual(result.median, 0);
  });

  test('aggregate handles single element', () => {
    const result = aggregator.aggregate('test', [42]);

    assert.strictEqual(result.avg, 42);
    assert.strictEqual(result.min, 42);
    assert.strictEqual(result.max, 42);
    assert.strictEqual(result.median, 42);
  });

  test('isSupported returns true for valid metric', () => {
    assert.strictEqual(aggregator.isSupported('win_rate'), true);
    assert.strictEqual(aggregator.isSupported('avg_placement'), true);
  });

  test('isSupported returns false for invalid metric', () => {
    assert.strictEqual(aggregator.isSupported('invalid_metric'), false);
  });

  test('getSupportedMetrics returns all supported metrics', () => {
    const metrics = aggregator.getSupportedMetrics();

    assert.ok(Array.isArray(metrics));
    assert.ok(metrics.length > 0);
    assert.ok(metrics.includes('win_rate'));
  });

  test('getRawMetric self_assessment_accuracy returns value from metaCognition', () => {
    const accuracy = aggregator.getRawMetric('p1', 'self_assessment_accuracy', 20);
    assert.strictEqual(accuracy, 0.7);
  });

  test('getRawMetric decisions_made returns count from L2', () => {
    mockMemoryLayer.l2.getDecisions = () => [
      { id: '1' },
      { id: '2' },
      { id: '3' },
    ];

    const count = aggregator.getRawMetric('p1', 'decisions_made', 20);
    assert.strictEqual(count, 3);
  });
});