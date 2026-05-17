// StrategyGuide - Property and game strategy advisor
// Inspired by nanobot's ToolRegistry pattern: discoverable, composable strategy tools

import { BOARD_CONFIG } from './boardConfig.js';
import { AI_PERSONALITY } from './aiBrain.js';

// ==================== STRATEGY TOOLS ====================

/**
 * Evaluate if a property is worth buying
 */
export function evaluatePropertyBuy(player, tile, allPlayers) {
  const score = {
    tileId: tile.id,
    tileName: tile.name,
    price: tile.price,
    rent: tile.rent?.[0] || 0,
    colorGroup: tile.colorGroup,
    score: 0,
    reasons: [],
    recommendation: 'neutral', // buy | dont_buy | conditional
    confidence: 0, // 0-100
  };

  // 1. Check if player can afford it
  if (player.money < tile.price) {
    score.recommendation = 'dont_buy';
    score.reasons.push('资金不足');
    score.confidence = 95;
    return score;
  }

  // 2. Calculate ROI (rent / price * 100)
  if (tile.rent && tile.rent.length > 0) {
    const roi = (tile.rent[0] / tile.price) * 100;
    if (roi >= 10) {
      score.score += 30;
      score.reasons.push(`高ROI: ${roi.toFixed(1)}%`);
    } else if (roi >= 5) {
      score.score += 15;
      score.reasons.push(`中等ROI: ${roi.toFixed(1)}%`);
    }
  }

  // 3. Check color group completion potential
  if (tile.colorGroup) {
    const groupTiles = BOARD_CONFIG.filter(t => t.colorGroup === tile.colorGroup);
    const ownedByMe = groupTiles.filter(t => player.properties.includes(t.id)).length;
    const ownedByOthers = groupTiles.filter(t => t.owner !== null && t.owner !== player.id).length;

    if (ownedByMe === groupTiles.length - 1) {
      // Almost complete monopoly - high value
      score.score += 40;
      score.reasons.push('即将形成垄断！');
      score.confidence = 90;
    } else if (ownedByMe >= 1) {
      score.score += 20;
      score.reasons.push(`已有${ownedByMe}/${groupTiles.length}同色地块`);
    } else if (ownedByOthers === groupTiles.length) {
      // All owned by others - risky
      score.score -= 20;
      score.reasons.push('全部被对手占有');
    }
  }

  // 4. Traffic score (how often players land here)
  const trafficScore = getTrafficScore(tile.id);
  score.score += trafficScore;
  if (trafficScore > 5) {
    score.reasons.push('高流量地块');
  }

  // 5. Safety fund check
  const SAFETY_FUND = 300;
  if (player.money - tile.price < SAFETY_FUND) {
    score.score -= 15;
    score.reasons.push('购买后低于安全资金线');
  }

  // Final recommendation
  if (score.score >= 30) {
    score.recommendation = 'buy';
  } else if (score.score < 0) {
    score.recommendation = 'dont_buy';
  } else {
    score.recommendation = 'conditional';
  }

  score.confidence = Math.min(95, Math.max(50, 50 + score.score));

  return score;
}

/**
 * Get traffic score for a tile (how often players land here)
 */
function getTrafficScore(tileId) {
  // Corners and key positions have higher traffic
  const highTrafficTiles = [0, 5, 10, 15, 20, 25, 30, 35]; // Corners
  if (highTrafficTiles.includes(tileId)) return 8;

  // Chance cards and question tiles
  const chanceTiles = [2, 7, 12, 17, 22, 33, 36];
  if (chanceTiles.includes(tileId)) return 5;

  // Property tiles
  const propertyTiles = BOARD_CONFIG.filter(t => t.type === 'property');
  const index = propertyTiles.findIndex(t => t.id === tileId);
  if (index !== -1) {
    // Middle of board tends to get more traffic
    if (index >= 6 && index <= 15) return 6;
    return 3;
  }

  return 2;
}

/**
 * Suggest best house building location
 */
