/**
 * AdvisorUI - Plain object factory for strategy advisor UI
 * Returns data object (not React component) for use in UI layer
 */

/**
 * Create advisor data object for UI consumption
 * @param {StrategyAdvisor} advisor
 * @param {object} gameState
 * @param {string} playerId
 * @returns {object} advisorData
 */
export function createAdvisorData(advisor, gameState, playerId) {
  if (!advisor || !gameState || !playerId) {
    return { suggestions: [], phase: 'unknown', recommendedStrategy: null, explanations: [] };
  }

  const suggestions = [];
  let primary = null;
  let alternatives = [];

  try {
    const result = advisor.suggestNextMove(playerId, gameState);
    primary = result.primary;
    alternatives = result.alternatives || [];
    suggestions.push(...alternatives);
  } catch (e) {
    // If advisor fails, return empty
  }

  const phase = advisor.getGamePhase?.(gameState) || 'unknown';
  const recommendedStrategy = advisor.getRecommendedStrategy?.(phase) || null;

  // Property purchase suggestions for nearby tiles
  const propertySuggestions = [];
  if (gameState?.tiles) {
    const nearbyTiles = gameState.tiles.slice(0, 4);
    for (const tile of nearbyTiles) {
      if (tile.type === 'property') {
        try {
          const propResult = advisor.suggestPropertyPurchase(tile.id, playerId, gameState);
          propertySuggestions.push({
            tileId: tile.id,
            tileName: tile.name,
            ...propResult,
          });
        } catch (e) {
          propertySuggestions.push({ tileId: tile.id, tileName: tile.name, shouldBuy: false, reasoning: 'Error analyzing' });
        }
      }
    }
  }

  // Generate explanations
  const explanations = suggestions.map((s, i) => ({
    id: `expl-${i}`,
    action: s.action?.label || s.action?.type || 'unknown',
    confidence: s.confidence || 0,
    reasoning: s.reasoning || 'No reasoning available',
  }));

  if (primary) {
    explanations.unshift({
      id: 'primary',
      action: primary.action?.label || primary.action?.type || 'unknown',
      confidence: primary.confidence || 0,
      reasoning: primary.reasoning || 'Best move',
    });
  }

  return {
    suggestions: propertySuggestions,
    phase,
    recommendedStrategy,
    explanations,
    primaryMove: primary,
    alternatives: alternatives.slice(0, 3),
  };
}

/**
 * Get phase-specific color for UI
 */
export function getPhaseColor(phase) {
  const colors = { early: '#4CAF50', mid: '#FF9800', late: '#F44336', unknown: '#9E9E9E' };
  return colors[phase] || colors.unknown;
}

/**
 * Format confidence as percentage
 */
export function formatConfidence(confidence) {
  return `${Math.round((confidence || 0) * 100)}%`;
}