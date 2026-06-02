/**
 * PlayerSegmentor Tests
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';

import { 
  PlayerSegmentor, 
  PlayerMetrics, 
  SEGMENT_TYPES 
} from '../../src/game/ai/segment/playerSegmentor.js';

describe('PlayerSegmentor', () => {
  let segmentor;
  let mockAnalytics;

  beforeEach(() => {
    mockAnalytics = {
      trackEvent: () => {},
      getPlayerMetrics: (playerId) => new PlayerMetrics(playerId)
    };
    segmentor = new PlayerSegmentor(mockAnalytics);
  });

  it('should create PlayerSegmentor instance', () => {
    assert.ok(segmentor instanceof PlayerSegmentor);
    assert.ok(segmentor.analyticsEngine);
  });

  it('should segment player as casual by default', () => {
    const segment = segmentor.segmentPlayer('player1');
    assert.ok(['casual', 'strategic', 'competitive', 'social'].includes(segment));
  });

  it('should return cached segment', () => {
    segmentor.segmentPlayer('player1');
    const cached = segmentor.getPlayerSegment('player1');
    assert.ok(cached);
    assert.ok(cached.segment);
  });

  it('should analyze player behavior', () => {
    const metrics = segmentor.analyzePlayerBehavior('player1');
    assert.ok(metrics instanceof PlayerMetrics);
    assert.strictEqual(metrics.playerId, 'player1');
  });

  it('should update segment', () => {
    segmentor.segmentPlayer('player1');
    const newSegment = segmentor.updateSegment('player1');
    assert.ok(newSegment);
  });

  it('should record actions and update metrics', () => {
    segmentor.recordAction('player1', 'trade', { completed: true, value: 500 });
    segmentor.recordAction('player1', 'auction', { won: true });
    segmentor.recordAction('player1', 'social', {});
    
    const metrics = segmentor.analyzePlayerBehavior('player1');
    assert.strictEqual(metrics.tradesCompleted, 1);
    assert.strictEqual(metrics.auctionsWon, 1);
    assert.strictEqual(metrics.socialMessages, 1);
  });

  it('should calculate segment scores', () => {
    segmentor.recordAction('player1', 'planned_move', {});
    segmentor.recordAction('player1', 'impulsive_move', {});
    
    const scores = segmentor.getAllSegmentScores('player1');
    assert.ok(scores);
    assert.ok(scores.casual !== undefined);
    assert.ok(scores.strategic !== undefined);
    assert.ok(scores.competitive !== undefined);
    assert.ok(scores.social !== undefined);
  });

  it('should clear cache', () => {
    segmentor.segmentPlayer('player1');
    segmentor.clearCache();
    const cached = segmentor.getPlayerSegment('player1');
    assert.strictEqual(cached, null);
  });

  it('should handle no analytics engine gracefully', () => {
    const segmentorNoAnalytics = new PlayerSegmentor(null);
    const segment = segmentorNoAnalytics.segmentPlayer('player2');
    assert.ok(segment);
  });
});