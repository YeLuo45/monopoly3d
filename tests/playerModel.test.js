/**
 * PlayerModel Tests
 */
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';

const { PlayerModel } = await import('../src/game/ai/playerModel.js');

describe('PlayerModel', () => {
  let playerModel;

  beforeEach(() => {
    playerModel = new PlayerModel('player_1');
  });

  it('should create a player model with correct ID', () => {
    assert.strictEqual(playerModel.playerId, 'player_1');
    assert.strictEqual(playerModel.tilesVisited.size, 0);
    assert.strictEqual(playerModel.rentPaid, 0);
    assert.strictEqual(playerModel.rentReceived, 0);
  });

  it('should record tile visits', () => {
    playerModel.recordAction('tile_visit', { tileId: 5 });
    assert.strictEqual(playerModel.tilesVisited.has(5), true);
    assert.strictEqual(playerModel.tilesVisitedCount[5], 1);

    playerModel.recordAction('tile_visit', { tileId: 5 });
    assert.strictEqual(playerModel.tilesVisitedCount[5], 2);
  });

  it('should record property purchases', () => {
    playerModel.recordAction('property_purchase', {
      tileId: 10,
      price: 100,
    });

    assert.strictEqual(playerModel.propertiesBought.length, 1);
    assert.strictEqual(playerModel.propertiesBought[0].tileId, 10);
    assert.strictEqual(playerModel.propertiesBought[0].price, 100);
  });

  it('should track rent paid and received', () => {
    playerModel.recordAction('rent_paid', { amount: 50 });
    playerModel.recordAction('rent_paid', { amount: 30 });
    playerModel.recordAction('rent_received', { amount: 100 });

    assert.strictEqual(playerModel.rentPaid, 80);
    assert.strictEqual(playerModel.rentReceived, 100);
  });

  it('should record dice rolls and calculate average', () => {
    playerModel.recordAction('dice_roll', { values: [3, 4] });
    playerModel.recordAction('dice_roll', { values: [5, 2] });

    assert.deepStrictEqual(playerModel.diceRolls, [3, 4, 5, 2]);

    const profile = playerModel.getProfile();
    assert.strictEqual(profile.avgDice, 3.5); // (3+4+5+2)/4
  });

  it('should record question responses and calculate accuracy', () => {
    playerModel.recordAction('question_answered', {
      category: 'math',
      correct: true,
      timeTaken: 5,
    });
    playerModel.recordAction('question_answered', {
      category: 'math',
      correct: false,
      timeTaken: 10,
    });
    playerModel.recordAction('question_answered', {
      category: 'science',
      correct: true,
      timeTaken: 8,
    });

    const profile = playerModel.getProfile();
    assert.ok(profile.accuracy > 66 && profile.accuracy < 67); // ~66.67
    assert.strictEqual(profile.categoryAccuracy.math, 50);
    assert.strictEqual(profile.categoryAccuracy.science, 100);
  });

  it('should determine play style based on behavior', () => {
    // Aggressive: high buy rate + high accuracy
    for (let i = 0; i < 10; i++) {
      playerModel.recordAction('property_buy_decision', {
        tileId: i,
        bought: true,
        decisionTime: 100,
      });
    }
    playerModel.recordAction('question_answered', { category: 'math', correct: true });
    playerModel.recordAction('question_answered', { category: 'math', correct: true });

    const profile = playerModel.getProfile();
    assert.strictEqual(profile.playStyle, 'aggressive');
  });

  it('should determine risk profile', () => {
    playerModel.recordAction('rent_paid', { amount: 100 });
    playerModel.recordAction('rent_received', { amount: 50 });
    playerModel.recordAction('property_buy_decision', { tileId: 1, bought: true });

    const riskProfile = playerModel.getRiskProfile();
    assert.ok(['conservative', 'balanced', 'aggressive'].includes(riskProfile));
  });

  it('should serialize and deserialize correctly', () => {
    playerModel.recordAction('tile_visit', { tileId: 3 });
    playerModel.recordAction('property_purchase', { tileId: 7, price: 200 });
    playerModel.recordAction('dice_roll', { values: [2, 5] });

    const json = playerModel.toJSON();
    assert.strictEqual(json.playerId, 'player_1');
    assert.deepStrictEqual(json.tilesVisited, [3]);

    const restored = PlayerModel.fromJSON(json);
    assert.strictEqual(restored.playerId, 'player_1');
    assert.strictEqual(restored.tilesVisited.has(3), true);
    assert.strictEqual(restored.propertiesBought[0].tileId, 7);
  });

  it('should invalidate profile cache on new action', () => {
    playerModel.getProfile(); // First call
    playerModel.recordAction('tile_visit', { tileId: 4 });
    
    const profile = playerModel.getProfile();
    assert.strictEqual(profile.commonTiles[0].tileId, 4);
  });
});