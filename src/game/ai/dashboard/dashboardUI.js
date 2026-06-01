/**
 * DashboardUI - Plain data factory for AI Performance Dashboard
 * 
 * Creates data structures for UI rendering from performance dashboard.
 * Part of Direction B: AI Performance Dashboard (v8).
 */

/**
 * Create dashboard data for UI rendering
 * @param {PerformanceDashboard} dashboard - PerformanceDashboard instance
 * @param {string} playerId - Player ID
 * @returns {object} Dashboard data for UI
 */
export function createDashboardData(dashboard, playerId) {
  const data = dashboard.getDashboardData(playerId);
  
  return {
    metrics: {
      winRate: formatPercent(data.winRate),
      avgPlacement: formatPlacement(data.avgPlacement),
      profitPerGame: formatMoney(data.profitPerGame),
      decisionAccuracy: formatPercent(data.decisionAccuracy),
    },
    charts: createChartData(data),
    achievements: data.milestones,
    summary: generateSummary(data),
    nextAchievement: data.nextMilestone,
  };
}

/**
 * Create chart data for visualization
 * @param {object} data - Dashboard data
 * @returns {Array} Chart data arrays
 */
function createChartData(data) {
  const charts = [];
  
  // Win rate trend chart
  charts.push({
    id: 'winRateTrend',
    type: 'line',
    title: 'Win Rate Trend',
    labels: ['Game 1', 'Game 2', 'Game 3', 'Game 4', 'Game 5'],
    data: [0.25, 0.33, 0.5, 0.4, 0.5], // Placeholder data
    color: '#4CAF50',
  });
  
  // Performance trend chart
  charts.push({
    id: 'performanceTrend',
    type: 'bar',
    title: 'Performance Metrics',
    labels: ['Win Rate', 'Accuracy', 'Strategy'],
    data: [
      data.winRate * 100,
      data.decisionAccuracy * 100,
      Math.min(data.stats.strategies * 10, 100),
    ],
    color: '#2196F3',
  });
  
  // Placement distribution
  charts.push({
    id: 'placementDistribution',
    type: 'pie',
    title: 'Placement Distribution',
    labels: ['1st', '2nd', '3rd', '4th'],
    data: calculatePlacementDistribution(data.avgPlacement),
    color: ['#FFD700', '#C0C0C0', '#CD7F32', '#808080'],
  });
  
  // Trend indicators
  charts.push({
    id: 'trendIndicators',
    type: 'indicator',
    title: 'Performance Trends',
    data: [
      { label: 'Win Rate', trend: data.trends.winRate.direction, delta: data.trends.winRate.delta },
      { label: 'Placement', trend: data.trends.avgPlacement.direction, delta: data.trends.avgPlacement.delta },
      { label: 'Profit', trend: data.trends.profit.direction, delta: data.trends.profit.delta },
    ],
  });
  
  return charts;
}

/**
 * Calculate placement distribution from average placement
 * @param {number} avgPlacement - Average placement (1-4)
 * @returns {Array} Distribution percentages
 */
function calculatePlacementDistribution(avgPlacement) {
  // Estimate distribution based on average placement
  // Lower avg placement (better) means more 1st and 2nd places
  const performance = (4 - avgPlacement) / 3; // 0-1 scale
  
  const first = Math.max(5, Math.round(25 + performance * 25)); // 25-50%
  const second = Math.round(25 + performance * 10); // 25-35%
  const third = Math.round(25 - performance * 10); // 15-25%
  const fourth = 100 - first - second - third;
  
  return [first, second, third, fourth];
}

/**
 * Generate summary text based on dashboard data
 * @param {object} data - Dashboard data
 * @returns {string} Summary text
 */
function generateSummary(data) {
  const parts = [];
  
  // Win rate summary
  if (data.winRate >= 0.75) {
    parts.push('Your AI is dominating with excellent win rates!');
  } else if (data.winRate >= 0.5) {
    parts.push('Your AI is performing well with a solid win rate.');
  } else if (data.winRate >= 0.25) {
    parts.push('Your AI is making progress and learning from games.');
  } else {
    parts.push('Keep practicing! Your AI is developing its skills.');
  }
  
  // Trend summary
  const improvingTrends = Object.values(data.trends)
    .filter(t => t.direction === 'improving').length;
  
  if (improvingTrends >= 3) {
    parts.push('Strong upward momentum across metrics!');
  } else if (improvingTrends >= 1) {
    parts.push('Some metrics are showing improvement.');
  }
  
  // Decision accuracy
  if (data.decisionAccuracy >= 0.8) {
    parts.push('Excellent decision-making accuracy.');
  } else if (data.decisionAccuracy >= 0.5) {
    parts.push('Decision-making is improving.');
  }
  
  return parts.join(' ');
}

/**
 * Format percentage value
 * @param {number} value - Value (0-1)
 * @returns {string} Formatted percentage
 */
export function formatPercent(value) {
  if (typeof value !== 'number' || isNaN(value)) {
    return '0%';
  }
  return Math.round(value * 100) + '%';
}

/**
 * Format placement value
 * @param {number} placement - Placement (1-4)
 * @returns {string} Formatted placement
 */
export function formatPlacement(placement) {
  if (typeof placement !== 'number' || isNaN(placement)) {
    return 'N/A';
  }
  const formatted = placement.toFixed(1);
  if (placement <= 1.5) {
    return `${formatted} (Top)`;
  } else if (placement <= 2.5) {
    return `${formatted} (Middle)`;
  } else {
    return `${formatted} (Bottom)`;
  }
}

/**
 * Format money value
 * @param {number} value - Money amount
 * @returns {string} Formatted money
 */
export function formatMoney(value) {
  if (typeof value !== 'number' || isNaN(value)) {
    return '$0';
  }
  return '$' + Math.round(value).toLocaleString();
}

/**
 * Create achievement card data
 * @param {object} milestone - Milestone object
 * @param {number} progress - Progress (0-1)
 * @returns {object} Achievement card data
 */
export function createAchievementCard(milestone, progress) {
  return {
    id: milestone.id,
    icon: milestone.icon,
    name: milestone.name,
    description: milestone.description,
    progress: Math.round(progress * 100),
    achieved: progress >= 1,
  };
}

/**
 * Create metrics comparison data
 * @param {object} current - Current metrics
 * @param {object} previous - Previous metrics
 * @returns {object} Comparison data
 */
export function createMetricsComparison(current, previous) {
  return {
    winRate: compareMetric(current.winRate, previous.winRate),
    avgPlacement: compareMetric(previous.avgPlacement, current.avgPlacement), // Lower is better
    profitPerGame: compareMetric(current.profitPerGame, previous.profitPerGame),
    decisionAccuracy: compareMetric(current.decisionAccuracy, previous.decisionAccuracy),
  };
}

/**
 * Compare two metric values
 * @param {number} current - Current value
 * @param {number} previous - Previous value
 * @returns {object} Comparison result
 */
function compareMetric(current, previous) {
  if (previous === 0) {
    return { change: 0, percentChange: 0, direction: 'neutral' };
  }
  
  const change = current - previous;
  const percentChange = (change / previous) * 100;
  
  let direction = 'neutral';
  if (change > 0) direction = 'up';
  else if (change < 0) direction = 'down';
  
  return {
    change,
    percentChange,
    direction,
  };
}