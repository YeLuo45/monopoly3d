/**
 * Tests for PatternVisualizer
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { PatternVisualizer } from '../../src/game/ai/analysis/patternVisualizer.js';

describe('PatternVisualizer', () => {
  let visualizer;
  let mockPatternAnalyzer;
  let mockMemoryLayer;

  beforeEach(() => {
    mockMemoryLayer = {
      l2: {
        decisions: [
          { id: 'd1', playerId: 'p1', situation: 'tile1', action: 'buy', timestamp: 1000, gameId: 'game1' },
          { id: 'd2', playerId: 'p1', situation: 'tile2', action: 'pay', timestamp: 2000, gameId: 'game1' },
          { id: 'd3', playerId: 'p1', situation: 'tile3', action: 'skip', timestamp: 3000, gameId: 'game1' },
        ],
        getDecisions: (playerId) => mockMemoryLayer.l2.decisions.filter(d => d.playerId === playerId),
        getAllDecisions: () => mockMemoryLayer.l2.decisions,
      },
      getDecisions: (playerId) => mockMemoryLayer.l2.getDecisions(playerId),
      getAllDecisions: () => mockMemoryLayer.l2.getAllDecisions(),
    };

    mockPatternAnalyzer = {
      detectDecisionPatterns: (playerId) => [
        { type: 'buy', count: 3, strength: 0.5, decisions: [] },
        { type: 'pay', count: 2, strength: 0.4, decisions: [] },
      ],
      identifyBiases: () => [{ bias: 'test_bias', severity: 0.5 }],
      getDecisionTimeStats: () => ({ avg: 500, min: 100, max: 1000 }),
      compareToBaseline: () => ({ overallScore: 0.75 }),
      scoreDecision: () => 0.7,
      getPatternFrequency: () => ({ buy: 3, pay: 2 }),
    };

    visualizer = new PatternVisualizer(mockPatternAnalyzer, mockMemoryLayer);
  });

  test('constructor initializes with pattern analyzer and memory layer', () => {
    assert.strictEqual(visualizer.patternAnalyzer, mockPatternAnalyzer);
    assert.strictEqual(visualizer.memoryLayer, mockMemoryLayer);
  });

  test('generatePatternGraph returns graph with nodes and edges', () => {
    const graph = visualizer.generatePatternGraph('p1');
    
    assert.ok('nodes' in graph);
    assert.ok('edges' in graph);
    assert.ok(Array.isArray(graph.nodes));
    assert.ok(Array.isArray(graph.edges));
  });

  test('generatePatternGraph includes player node', () => {
    const graph = visualizer.generatePatternGraph('p1');
    const playerNode = graph.nodes.find(n => n.id === 'player');
    assert.ok(playerNode);
    assert.strictEqual(playerNode.type, 'player');
  });

  test('generateDecisionTimeline returns timeline array', () => {
    const timeline = visualizer.generateDecisionTimeline('p1', 'game1');
    
    assert.ok(Array.isArray(timeline));
    assert.strictEqual(timeline.length, 3);
  });

  test('generateDecisionTimeline sorts by timestamp', () => {
    const timeline = visualizer.generateDecisionTimeline('p1', 'game1');
    
    for (let i = 1; i < timeline.length; i++) {
      assert.ok(timeline[i].timestamp >= timeline[i - 1].timestamp);
    }
  });

  test('generateDecisionTimeline filters by gameId', () => {
    const timeline = visualizer.generateDecisionTimeline('p1', 'game1');
    for (const event of timeline) {
      assert.ok(!event.gameId || event.gameId === 'game1');
    }
  });

  test('generateHeatmapData returns heatmap structure', () => {
    const heatmap = visualizer.generateHeatmapData('p1');
    
    assert.ok('x' in heatmap);
    assert.ok('y' in heatmap);
    assert.ok('values' in heatmap);
    assert.ok(Array.isArray(heatmap.x));
    assert.ok(Array.isArray(heatmap.y));
    assert.ok(Array.isArray(heatmap.values));
  });

  test('generateHeatmapData has 40 tiles', () => {
    const heatmap = visualizer.generateHeatmapData('p1');
    assert.strictEqual(heatmap.x.length, 40);
  });

  test('getSummaryStats returns complete stats object', () => {
    const stats = visualizer.getSummaryStats('p1');
    
    assert.ok('totalPatterns' in stats);
    assert.ok('totalBiases' in stats);
    assert.ok('avgDecisionTime' in stats);
    assert.ok('decisionTimeRange' in stats);
    assert.ok('overallScore' in stats);
    assert.ok('topPatterns' in stats);
    assert.ok('topBiases' in stats);
  });
});