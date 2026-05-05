// AI Brain - Strategic decision making for AI opponents
// Provides scoring functions for property purchase and house building decisions

import { BOARD_CONFIG, BOARD_SIZE } from './boardConfig';

// AI Difficulty levels
export const AI_DIFFICULTY = {
  EASY: 'easy',
  NORMAL: 'normal',
  HARD: 'hard',
};

const DIFFICULTY_LABELS = {
  [AI_DIFFICULTY.EASY]: '简单',
  [AI_DIFFICULTY.NORMAL]: '普通',
  [AI_DIFFICULTY.HARD]: '困难',
};

export const DIFFICULTY_NOISE = {
  [AI_DIFFICULTY.EASY]: 0.5,    // 50% random noise
  [AI_DIFFICULTY.NORMAL]: 0.2,   // 20% random noise
  [AI_DIFFICULTY.HARD]: 0.0,    // No noise
};

// Cash reserve thresholds
const SAFETY_FUND = 300;
const HOUSE_COST = 50;

/**
 * Get all tiles in the same color group as the given tile
 */
function getColorGroupTiles(tile) {
  if (!tile || !tile.group) return [];
  return BOARD_CONFIG.filter(t => t.type === 'property' && t.group === tile.group && t.id !== tile.id);
}

/**
 * Count how many tiles in a color group are owned by a player
 */
function countOwnedInGroup(playerId, groupTiles) {
  return groupTiles.filter(t => t.owner === playerId).length;
}

/**
 * Check if a color group is complete (player owns all tiles)
 */
function isColorGroupComplete(playerId, groupTiles) {
  return groupTiles.every(t => t.owner === playerId);
}

/**
 * Calculate traffic score for a tile (how often opponents pass through)
 * Corners and high-rent tiles have higher traffic
 */
function calculateTrafficScore(tile) {
  let traffic = 0;
  
  // Corners have highest traffic (GO, Jail, Free Parking, Go To Jail)
  if ([0, 10, 20, 27].includes(tile.id)) {
    traffic += 15;
  }
  
  // High-rent properties tend to be in high-traffic areas
  if (tile.type === 'property') {
    traffic += Math.min(10, tile.price / 50);
  }
  
  // Tax tiles and question tiles see regular traffic
  if (tile.type === 'tax') {
    traffic += 5;
  }
  
  return traffic;
}

/**
 * Score a property purchase decision
 * Higher score = more desirable to purchase
 * 
 * @param {Object} tile - The property tile to score
 * @param {Object} player - The AI player
 * @param {Object} state - Full game state
 * @param {string} difficulty - AI difficulty level
 * @returns {number} Score for purchasing this property
 */
export function scorePropertyPurchase(tile, player, state, difficulty = AI_DIFFICULTY.NORMAL) {
  if (!tile || tile.type !== 'property' || tile.owner !== null) {
    return -Infinity;
  }
  
  let score = 0;
  const groupTiles = getColorGroupTiles(tile);
  
  // 1. FUND SAFETY: Penalty if purchase leaves insufficient funds
  const remainingCash = player.money - tile.price;
  if (remainingCash < 0) {
    return -Infinity; // Can't afford
  }
  if (remainingCash < SAFETY_FUND) {
    score -= (SAFETY_FUND - remainingCash) * 0.5; // Risk penalty
  }
  
  // 2. COLOR GROUP COMPLETION BONUS
  const ownedInGroup = countOwnedInGroup(player.id, groupTiles);
  const totalInGroup = groupTiles.length + 1; // +1 for the tile being purchased
  
  // Only 1 tile away from complete group = huge bonus
  if (ownedInGroup === totalInGroup - 1) {
    score += 50;
  } else if (ownedInGroup > 0) {
    score += 20 * ownedInGroup;
  }
  
  // 3. ROI CALCULATION: Estimate payback turns
  if (tile.type === 'property' && tile.rent && tile.rent.length > 0) {
    const baseRent = tile.rent[0];
    const avgRent = baseRent * 0.3; // Assume 30% chance someone lands
    
    if (avgRent > 0) {
      const paybackTurns = tile.price / avgRent;
      // Faster payback = better investment
      score += Math.max(0, 25 - paybackTurns);
    }
  }
  
  // 4. TRAFFIC VALUE: Properties in high-traffic areas
  score += calculateTrafficScore(tile) * 2;
  
  // 5. ALREADY COMPLETE GROUP: If player owns full group, monopoly is very valuable
  if (isColorGroupComplete(player.id, groupTiles)) {
    score += 30;
  }
  
  // Apply difficulty-based noise
  const noise = DIFFICULTY_NOISE[difficulty] || 0.2;
  if (noise > 0) {
    const noiseFactor = 1 + (Math.random() - 0.5) * noise * 2;
    score *= noiseFactor;
  }
  
  return score;
}