export function suggestBuildLocation(player, allPlayers) {
  const buildable = player.properties
    .map(propId => BOARD_CONFIG[propId])
    .filter(tile => tile && tile.type === 'property' && tile.owner === player.id && tile.houses < 4);

  if (buildable.length === 0) {
    return null;
  }

  const scored = buildable.map(tile => {
    let score = 0;
    const reasons = [];

    // Check if completes monopoly
    if (tile.colorGroup) {
      const groupTiles = BOARD_CONFIG.filter(t => t.colorGroup === tile.colorGroup);
      const allOwned = groupTiles.every(t => player.properties.includes(t.id));
      if (allOwned) {
        score += 50;
        reasons.push('已完成垄断');
      }
    }

    // High traffic
    const traffic = getTrafficScore(tile.id);
    score += traffic * 2;
    if (traffic > 5) reasons.push('高流量');

    // Good ROI
    if (tile.rent && tile.rent.length > 0) {
      const nextRent = tile.rent[Math.min(tile.houses + 1, 4)];
      const roi = (nextRent - tile.rent[tile.houses]) / 50 * 100;
      if (roi > 50) {
        score += 20;
        reasons.push('高租金增长');
      }
    }

    return { tile, score, reasons };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];

  return {
    tileId: best.tile.id,
    tileName: best.tile.name,
    score: best.score,
    reasons: best.reasons,
    recommendation: 'build_here',
  };
}

/**
 * Analyze current game state and give strategic overview
 */
export function analyzeGameState(player, allPlayers, currentRound) {
  const analysis = {
    netWorth: player.money + player.properties.reduce((sum, pId) => {
      const tile = BOARD_CONFIG[pId];
      return sum + (tile?.price || 0) + (tile?.houses || 0) * 50;
    }, 0),
    propertyCount: player.properties.length,
    monopolies: [],
    strongestColor: null,
    weakestColor: null,
    playerRank: 0,
    recommendations: [],
  };

  // Find monopolies
  const colorGroups = {};
  for (const propId of player.properties) {
    const tile = BOARD_CONFIG[propId];
    if (tile?.colorGroup) {
      if (!colorGroups[tile.colorGroup]) {
        colorGroups[tile.colorGroup] = [];
      }
      colorGroups[tile.colorGroup].push(propId);
    }
  }

  for (const [color, props] of Object.entries(colorGroups)) {
    const groupTiles = BOARD_CONFIG.filter(t => t.colorGroup === color);
    if (props.length === groupTiles.length) {
      analysis.monopolies.push(color);
    }
  }

  // Rank players by net worth
  const rankings = allPlayers
    .filter(p => !p.isBankrupt)
    .map(p => ({
      id: p.id,
      netWorth: p.money + p.properties.reduce((sum, pId) => {
        const tile = BOARD_CONFIG[pId];
        return sum + (tile?.price || 0) + (tile?.houses || 0) * 50;
      }, 0),
    }))
    .sort((a, b) => b.netWorth - a.netWorth);

  analysis.playerRank = rankings.findIndex(r => r.id === player.id) + 1;

  // Generate recommendations
  if (analysis.monopolies.length > 0) {
    analysis.recommendations.push({
      priority: 'high',
      text: `你的垄断: ${analysis.monopolies.join(', ')} - 优先建房！`,
    });
  }

  if (player.properties.length < 2 && currentRound < 5) {
    analysis.recommendations.push({
      priority: 'medium',
      text: '前期多购置房产，积累资产',
    });
  }

  if (player.money < 300) {
    analysis.recommendations.push({
      priority: 'high',
      text: '保持至少$300安全资金',
    });
  }

  return analysis;
}

/**
 * Get purchase advice for current tile
 */
export function getPurchaseAdvice(player, tile) {
  const evaluation = evaluatePropertyBuy(player, tile, []);

  const advice = {
    shouldBuy: evaluation.recommendation === 'buy',
    reasons: evaluation.reasons,
    confidence: evaluation.confidence,
    shortTip: '',
  };

  if (evaluation.recommendation === 'buy') {
    advice.shortTip = `建议购买 - ${evaluation.reasons[0] || '投资价值高'}`;
  } else if (evaluation.recommendation === 'dont_buy') {
    advice.shortTip = `不建议购买 - ${evaluation.reasons[0] || '条件不足'}`;
  } else {
    advice.shortTip = `可考虑购买 - ${evaluation.reasons[0] || '视情况而定'}`;
  }

  return advice;
}

/**
 * Generate step-by-step guidance for new players
 */
export function getTutorialStep(player, step) {
  const tutorials = [
    {
      step: 1,
      title: '认识你的棋子',
      content: '你现在是蓝色棋子。轮到你时，点击🎲掷骰子移动。',
      highlight: '.dice-button',
    },
    {
      step: 2,
      title: '购买房产',
      content: '当你停在空白房产上时，可以选择购买。房产可以为你带来租金收入！',
      highlight: '.buy-property-btn',
    },
    {
      step: 3,
      title: '建造房屋',
      content: '当你拥有一整组同色房产后，可以建造房屋。房屋越多，租金越高！',
      highlight: '.build-house-btn',
    },
    {
      step: 4,
      title: '回答问题',
      content: '停在?格子上会回答问题。答对获得奖励，答错也不会处罚。',
      highlight: '.question-modal',
    },
    {
      step: 5,
      title: '赢得游戏',
      content: '通过购买房产、建造房屋、收取租金来增加资产。最后剩余玩家即为胜者！',
      highlight: null,
    },
  ];

  return tutorials.find(t => t.step === step) || tutorials[tutorials.length - 1];
}

// ==================== TOOL REGISTRY ====================

export const STRATEGY_TOOLS = {
  evaluatePropertyBuy: {
    name: 'evaluate_property_buy',
    description: '评估是否应该购买某个房产',
    params: ['player', 'tile', 'allPlayers'],
  },
  suggestBuildLocation: {
    name: 'suggest_build_location',
    description: '建议在哪里建造房屋',
    params: ['player', 'allPlayers'],
  },
  analyzeGameState: {
    name: 'analyze_game_state',
    description: '分析当前游戏局势',
    params: ['player', 'allPlayers', 'currentRound'],
  },
  getPurchaseAdvice: {
    name: 'get_purchase_advice',
    description: '获取当前地块购买建议',
    params: ['player', 'tile'],
  },
  getTutorialStep: {
    name: 'get_tutorial_step',
    description: '获取新手指引步骤',
    params: ['player', 'step'],
  },
};

/**
 * Call a strategy tool by name (similar to nanobot's ToolRegistry)
 */
export function callTool(toolName, params) {
  const tool = STRATEGY_TOOLS[toolName];
  if (!tool) {
    return { error: `Unknown tool: ${toolName}` };
  }

  try {
    switch (toolName) {
      case 'evaluatePropertyBuy':
        return evaluatePropertyBuy(...params);
      case 'suggestBuildLocation':
        return suggestBuildLocation(...params);
      case 'analyzeGameState':
        return analyzeGameState(...params);
      case 'getPurchaseAdvice':
        return getPurchaseAdvice(...params);
      case 'getTutorialStep':
        return getTutorialStep(...params);
      default:
        return { error: `Tool not implemented: ${toolName}` };
    }
  } catch (err) {
    return { error: err.message };
  }
}