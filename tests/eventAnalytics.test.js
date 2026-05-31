import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { EventAnalytics, eventAnalytics } from '../src/game/hooks/eventAnalytics.js';

describe('EventAnalytics', () => {
  let analytics;

  beforeEach(() => {
    analytics = new EventAnalytics();
  });

  afterEach(() => {
    analytics.clear();
  });

  it('should be a singleton export', () => {
    assert.ok(eventAnalytics instanceof EventAnalytics);
  });

  it('should track event counts', () => {
    analytics.trackEvent('dice_roll', { playerId: 1, dice: [3, 4] });
    analytics.trackEvent('dice_roll', { playerId: 2, dice: [1, 1] });
    analytics.trackEvent('player_move', { playerId: 1 });
    
    const stats = analytics.getEventStats('dice_roll');
    assert.strictEqual(stats.count, 2);
  });

  it('should maintain event timeline', () => {
    analytics.trackEvent('game_start', {});
    analytics.trackEvent('dice_roll', {});
    analytics.trackEvent('player_move', {});
    
    const timeline = analytics.exportEvents();
    assert.strictEqual(timeline.length, 3);
    assert.strictEqual(timeline[0].event, 'game_start');
    assert.strictEqual(timeline[1].event, 'dice_roll');
    assert.strictEqual(timeline[2].event, 'player_move');
  });

  it('should track player-specific events', () => {
    analytics.trackEvent('property_purchase', { playerId: 1, tileId: 5 });
    analytics.trackEvent('property_purchase', { playerId: 2, tileId: 12 });
    analytics.trackEvent('property_purchase', { playerId: 1, tileId: 8 });
    
    const player1Stats = analytics.getPlayerStats(1);
    const player2Stats = analytics.getPlayerStats(2);
    
    assert.strictEqual(player1Stats.property_purchase, 2);
    assert.strictEqual(player2Stats.property_purchase, 1);
  });

  it('should get event stats with first/last seen timestamps', () => {
    analytics.trackEvent('turn_change', {});
    
    // Wait a bit to ensure different timestamps
    const before = Date.now();
    
    analytics.trackEvent('turn_change', {});
    
    const stats = analytics.getEventStats('turn_change');
    
    assert.strictEqual(stats.count, 2);
    assert.ok(stats.firstSeen >= before);
    assert.ok(stats.lastSeen >= stats.firstSeen);
  });

  it('should calculate average events per game', () => {
    analytics.setGameId('game1');
    analytics.trackEvent('dice_roll', {});
    analytics.trackEvent('dice_roll', {});
    
    analytics.setGameId('game2');
    analytics.trackEvent('dice_roll', {});
    
    const stats = analytics.getEventStats('dice_roll');
    
    // 3 events across 2 games = 1.5 avg
    assert.strictEqual(stats.avgPerGame, 1.5);
  });

  it('should export all events', () => {
    analytics.trackEvent('event1', { data: 1 });
    analytics.trackEvent('event2', { data: 2 });
    analytics.trackEvent('event3', { data: 3 });
    
    const exported = analytics.exportEvents();
    
    assert.strictEqual(exported.length, 3);
    assert.deepStrictEqual(exported[0].data, { data: 1 });
    assert.deepStrictEqual(exported[1].data, { data: 2 });
    assert.deepStrictEqual(exported[2].data, { data: 3 });
  });

  it('should get events by type', () => {
    analytics.trackEvent('dice_roll', { value: 1 });
    analytics.trackEvent('player_move', {});
    analytics.trackEvent('dice_roll', { value: 3 });
    
    const diceEvents = analytics.getEventsByType('dice_roll');
    
    assert.strictEqual(diceEvents.length, 2);
    assert.strictEqual(diceEvents[0].data.value, 1);
    assert.strictEqual(diceEvents[1].data.value, 3);
  });

  it('should get events for specific player', () => {
    analytics.trackEvent('rent_paid', { playerId: 1, amount: 50 });
    analytics.trackEvent('rent_paid', { playerId: 2, amount: 30 });
    analytics.trackEvent('rent_paid', { playerId: 1, amount: 40 });
    
    const player1Events = analytics.getEventsForPlayer(1);
    
    assert.strictEqual(player1Events.length, 2);
    assert.strictEqual(player1Events[0].data.amount, 50);
    assert.strictEqual(player1Events[1].data.amount, 40);
  });

  it('should get recent events', () => {
    for (let i = 0; i < 20; i++) {
      analytics.trackEvent('test', { index: i });
    }
    
    const recent = analytics.getRecentEvents(5);
    
    assert.strictEqual(recent.length, 5);
    assert.strictEqual(recent[0].data.index, 15);
    assert.strictEqual(recent[4].data.index, 19);
  });

  it('should clear all data', () => {
    analytics.trackEvent('event1', {});
    analytics.trackEvent('event2', {});
    analytics.setGameId('game1');
    
    analytics.clear();
    
    assert.strictEqual(analytics.getTotalEventCount(), 0);
    assert.strictEqual(analytics.exportEvents().length, 0);
    assert.strictEqual(analytics.getEventTypes().length, 0);
  });

  it('should get summary statistics', () => {
    analytics.trackEvent('event1', { playerId: 1 });
    analytics.trackEvent('event2', { playerId: 2 });
    analytics.trackEvent('event3', { playerId: 1 });
    
    const summary = analytics.getSummary();
    
    assert.strictEqual(summary.totalEvents, 3);
    assert.strictEqual(summary.uniqueEventTypes, 3);
    assert.strictEqual(summary.playersTracked, 2);
  });

  it('should get all tracked event types', () => {
    analytics.trackEvent('dice_roll', {});
    analytics.trackEvent('player_move', {});
    analytics.trackEvent('property_purchase', {});
    
    const types = analytics.getEventTypes();
    
    assert.strictEqual(types.length, 3);
    assert.ok(types.includes('dice_roll'));
    assert.ok(types.includes('player_move'));
    assert.ok(types.includes('property_purchase'));
  });

  it('should handle non-existent player stats', () => {
    const stats = analytics.getPlayerStats(999);
    assert.deepStrictEqual(stats, {});
  });

  it('should handle non-existent event stats', () => {
    const stats = analytics.getEventStats('non_existent');
    assert.strictEqual(stats.count, 0);
    assert.strictEqual(stats.firstSeen, null);
    assert.strictEqual(stats.lastSeen, null);
  });

  it('should reset for new game', () => {
    analytics.setGameId('game1');
    analytics.trackEvent('dice_roll', {});
    
    analytics.resetForNewGame();
    analytics.setGameId('game2');
    analytics.trackEvent('dice_roll', {});
    
    const stats = analytics.getEventStats('dice_roll');
    // New game has 1 event, but avg is calculated across 2 games
    assert.strictEqual(stats.count, 1);
    assert.strictEqual(stats.avgPerGame, 0.5);
  });
});