/**
 * Score a house building decision on a specific property
 * 
 * @param {Object} tile - The property tile to build on
 * @param {Object} player - The AI player
 * @param {Object} state - Full game state
 * @param {string} difficulty - AI difficulty level
 * @returns {number} Score for building a house on this property
 */
export function scoreBuildHouse(tile, player, state, difficulty = AI_DIFFICULTY.NORMAL) {
  if (!tile || tile.type !== 'property') {
    return -Infinity;
  }
  
  // Can only build on properties player owns
  if (tile.owner !== player.id) {
    return -Infinity;
  }
  
  // Can't build if already at max houses
  if (tile.houses >= 4) {
    return -Infinity;
  }
  
  // Can't afford to build
  if (player.money < HOUSE_COST) {
    return -Infinity;
  }
  
  // Safety fund check
  if (player.money - HOUSE_COST < SAFETY_FUND) {
    return -Infinity;
  }
  
  let score = 0;
  const groupTiles = getColorGroupTiles(tile);
  
  // 1. FULL COLOR GROUP PRIORITY: Buildings on complete groups are much more valuable
  if (isColorGroupComplete(player.id, groupTiles)) {
    score += 40;
  } else {
    // Only build if at least 2 of the group are owned
    const ownedInGroup = countOwnedInGroup(player.id, groupTiles);
    if (ownedInGroup < 2) {
      return -Infinity; // Not worth building without monopoly potential
    }
    score += 15 * ownedInGroup;
  }
  
  // 2. HIGH-TRAFFIC TILES: Buildings on high-traffic areas pay off faster
  score += calculateTrafficScore(tile) * 3;
  
  // 3. ROI CALCULATION: Buildings on expensive properties have better ROI
  if (tile.rent && tile.rent.length > 0) {
    const currentRent = tile.rent[Math.min(tile.houses, 4)];
    const nextRent = tile.rent[Math.min(tile.houses + 1, 4)];
    const rentIncrease = nextRent - currentRent;
    
    if (rentIncrease > 0) {
      const paybackTurns = HOUSE_COST / (rentIncrease * 0.3);
      score += Math.max(0, 30 - paybackTurns);
    }
  }
  
  // Apply difficulty-based noise
  const noise = DIFFICULTY_NOISE[difficulty] || 0.2;
  if (noise > 0) {
    const noiseFactor = 1 + (Math.random() - 0.5) * noise * 2;
    score *= noiseFactor;
  }
  
  return score;
}

/**
 * Choose the best action for AI using scoring system
 * 
 * @param {Object} state - Full game state
 * @param {number} playerIndex - Index of the AI player in state.players
 * @param {string} difficulty - AI difficulty level
 * @returns {Object} Action to take: { action: 'buy'|'build'|'pass', tileId?: number }
 */
export function chooseAIAction(state, playerIndex, difficulty = AI_DIFFICULTY.NORMAL) {
  const player = state.players[playerIndex];
  if (!player || !player.isAI) {
    return { action: 'pass' };
  }
  
  const pos = player.position;
  const currentTile = BOARD_CONFIG[pos];
  
  // 1. EVALUATE PROPERTY PURCHASE
  if (currentTile && currentTile.type === 'property' && currentTile.owner === null) {
    const buyScore = scorePropertyPurchase(currentTile, player, state, difficulty);
    
    // Determine if AI should buy based on difficulty
    const buyThreshold = difficulty === AI_DIFFICULTY.EASY ? -20 :
                         difficulty === AI_DIFFICULTY.NORMAL ? 0 :
                         10;
    
    if (buyScore > buyThreshold || Math.random() < 0.3) {
      // Easy AI has 30% random purchase chance
      return { action: 'buy' };
    }
  }
  
  // 2. EVALUATE HOUSE BUILDING
  const buildableProperties = player.properties
    .map(propId => BOARD_CONFIG[propId])
    .filter(tile => tile && tile.type === 'property' && tile.owner === player.id && tile.houses < 4);
  
  if (buildableProperties.length > 0 && player.money >= HOUSE_COST + SAFETY_FUND) {
    let bestBuildScore = -Infinity;
    let bestTileId = null;
    
    for (const tile of buildableProperties) {
      const buildScore = scoreBuildHouse(tile, player, state, difficulty);
      if (buildScore > bestBuildScore) {
        bestBuildScore = buildScore;
        bestTileId = tile.id;
      }
    }
    
    const buildThreshold = difficulty === AI_DIFFICULTY.EASY ? -10 :
                           difficulty === AI_DIFFICULTY.NORMAL ? 5 :
                           15;
    
    if (bestBuildScore > buildThreshold) {
      return { action: 'build', tileId: bestTileId };
    }
  }
  
  // 3. DEFAULT: PASS
  return { action: 'pass' };
}

/**
 * Get difficulty label in Chinese
 */
export function getDifficultyLabel(difficulty) {
  return DIFFICULTY_LABELS[difficulty] || DIFFICULTY_LABELS[AI_DIFFICULTY.NORMAL];
}
