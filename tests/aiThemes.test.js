import { describe, it } from 'node:test';
import assert from 'node:assert';

const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] ?? null,
    setItem: (key, value) => { store[key] = value; },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
global.localStorage = localStorageMock;

// Top-level imports
const { THEMES, BOARD_THEMES } = await import('../src/game/themes.js');
const { AI_DIFFICULTY, DIFFICULTY_NOISE, scorePropertyPurchase, scoreBuildHouse } = await import('../src/game/aiBrain.js');

describe('themes', () => {
  it('THEMES should have 4 themes', () => {
    assert.strictEqual(Object.keys(THEMES).length, 4);
  });
  it('THEMES values should be strings', () => {
    Object.values(THEMES).forEach(v => assert.strictEqual(typeof v, 'string'));
  });
  it('BOARD_THEMES should have keys matching THEMES', () => {
    Object.values(THEMES).forEach(themeKey => {
      assert.ok(BOARD_THEMES[themeKey], `BOARD_THEMES should have ${themeKey}`);
    });
  });
  it('each theme should have required color properties', () => {
    const required = ['boardColor', 'tileBaseColor', 'goColor', 'jailColor', 'freeParkingColor'];
    Object.values(BOARD_THEMES).forEach(theme => {
      required.forEach(prop => {
        assert.ok(theme[prop], `${prop} should exist`);
        assert.match(theme[prop], /^#[0-9A-Fa-f]{6}$/, `${prop} should be hex color`);
      });
    });
  });
  it('each theme should have buildingColors array', () => {
    Object.values(BOARD_THEMES).forEach(theme => {
      assert.ok(Array.isArray(theme.buildingColors), 'buildingColors should be array');
      assert.ok(theme.buildingColors.length > 0, 'buildingColors should not be empty');
    });
  });
  it('each theme should have valid backgroundGradient', () => {
    Object.values(BOARD_THEMES).forEach(theme => {
      assert.ok(theme.backgroundGradient, 'backgroundGradient should exist');
      assert.ok(theme.backgroundGradient.includes('gradient'), 'should be a gradient');
    });
  });
  it('each theme should have light properties', () => {
    Object.values(BOARD_THEMES).forEach(theme => {
      assert.ok(typeof theme.ambientIntensity === 'number');
      assert.ok(typeof theme.directionalIntensity === 'number');
    });
  });
});

describe('AI brain pure logic', () => {
  it('AI_DIFFICULTY should have EASY, NORMAL, HARD, ADAPTIVE', () => {
    assert.ok(AI_DIFFICULTY.EASY);
    assert.ok(AI_DIFFICULTY.NORMAL);
    assert.ok(AI_DIFFICULTY.HARD);
    assert.ok(AI_DIFFICULTY.ADAPTIVE);
  });

  it('DIFFICULTY_NOISE should have values for each difficulty', () => {
    assert.ok(typeof DIFFICULTY_NOISE[AI_DIFFICULTY.EASY] === 'number');
    assert.ok(typeof DIFFICULTY_NOISE[AI_DIFFICULTY.NORMAL] === 'number');
    assert.ok(typeof DIFFICULTY_NOISE[AI_DIFFICULTY.HARD] === 'number');
    assert.strictEqual(DIFFICULTY_NOISE[AI_DIFFICULTY.HARD], 0);
    assert.ok(DIFFICULTY_NOISE[AI_DIFFICULTY.EASY] > DIFFICULTY_NOISE[AI_DIFFICULTY.NORMAL]);
  });

  it('scorePropertyPurchase returns -Infinity for owned properties', () => {
    const tile = { id: 1, type: 'property', owner: 0, price: 60, rent: [2,10,30,90,160,250], group: 'red' };
    const player = { id: 0, money: 1500 };
    const state = {};
    const score = scorePropertyPurchase(tile, player, state, AI_DIFFICULTY.NORMAL);
    assert.strictEqual(score, -Infinity);
  });

  it('scorePropertyPurchase returns -Infinity if cannot afford', () => {
    const tile = { id: 1, type: 'property', owner: null, price: 60, rent: [2,10,30,90,160,250], group: 'red' };
    const player = { id: 0, money: 50 };
    const state = {};
    const score = scorePropertyPurchase(tile, player, state, AI_DIFFICULTY.NORMAL);
    assert.strictEqual(score, -Infinity);
  });

  it('scorePropertyPurchase returns positive score for affordable unowned property', () => {
    const tile = { id: 1, type: 'property', owner: null, price: 60, rent: [2,10,30,90,160,250], group: 'red' };
    const player = { id: 0, money: 1500 };
    const state = {};
    const score = scorePropertyPurchase(tile, player, state, AI_DIFFICULTY.NORMAL);
    assert.ok(score > 0, `score should be positive, got ${score}`);
  });

  it('scoreBuildHouse returns -Infinity for non-owned property', () => {
    const tile = { id: 1, type: 'property', owner: 1, houses: 0 };
    const player = { id: 0, money: 1500 };
    const state = {};
    const score = scoreBuildHouse(tile, player, state, AI_DIFFICULTY.NORMAL);
    assert.strictEqual(score, -Infinity);
  });

  it('scoreBuildHouse returns -Infinity at max houses', () => {
    const tile = { id: 1, type: 'property', owner: 0, houses: 4 };
    const player = { id: 0, money: 1500 };
    const state = {};
    const score = scoreBuildHouse(tile, player, state, AI_DIFFICULTY.NORMAL);
    assert.strictEqual(score, -Infinity);
  });

  it('scoreBuildHouse returns -Infinity if cannot afford', () => {
    const tile = { id: 1, type: 'property', owner: 0, houses: 0, rent: [2,10,30,90,160,250], group: 'red' };
    const player = { id: 0, money: 100 };
    const state = {};
    const score = scoreBuildHouse(tile, player, state, AI_DIFFICULTY.NORMAL);
    assert.strictEqual(score, -Infinity);
  });
});
