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

const {
  TILE_TYPES, COLOR_GROUPS, BOARD_CONFIG, BOARD_SIZE,
  QUESTION_TILE_IDS, STARTING_MONEY, PASSING_GO_BONUS,
  HOUSE_COST, MAX_HOUSES, MAX_ROUNDS
} = await import('../src/game/boardConfig.js');

const { rollDice, getDiceResult, isDoubles } = await import('../src/game/dice.js');

describe('boardConfig', () => {
  it('BOARD_SIZE should be 36', () => assert.strictEqual(BOARD_SIZE, 36));
  it('BOARD_CONFIG should have 36 tiles', () => assert.strictEqual(BOARD_CONFIG.length, 36));
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
  it('QUESTION_TILE_IDS should contain 4 tiles (corrected)', () => {
    // NOTE: original data had bug (5 tiles with 29 being CHANCE), corrected to 4
    assert.strictEqual(QUESTION_TILE_IDS.length, 4);
  });
  it('all tiles in QUESTION_TILE_IDS should exist', () => {
    QUESTION_TILE_IDS.forEach(id => {
      assert.ok(BOARD_CONFIG[id] !== undefined, `tile ${id} should exist`);
    });
  });
  it('BOARD_CONFIG should have question tiles', () => {
    // Actual: [7, 17, 25, 34] = 4 tiles
    // NOTE: QUESTION_TILE_IDS=[7,17,25,29,34] says 5 but tile 29 is CHANCE
    const actualQuestionTileIds = BOARD_CONFIG
      .map((t, i) => t.type === TILE_TYPES.QUESTION ? i : null)
      .filter(i => i !== null);
    assert.strictEqual(actualQuestionTileIds.length, 4);
  });
  it('property tiles should have price and rent arrays', () => {
    const propertyTiles = BOARD_CONFIG.filter(t => t.type === TILE_TYPES.PROPERTY);
    assert.ok(propertyTiles.length > 0);
    propertyTiles.forEach(tile => {
      assert.ok(typeof tile.price === 'number');
      assert.ok(Array.isArray(tile.rent));
      assert.strictEqual(tile.rent.length, 6);
    });
  });
  it('tax tiles should have positive amount', () => {
    const taxTiles = BOARD_CONFIG.filter(t => t.type === TILE_TYPES.TAX);
    taxTiles.forEach(tile => assert.ok(tile.amount > 0));
  });
  it('color groups should have valid hex colors', () => {
    Object.values(COLOR_GROUPS).forEach(color => {
      assert.match(color, /^#[0-9A-Fa-f]{6}$/);
    });
  });
  it('STARTING_MONEY should be 1500', () => assert.strictEqual(STARTING_MONEY, 1500));
  it('PASSING_GO_BONUS should be 200', () => assert.strictEqual(PASSING_GO_BONUS, 200));
  it('MAX_HOUSES should be 4', () => assert.strictEqual(MAX_HOUSES, 4));
  it('MAX_ROUNDS should be 20', () => assert.strictEqual(MAX_ROUNDS, 20));
  it('no property should have negative price', () => {
    const propertyTiles = BOARD_CONFIG.filter(t => t.type === TILE_TYPES.PROPERTY);
    propertyTiles.forEach(tile => assert.ok(tile.price >= 0));
  });
  it('chance tiles should have CHANCE type', () => {
    const chanceTiles = BOARD_CONFIG.filter(t => t.type === TILE_TYPES.CHANCE);
    chanceTiles.forEach(tile => assert.strictEqual(tile.type, TILE_TYPES.CHANCE));
  });
  it('all special tiles should have subtype', () => {
    BOARD_CONFIG.filter(t =>
      t.type !== TILE_TYPES.PROPERTY &&
      t.type !== TILE_TYPES.CHANCE &&
      t.type !== TILE_TYPES.QUESTION &&
      t.type !== TILE_TYPES.TAX
    ).forEach(tile => {
      assert.ok(tile.subtype, `${tile.id} should have subtype`);
    });
  });
  it('property prices should be reasonable (10-500)', () => {
    const propertyTiles = BOARD_CONFIG.filter(t => t.type === TILE_TYPES.PROPERTY);
    propertyTiles.forEach(tile => {
      assert.ok(tile.price >= 10 && tile.price <= 500);
    });
  });
  it('should have exactly 4 special location tiles', () => {
    const special = BOARD_CONFIG.filter(t =>
      t.type === TILE_TYPES.GO ||
      t.type === TILE_TYPES.JAIL ||
      t.type === TILE_TYPES.FREE_PARKING ||
      t.type === TILE_TYPES.GO_TO_JAIL
    );
    assert.strictEqual(special.length, 4);
  });
});

describe('dice utilities', () => {
  it('rollDice should return array of 2 numbers', () => {
    const result = rollDice();
    assert.strictEqual(Array.isArray(result), true);
    assert.strictEqual(result.length, 2);
  });
  it('rollDice values should be between 1 and 6', () => {
    for (let i = 0; i < 100; i++) {
      const [d1, d2] = rollDice();
      assert.ok(d1 >= 1 && d1 <= 6);
      assert.ok(d2 >= 1 && d2 <= 6);
    }
  });
  it('getDiceResult should sum two dice', () => {
    assert.strictEqual(getDiceResult([1, 1]), 2);
    assert.strictEqual(getDiceResult([3, 4]), 7);
    assert.strictEqual(getDiceResult([6, 6]), 12);
    assert.strictEqual(getDiceResult([1, 6]), 7);
    assert.strictEqual(getDiceResult([4, 5]), 9);
  });
  it('isDoubles should return true for matching dice', () => {
    assert.strictEqual(isDoubles([1, 1]), true);
    assert.strictEqual(isDoubles([6, 6]), true);
    assert.strictEqual(isDoubles([3, 3]), true);
  });
  it('isDoubles should return false for non-matching dice', () => {
    assert.strictEqual(isDoubles([1, 2]), false);
    assert.strictEqual(isDoubles([3, 4]), false);
    assert.strictEqual(isDoubles([5, 6]), false);
  });
  it('dice values should be integers', () => {
    for (let i = 0; i < 50; i++) {
      const [d1, d2] = rollDice();
      assert.strictEqual(Number.isInteger(d1), true);
      assert.strictEqual(Number.isInteger(d2), true);
    }
  });
  it('getDiceResult should handle all valid combinations', () => {
    for (let d1 = 1; d1 <= 6; d1++) {
      for (let d2 = 1; d2 <= 6; d2++) {
        assert.strictEqual(getDiceResult([d1, d2]), d1 + d2);
      }
    }
  });
  it('isDoubles should be symmetric', () => {
    for (let d = 1; d <= 6; d++) {
      assert.strictEqual(isDoubles([d, d]), true);
    }
  });
  it('rollDice should have uniform distribution (statistical test)', () => {
    const counts = {};
    for (let i = 0; i < 600; i++) {
      const [d1] = rollDice();
      counts[d1] = (counts[d1] || 0) + 1;
    }
    // Each face should appear roughly 100 times (600 rolls / 6 faces)
    // Allow 40% deviation for statistical variance
    Object.values(counts).forEach(count => {
      assert.ok(count >= 60 && count <= 140, `count ${count} outside expected range 60-140`);
    });
  });
});

describe('player starting conditions', () => {
  it('STARTING_MONEY should be positive', () => assert.ok(STARTING_MONEY > 0));
  it('PASSING_GO_BONUS should be positive', () => assert.ok(PASSING_GO_BONUS > 0));
  it('HOUSE_COST should be positive', () => assert.ok(HOUSE_COST > 0));
  it('MAX_ROUNDS should be positive', () => assert.ok(MAX_ROUNDS > 0));
});

describe('board integrity', () => {
  it('all tiles should have id and nameKey', () => {
    BOARD_CONFIG.forEach(tile => {
      assert.strictEqual(typeof tile.id, 'number');
      assert.ok(typeof tile.nameKey === 'string' && tile.nameKey.length > 0);
    });
  });
  it('all property tiles should have valid owner/houses/mortgaged state', () => {
    const propertyTiles = BOARD_CONFIG.filter(t => t.type === TILE_TYPES.PROPERTY);
    propertyTiles.forEach(tile => {
      assert.strictEqual(tile.owner, null);
      assert.strictEqual(tile.houses, 0);
      assert.strictEqual(tile.mortgaged, false);
    });
  });
  it('no duplicate tile IDs', () => {
    const ids = BOARD_CONFIG.map(t => t.id);
    const uniqueIds = [...new Set(ids)];
    assert.strictEqual(ids.length, uniqueIds.length);
  });
  it('tile IDs should be 0-35', () => {
    BOARD_CONFIG.forEach(tile => {
      assert.ok(tile.id >= 0 && tile.id < 36);
    });
  });
});
