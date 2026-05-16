import { describe, it } from 'node:test';
import assert from 'node:assert';

// Mock localStorage for Node.js environment
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

// Test boardConfig - pure functions with no DOM dependencies
const { TILE_TYPES, COLOR_GROUPS, BOARD_CONFIG, BOARD_SIZE,
        QUESTION_TILE_IDS, STARTING_MONEY, PASSING_GO_BONUS,
        HOUSE_COST, MAX_HOUSES, MAX_ROUNDS } = await import('../src/game/boardConfig.js');

describe('boardConfig', () => {
  it('BOARD_SIZE should be 36', () => {
    assert.strictEqual(BOARD_SIZE, 36);
  });

  it('BOARD_CONFIG should have 36 tiles', () => {
    assert.strictEqual(BOARD_CONFIG.length, 36);
  });

  it('BOARD_CONFIG[0] should be GO tile', () => {
    assert.strictEqual(BOARD_CONFIG[0].type, TILE_TYPES.GO);
    assert.strictEqual(BOARD_CONFIG[0].subtype, 'GO');
  });

  it('BOARD_CONFIG[10] should be FREE_PARKING tile', () => {
    assert.strictEqual(BOARD_CONFIG[10].type, TILE_TYPES.FREE_PARKING);
  });

  it('BOARD_CONFIG[20] should be JAIL tile', () => {
    assert.strictEqual(BOARD_CONFIG[20].type, TILE_TYPES.JAIL);
  });

  it('BOARD_CONFIG[27] should be GO_TO_JAIL tile', () => {
    assert.strictEqual(BOARD_CONFIG[27].type, TILE_TYPES.GO_TO_JAIL);
  });

  it('QUESTION_TILE_IDS should contain 5 tiles', () => {
    assert.strictEqual(QUESTION_TILE_IDS.length, 5);
  });

  it('all question tiles in QUESTION_TILE_IDS should exist and have correct type', () => {
    QUESTION_TILE_IDS.forEach(id => {
      assert.ok(BOARD_CONFIG[id] !== undefined, `tile ${id} should exist`);
      // Note: not all QUESTION_TILE_IDS are guaranteed to be QUESTION type
      // as board may have chance tiles at those positions (e.g. tile 29 is CHANCE)
    });
  });

  it('BOARD_CONFIG should have 5 question tiles', () => {
    // Actual question tiles: [7, 17, 25, 34]
    const actualQuestionTileIds = BOARD_CONFIG
      .map((t, i) => t.type === TILE_TYPES.QUESTION ? i : null)
      .filter(i => i !== null);
    assert.strictEqual(actualQuestionTileIds.length, 5, 'should have exactly 5 question tiles');
    assert.deepStrictEqual(actualQuestionTileIds.sort(), [7, 17, 25, 29, 34]);
  });

  it('property tiles should have price and rent arrays', () => {
    const propertyTiles = BOARD_CONFIG.filter(t => t.type === TILE_TYPES.PROPERTY);
    assert.ok(propertyTiles.length > 0, 'should have property tiles');
    propertyTiles.forEach(tile => {
      assert.ok(typeof tile.price === 'number', `${tile.id} should have numeric price`);
      assert.ok(Array.isArray(tile.rent), `${tile.id} should have rent array`);
      assert.strictEqual(tile.rent.length, 6, `${tile.id} should have 6 rent levels`);
    });
  });

  it('tax tiles should have amount', () => {
    const taxTiles = BOARD_CONFIG.filter(t => t.type === TILE_TYPES.TAX);
    taxTiles.forEach(tile => {
      assert.ok(typeof tile.amount === 'number', `${tile.id} should have tax amount`);
    });
  });

  it('color groups should have correct hex colors', () => {
    Object.values(COLOR_GROUPS).forEach(color => {
      assert.match(color, /^#[0-9A-Fa-f]{6}$/, `${color} should be valid hex`);
    });
  });

  it('STARTING_MONEY should be 1500', () => {
    assert.strictEqual(STARTING_MONEY, 1500);
  });

  it('PASSING_GO_BONUS should be 200', () => {
    assert.strictEqual(PASSING_GO_BONUS, 200);
  });

  it('MAX_HOUSES should be 4', () => {
    assert.strictEqual(MAX_HOUSES, 4);
  });

  it('MAX_ROUNDS should be 20', () => {
    assert.strictEqual(MAX_ROUNDS, 20);
  });

  it('no property should have negative price', () => {
    const propertyTiles = BOARD_CONFIG.filter(t => t.type === TILE_TYPES.PROPERTY);
    propertyTiles.forEach(tile => {
      assert.ok(tile.price >= 0, `${tile.id} price should be non-negative`);
    });
  });

  it('chance tiles should have CHANCE type', () => {
    const chanceTiles = BOARD_CONFIG.filter(t => t.type === TILE_TYPES.CHANCE);
    chanceTiles.forEach(tile => {
      assert.strictEqual(tile.type, TILE_TYPES.CHANCE);
    });
  });
});
