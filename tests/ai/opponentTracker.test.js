/**
 * Tests for OpponentTracker
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { OpponentTracker } from '../../src/game/ai/modeling/opponentTracker.js';
import { OpponentModel } from '../../src/game/ai/modeling/opponentModel.js';

describe('OpponentTracker', () => {
  test('constructor initializes with empty state', () => {
    const tracker = new OpponentTracker();
    assert.strictEqual(tracker.opponents.size, 0);
    assert.strictEqual(tracker.getAllOpponents().length, 0);
  });

  test('addOpponent creates new model', () => {
    const tracker = new OpponentTracker();
    const model = tracker.addOpponent('player1');
    
    assert.ok(model instanceof OpponentModel);
    assert.strictEqual(model.playerId, 'player1');
    assert.strictEqual(tracker.getAllOpponents().length, 1);
  });

  test('addOpponent returns existing model if already tracking', () => {
    const tracker = new OpponentTracker();
    const model1 = tracker.addOpponent('player1');
    const model2 = tracker.addOpponent('player1');
    
    assert.strictEqual(model1, model2);
    assert.strictEqual(tracker.getAllOpponents().length, 1);
  });

  test('removeOpponent stops tracking', () => {
    const tracker = new OpponentTracker();
    tracker.addOpponent('player1');
    tracker.addOpponent('player2');
    
    tracker.removeOpponent('player1');
    
    assert.strictEqual(tracker.getAllOpponents().length, 1);
    assert.ok(!tracker.getOpponentModel('player1'));
    assert.ok(tracker.getOpponentModel('player2'));
  });

  test('getOpponentModel returns correct model', () => {
    const tracker = new OpponentTracker();
    tracker.addOpponent('player1');
    tracker.addOpponent('player2');
    
    const model = tracker.getOpponentModel('player2');
    assert.ok(model);
    assert.strictEqual(model.playerId, 'player2');
  });

  test('getOpponentModel returns null for unknown player', () => {
    const tracker = new OpponentTracker();
    tracker.addOpponent('player1');
    
    assert.strictEqual(tracker.getOpponentModel('unknown'), null);
  });

  test('updateAllFromEvent updates specific player', () => {
    const tracker = new OpponentTracker();
    tracker.addOpponent('player1');
    
    tracker.updateAllFromEvent({ 
      type: 'property_purchased', 
      playerId: 'player1',
      data: { tileId: 1, price: 200 }
    });
    
    const model = tracker.getOpponentModel('player1');
    assert.strictEqual(model.events.length, 1);
  });

  test('updateAllFromEvent updates all for global events', () => {
    const tracker = new OpponentTracker();
    tracker.addOpponent('player1');
    tracker.addOpponent('player2');
    
    tracker.updateAllFromEvent({ type: 'game_phase_change', data: { phase: 'end' } });
    
    const model1 = tracker.getOpponentModel('player1');
    const model2 = tracker.getOpponentModel('player2');
    assert.strictEqual(model1.events.length, 1);
    assert.strictEqual(model2.events.length, 1);
  });

  test('getAllProfiles returns all opponent profiles', () => {
    const tracker = new OpponentTracker();
    tracker.addOpponent('player1');
    tracker.addOpponent('player2');
    
    const profiles = tracker.getAllProfiles();
    
    assert.strictEqual(profiles.length, 2);
    assert.strictEqual(profiles[0].playerId, 'player1');
    assert.strictEqual(profiles[1].playerId, 'player2');
  });

  test('setGameId and getSummary work correctly', () => {
    const tracker = new OpponentTracker();
    tracker.setGameId('game123');
    tracker.addOpponent('player1');
    
    const summary = tracker.getSummary();
    
    assert.strictEqual(summary.gameId, 'game123');
    assert.strictEqual(summary.opponentCount, 1);
  });

  test('clear removes all opponents', () => {
    const tracker = new OpponentTracker();
    tracker.addOpponent('player1');
    tracker.addOpponent('player2');
    
    tracker.clear();
    
    assert.strictEqual(tracker.opponents.size, 0);
    assert.strictEqual(tracker.getAllOpponents().length, 0);
  });
});