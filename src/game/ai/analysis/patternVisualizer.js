/**
 * PatternVisualizer - Generate data for pattern visualization
 * 
 * Creates visualization data structures for D3.js graphs,
 * decision timelines, and heatmaps.
 */

export class PatternVisualizer {
  /**
   * Create a pattern visualizer
   * @param {object} patternAnalyzer - DecisionPatternAnalyzer instance
   * @param {object} memoryLayer - Memory layer instance
   */
  constructor(patternAnalyzer, memoryLayer) {
    this.patternAnalyzer = patternAnalyzer;
    this.memoryLayer = memoryLayer;
  }

  /**
   * Generate pattern graph data for D3.js
   * @param {string} playerId - Player ID
   * @returns {object} Graph data with {nodes: [], edges: []}
   */
  generatePatternGraph(playerId) {
    const patterns = this.patternAnalyzer.detectDecisionPatterns(playerId);
    const nodes = [];
    const edges = [];
    const nodeIds = new Set();

    // Create nodes from patterns
    for (let i = 0; i < patterns.length; i++) {
      const pattern = patterns[i];
      const nodeId = `pattern_${i}`;
      
      nodes.push({
        id: nodeId,
        label: pattern.type,
        count: pattern.count,
        strength: pattern.strength,
        type: 'pattern',
      });
      nodeIds.add(nodeId);

      // Create edge to associated decisions
      if (pattern.decisions) {
        for (let j = 0; j < pattern.decisions.length; j++) {
          const decision = pattern.decisions[j];
          const decisionNodeId = `decision_${i}_${j}`;
          
          nodes.push({
            id: decisionNodeId,
            label: decision.action || 'unknown',
            type: 'decision',
          });
          
          edges.push({
            source: nodeId,
            target: decisionNodeId,
            weight: 1,
          });
        }
      }
    }

    // Add central "Player" node
    nodes.unshift({
      id: 'player',
      label: 'Player',
      type: 'player',
    });

    // Connect player to patterns
    for (const node of nodes) {
      if (node.type === 'pattern' && node.id !== 'player') {
        edges.push({
          source: 'player',
          target: node.id,
          weight: node.count || 1,
        });
      }
    }

    return { nodes, edges };
  }

  /**
   * Generate decision timeline for a player in a game
   * @param {string} playerId - Player ID
   * @param {string} gameId - Game ID (optional)
   * @returns {Array} Timeline events
   */
  generateDecisionTimeline(playerId, gameId) {
    const decisions = this.memoryLayer.getDecisions?.(playerId) ||
                      this.memoryLayer.l2?.getDecisions?.(playerId) || [];
    
    const timeline = [];

    for (const decision of decisions) {
      // Filter by gameId if provided
      if (gameId && decision.gameId && decision.gameId !== gameId) {
        continue;
      }

      timeline.push({
        id: decision.id,
        timestamp: decision.timestamp || Date.now(),
        action: decision.action || 'unknown',
        situation: decision.situation || '',
        reasoning: decision.reasoning || '',
        score: this.patternAnalyzer.scoreDecision(decision),
      });
    }

    // Sort by timestamp
    timeline.sort((a, b) => a.timestamp - b.timestamp);

    return timeline;
  }

  /**
   * Generate heatmap data
   * @param {string} playerId - Player ID
   * @returns {object} Heatmap data with {x: tileId, y: action, value: frequency}
   */
  generateHeatmapData(playerId) {
    const decisions = this.memoryLayer.getDecisions?.(playerId) ||
                      this.memoryLayer.l2?.getDecisions?.(playerId) || [];
    
    const heatmapGrid = new Map();

    // Define tile range (Monopoly has 40 tiles)
    const tileIds = Array.from({ length: 40 }, (_, i) => i);
    const actions = ['buy', 'skip', 'pay', 'negotiate', 'trade', 'upgrade', 'respond', 'pass'];

    // Initialize grid
    for (const tileId of tileIds) {
      for (const action of actions) {
        heatmapGrid.set(`${tileId}_${action}`, 0);
      }
    }

    // Count occurrences
    for (const decision of decisions) {
      const tileId = decision.tileId || 0;
      const action = decision.action?.toLowerCase() || 'unknown';

      if (actions.includes(action)) {
        const key = `${tileId}_${action}`;
        heatmapGrid.set(key, (heatmapGrid.get(key) || 0) + 1);
      }
    }

    // Convert to array format
    const data = [];
    for (const [key, value] of heatmapGrid) {
      const [tileId, action] = key.split('_');
      data.push({
        x: parseInt(tileId),
        y: action,
        value,
      });
    }

    return { x: tileIds, y: actions, values: data };
  }

  /**
   * Get summary statistics for UI display
   * @param {string} playerId - Player ID
   * @returns {object} Summary stats
   */
  getSummaryStats(playerId) {
    const patterns = this.patternAnalyzer.detectDecisionPatterns(playerId);
    const biases = this.patternAnalyzer.identifyBiases(playerId);
    const timeStats = this.patternAnalyzer.getDecisionTimeStats(playerId);
    const comparison = this.patternAnalyzer.compareToBaseline(playerId);
    const patternFreq = this.patternAnalyzer.getPatternFrequency(playerId);

    return {
      totalPatterns: patterns.length,
      totalBiases: biases.length,
      avgDecisionTime: timeStats.avg,
      decisionTimeRange: `${timeStats.min}ms - ${timeStats.max}ms`,
      overallScore: Math.round(comparison.overallScore * 100) / 100,
      topPatterns: this._getTopPatterns(patternFreq, 5),
      topBiases: biases.slice(0, 3).map(b => b.bias),
    };
  }

  /**
   * Get top N patterns by frequency
   * @param {object} patternFreq - Pattern frequency map
   * @param {number} n - Number of top patterns to return
   * @returns {Array} Top patterns
   */
  _getTopPatterns(patternFreq, n = 5) {
    const entries = Object.entries(patternFreq);
    entries.sort((a, b) => b[1] - a[1]);
    return entries.slice(0, n).map(([pattern, count]) => ({ pattern, count }));
  }
}