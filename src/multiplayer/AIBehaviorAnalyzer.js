/**
 * AI Behavior Analyzer
 * 
 * Analyzes AI decision-making patterns from game replays.
 * Extracts insights like:
 * - Property purchase patterns
 * - Building strategies
 * - Trade behavior
 * - Risk tolerance
 * 
 * Inspired by ChatDev's Replay analysis for AI self-improvement.
 */

import { AI_PERSONALITY } from '../game/aiBrain';

/**
 * Analyze AI behavior from a replay's events
 */
export function analyzeAIBehavior(replayData) {
  const aiPlayers = replayData.players?.filter(p => p.isAI) || [];
  if (aiPlayers.length === 0) {
    return { error: 'No AI players found in replay', insights: [] };
  }

  const insights = [];

  for (const ai of aiPlayers) {
    const aiEvents = replayData.events.filter(e => e.playerId === ai.id);
    const personality = ai.personality || detectPersonality(aiEvents);
    
    const insight = {
      playerId: ai.id,
      playerName: ai.name,
      detectedPersonality: personality,
      stats: analyzeStats(aiEvents),
      patterns: analyzePatterns(aiEvents, replayData.events),
    };
    
    insights.push(insight);
  }

  return { insights };
}

/**
 * Detect AI personality from behavior patterns
 */
function detectPersonality(events) {
  let purchaseCount = 0;
  let tradeCount = 0;
  let buildCount = 0;
  let aggressivePurchases = 0; // Buying expensive properties

  for (const event of events) {
    if (event.type === 'buy_property') {
      purchaseCount++;
      const price = event.payload?.price || 0;
      if (price > 200) aggressivePurchases++;
    }
    if (event.type === 'trade_property') tradeCount++;
    if (event.type === 'build_house') buildCount++;
  }

  // Calculate ratios
  const purchaseRate = purchaseCount / Math.max(events.length, 1);
  const tradeRate = tradeCount / Math.max(events.length, 1);
  const aggressiveRate = aggressivePurchases / Math.max(purchaseCount, 1);

  // Personality detection
  if (aggressiveRate > 0.6) return AI_PERSONALITY.AGGRESSIVE;
  if (tradeRate > 0.15) return AI_PERSONALITY.BALANCED;
  if (buildCount > purchaseCount * 0.5) return AI_PERSONALITY.CONSERVATIVE;
  return AI_PERSONALITY.BALANCED;
}

/**
 * Get basic stats for an AI player
 */
function analyzeStats(events) {
  const stats = {
    totalEvents: events.length,
    purchases: events.filter(e => e.type === 'buy_property').length,
    builds: events.filter(e => e.type === 'build_house').length,
    trades: events.filter(e => e.type === 'trade_property').length,
    diceRolls: events.filter(e => e.type === 'roll_dice').length,
    rentPaid: 0,
    rentReceived: 0,
  };

  for (const event of events) {
    if (event.type === 'pay_toll' || event.type === 'pay_rent') {
      stats.rentPaid += event.payload?.amount || 0;
    }
    if (event.type === 'receive_money' && event.payload?.source === 'rent') {
      stats.rentReceived += event.payload?.amount || 0;
    }
  }

  stats.netRent = stats.rentReceived - stats.rentPaid;
  stats.purchaseRate = stats.purchases / Math.max(stats.diceRolls, 1);
  stats.buildRate = stats.builds / Math.max(stats.purchases, 1);

  return stats;
}

/**
 * Analyze behavioral patterns
 */
function analyzePatterns(events, allEvents) {
  const patterns = [];

  // Property targeting pattern
  const propertyTypes = {};
  for (const event of events) {
    if (event.type === 'buy_property' && event.payload?.propertyType) {
      const type = event.payload.propertyType;
      propertyTypes[type] = (propertyTypes[type] || 0) + 1;
    }
  }
  if (Object.keys(propertyTypes).length > 0) {
    const favorite = Object.entries(propertyTypes).sort((a, b) => b[1] - a[1])[0];
    patterns.push({
      type: 'property_preference',
      value: favorite[0],
      count: favorite[1],
    });
  }

  // Timing pattern - when does AI typically buy?
  const turnDistribution = {};
  for (const event of events) {
    if (event.type === 'buy_property' && event.turnIndex !== undefined) {
      const phase = Math.floor(event.turnIndex / 10);
      turnDistribution[phase] = (turnDistribution[phase] || 0) + 1;
    }
  }
  if (Object.keys(turnDistribution).length > 0) {
    const activePhase = Object.entries(turnDistribution).sort((a, b) => b[1] - a[1])[0];
    patterns.push({
      type: 'peak_activity',
      value: `turn_${activePhase[0] * 10}_${(activePhase[0] + 1) * 10}`,
      count: activePhase[1],
    });
  }

  // Reaction to challenges - does AI take risks when low on money?
  const riskyActions = events.filter(e => 
    e.type === 'buy_property' && 
    e.payload?.wasLowMoney === true
  );
  if (riskyActions.length > 0) {
    patterns.push({
      type: 'risk_taking',
      value: 'takes_risky_purchases_when_low',
      count: riskyActions.length,
    });
  }

  return patterns;
}

/**
 * Generate AI behavior report from replay
 */
export function generateAIReport(replayData) {
  const { insights } = analyzeAIBehavior(replayData);
  
  if (insights.length === 0) {
    return 'No AI behavior data available for analysis.';
  }

  let report = `# AI行为分析报告\n\n`;
  report += `**回放ID**: ${replayData.id?.slice(-8) || 'unknown'}\n`;
  report += `**玩家数**: ${replayData.players?.length || 0}\n`;
  report += `**事件数**: ${replayData.events?.length || 0}\n`;
  report += `**游戏时长**: ${formatDuration(replayData.duration)}\n\n`;

  for (const insight of insights) {
    report += `## ${insight.playerName}\n`;
    report += `- **检测性格**: ${insight.detectedPersonality}\n`;
    report += `- **购买次数**: ${insight.stats.purchases}\n`;
    report += `- **建造次数**: ${insight.stats.builds}\n`;
    report += `- **交易次数**: ${insight.stats.trades}\n`;
    report += `- **租金收支**: ${insight.stats.netRent > 0 ? '+' : ''}${insight.stats.netRent}\n`;
    report += `- **购买率**: ${(insight.stats.purchaseRate * 100).toFixed(1)}%\n`;

    if (insight.patterns.length > 0) {
      report += `\n**行为模式**:\n`;
      for (const pattern of insight.patterns) {
        report += `- ${pattern.type}: ${pattern.value} (${pattern.count}次)\n`;
      }
    }
    report += '\n';
  }

  return report;
}

function formatDuration(ms) {
  if (!ms) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Export AI behavior data for training
 */
export function exportAIData(replayData) {
  const { insights } = analyzeAIBehavior(replayData);
  
  return {
    replayId: replayData.id,
    exportedAt: Date.now(),
    players: insights.map(i => ({
      id: i.playerId,
      personality: i.detectedPersonality,
      stats: i.stats,
      patterns: i.patterns,
    })),
  };
}