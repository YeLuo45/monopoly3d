/**
 * Tests for AdaptiveAnalytics
 * 
 * Tests analytics for the adaptive gaming system.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';

// Import the classes
const { AdaptiveGamingFacade } = await import('../../src/game/ai/adaptive/adaptiveGamingFacade.js');
const { AdaptiveAnalytics } = await import('../../src/game/ai/adaptive/adaptiveAnalytics.js');

describe('AdaptiveAnalytics', () => {
  let facade;
  let analytics;

  beforeEach(() => {
    facade = new AdaptiveGamingFacade();
    analytics = new AdaptiveAnalytics(facade);
  });

  describe('constructor', () => {
    it('should create an instance without errors', () => {
      assert.ok(analytics);
      assert.ok(analytics.facade);
    });

    it('should throw error without facade', () => {
      assert.throws(() => new AdaptiveAnalytics(), /adaptiveFacade is required/);
    });
  });

  describe('getPlayerAdaptationMetrics', () => {
    it('should return null for unknown player', () => {
      const metrics = analytics.getPlayerAdaptationMetrics('unknown');
      assert.strictEqual(metrics, null);
    });

    it('should return metrics for initialized player', () => {
      facade.initialize('player1');
      const metrics = analytics.getPlayerAdaptationMetrics('player1');
      
      assert.ok(metrics);
      assert.strictEqual(metrics.playerId, 'player1');
      assert.ok('segment' in metrics);
      assert.ok('difficulty' in metrics);
      assert.ok('adaptationLevel' in metrics);
    });

    it('should include performance data', () => {
      facade.initialize('player1');
      facade.updatePlayerMetrics('player1', { wins: 2, totalGames: 5 });
      
      const metrics = analytics.getPlayerAdaptationMetrics('player1');
      
      assert.ok(metrics.performance);
      assert.strictEqual(metrics.performance.wins, 2);
      assert.strictEqual(metrics.performance.totalGames, 5);
    });
  });

  describe('getSystemPerformance', () => {
    it('should return system performance metrics', () => {
      const perf = analytics.getSystemPerformance();
      
      assert.ok(perf);
      assert.ok('system' in perf);
      assert.ok('recommendations' in perf);
      assert.ok('memory' in perf);
      assert.ok('subsystems' in perf);
    });

    it('should include subsystem status', () => {
      const perf = analytics.getSystemPerformance();
      
      assert.ok(perf.subsystems);
      assert.strictEqual(perf.subsystems.learningEngine, 'active');
      assert.strictEqual(perf.subsystems.segmentor, 'active');
      assert.strictEqual(perf.subsystems.difficultyEngine, 'active');
    });
  });

  describe('getAdaptationTrends', () => {
    it('should return adaptation trends', () => {
      const trends = analytics.getAdaptationTrends();
      
      assert.ok(trends);
      assert.ok('timestamp' in trends);
      assert.ok('segments' in trends);
      assert.ok('difficulties' in trends);
      assert.ok('performance' in trends);
    });

    it('should include segment distribution', () => {
      facade.initialize('player1');
      const trends = analytics.getAdaptationTrends();
      
      assert.ok(trends.segments);
      assert.ok('casual' in trends.segments);
      assert.ok('strategic' in trends.segments);
    });

    it('should include difficulty distribution', () => {
      const trends = analytics.getAdaptationTrends();
      
      assert.ok(trends.difficulties);
      assert.ok('normal' in trends.difficulties);
      assert.ok('hard' in trends.difficulties);
    });

    it('should include predictions', () => {
      const trends = analytics.getAdaptationTrends();
      
      assert.ok(trends.predictions);
      assert.ok('nextWeek' in trends.predictions);
    });
  });

  describe('player metrics calculation', () => {
    it('should calculate win rate correctly', () => {
      facade.initialize('player1');
      facade.updatePlayerMetrics('player1', { wins: 3, totalGames: 10 });
      
      const metrics = analytics.getPlayerAdaptationMetrics('player1');
      
      assert.strictEqual(metrics.performance.winRate, '30.0%');
    });

    it('should calculate engagement score', () => {
      facade.initialize('player1');
      const metrics = analytics.getPlayerAdaptationMetrics('player1');
      
      assert.ok(metrics.engagement);
      assert.ok('score' in metrics.engagement);
      assert.ok('level' in metrics.engagement);
    });
  });

  describe('recommendation tracking', () => {
    it('should track recommendation stats', () => {
      facade.initialize('player1');
      facade.getRecommendation('player1', { phase: 'early' });
      facade.getRecommendation('player1', { phase: 'mid' });
      
      const metrics = analytics.getPlayerAdaptationMetrics('player1');
      
      assert.ok(metrics.recommendations);
      assert.ok(metrics.recommendations.total >= 2);
    });
  });

  describe('mastery level calculation', () => {
    it('should calculate mastery level based on metrics', () => {
      facade.initialize('player1');
      facade.updatePlayerMetrics('player1', { 
        wins: 5, 
        propertiesOwned: 8, 
        tradesCompleted: 10 
      });
      
      const metrics = analytics.getPlayerAdaptationMetrics('player1');
      
      assert.ok(metrics.progress);
      assert.ok('masteryLevel' in metrics.progress);
    });
  });
});