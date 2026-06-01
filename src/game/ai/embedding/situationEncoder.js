/**
 * SituationEncoder - Converts game state into meaningful semantic tokens
 * 
 * Rule-based encoding without external ML - pure JavaScript implementation
 * that extracts semantic meaning from game states.
 */

export class SituationEncoder {
  constructor() {
    // Color groups in Monopoly3D for property density calculation
    this.colorGroups = [
      ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'], // Group 1
      ['#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'], // Group 2
    ];
    
    // Property color group mapping (simplified)
    this.propertyColors = new Map();
    
    // Turn phase thresholds (based on round number)
    this.turnPhaseThresholds = {
      early: 5,   // rounds 1-5
      mid: 15,    // rounds 6-15
      late: 100,  // rounds 16+
    };
  }

  /**
   * Core encoding - returns fingerprint, tokens, and summary
   * @param {object} gameState - Current game state
   * @returns {object} {fingerprint, tokens, summary}
   */
  encode(gameState) {
    const tokens = this.extractTokens(gameState);
    const fingerprint = this.toFingerprint(gameState);
    const summary = this.toSummary(gameState);
    
    return { fingerprint, tokens, summary };
  }

  /**
   * Extract semantic tokens from game state
   * Token types:
   * - board:property_density:N  (0-4 properties per color group)
   * - player:money_rank:1-4     (monetary ranking among players)
   * - player:property_count:N   (number of properties owned)
   * - player:jail_status:yes|no
   * - board:debt_level:low|med|high
   * - game:turn_phase:early|mid|late
   * 
   * @param {object} gameState - Game state
   * @returns {string[]} Array of semantic tokens
   */
  extractTokens(gameState) {
    const tokens = [];
    
    // --- Game-level tokens ---
    
    // Turn phase token
    const turnPhase = this.getTurnPhase(gameState);
    tokens.push(`game:turn_phase:${turnPhase}`);
    
    // Property density across all color groups
    const propertyDensity = this.calculatePropertyDensity(gameState);
    tokens.push(`board:property_density:${propertyDensity}`);
    
    // Global debt level
    const debtLevel = this.calculateDebtLevel(gameState);
    tokens.push(`board:debt_level:${debtLevel}`);
    
    // --- Player-level tokens ---
    if (gameState.players && gameState.players.length > 0) {
      // Calculate money rankings
      const moneyRanks = this.calculateMoneyRanks(gameState.players);
      
      for (const player of gameState.players) {
        const playerId = player.id || player.name || 'unknown';
        const rank = moneyRanks.get(playerId) || 3;
        tokens.push(`player:money_rank:${rank}`);
        
        // Property count
        const propCount = player.properties ? player.properties.length : 0;
        tokens.push(`player:property_count:${propCount}`);
        
        // Jail status
        const inJail = player.inJail === true || player.jailTurns > 0;
        tokens.push(`player:jail_status:${inJail ? 'yes' : 'no'}`);
      }
    }
    
    return tokens;
  }

  /**
   * Calculate property density (average properties per color group)
   * @param {object} gameState - Game state
   * @returns {number} Density 0-4
   */
  calculatePropertyDensity(gameState) {
    if (!gameState.properties || gameState.properties.length === 0) {
      return 0;
    }
    
    const colorGroupCounts = new Map();
    
    for (const prop of gameState.properties) {
      if (prop.owner !== null && prop.owner !== undefined) {
        const colorGroup = prop.colorGroup || 'neutral';
        const count = colorGroupCounts.get(colorGroup) || 0;
        colorGroupCounts.set(colorGroup, count + 1);
      }
    }
    
    if (colorGroupCounts.size === 0) return 0;
    
    let totalDensity = 0;
    for (const count of colorGroupCounts.values()) {
      totalDensity += Math.min(count, 4); // Cap at 4 per group
    }
    
    return Math.round(totalDensity / Math.max(colorGroupCounts.size, 1));
  }

  /**
   * Calculate global debt level
   * @param {object} gameState - Game state
   * @returns {string} 'low' | 'med' | 'high'
   */
  calculateDebtLevel(gameState) {
    if (!gameState.players || gameState.players.length === 0) {
      return 'low';
    }
    
    let totalDebt = 0;
    let totalAssets = 0;
    
    for (const player of gameState.players) {
      const money = player.money || 0;
      const properties = player.properties || [];
      
      if (money < 0) {
        totalDebt += Math.abs(money);
      }
      totalAssets += money + (properties.length * 100); // Approximate property value
    }
    
    if (totalAssets === 0) return 'low';
    
    const debtRatio = totalDebt / totalAssets;
    
    if (debtRatio < 0.1) return 'low';
    if (debtRatio < 0.3) return 'med';
    return 'high';
  }

  /**
   * Determine turn phase based on round number
   * @param {object} gameState - Game state
   * @returns {string} 'early' | 'mid' | 'late'
   */
  getTurnPhase(gameState) {
    const round = gameState.currentRound || 1;
    
    if (round <= this.turnPhaseThresholds.early) {
      return 'early';
    }
    if (round <= this.turnPhaseThresholds.mid) {
      return 'mid';
    }
    return 'late';
  }

  /**
   * Calculate money ranks for all players
   * @param {Array} players - Player array
   * @returns {Map} playerId -> rank (1-4)
   */
  calculateMoneyRanks(players) {
    const ranks = new Map();
    
    // Sort players by money (descending)
    const sorted = [...players].sort((a, b) => (b.money || 0) - (a.money || 0));
    
    for (let i = 0; i < sorted.length; i++) {
      const playerId = sorted[i].id || sorted[i].name || `player_${i}`;
      ranks.set(playerId, i + 1);
    }
    
    return ranks;
  }

  /**
   * Generate stable token string for a game state
   * @param {object} gameState - Game state
   * @returns {string} Stable token string
   */
  toToken(gameState) {
    const tokens = this.extractTokens(gameState);
    return tokens.sort().join(';');
  }

  /**
   * Generate hash fingerprint for exact match
   * @param {object} gameState - Game state
   * @returns {string} Hash fingerprint
   */
  toFingerprint(gameState) {
    const components = [];
    
    // Player assets
    if (gameState.players) {
      for (const player of gameState.players) {
        const id = player.id || player.name || 'unknown';
        const money = player.money || 0;
        const pos = player.position || 0;
        const propCount = player.properties ? player.properties.length : 0;
        const inJail = player.inJail ? 1 : 0;
        components.push(`${id}:${money}:${pos}:${propCount}:${inJail}`);
      }
    }
    
    // Properties ownership
    if (gameState.properties) {
      for (const prop of gameState.properties) {
        const owner = prop.owner !== null && prop.owner !== undefined ? prop.owner : 'none';
        components.push(`prop:${prop.id}:${owner}`);
      }
    }
    
    // Game state
    components.push(`round:${gameState.currentRound || 1}`);
    components.push(`phase:${gameState.phase || 'unknown'}`);
    
    const str = components.sort().join('|');
    return this.hashString(str);
  }

  /**
   * Generate human-readable summary
   * @param {object} gameState - Game state
   * @returns {string} Summary string
   */
  toSummary(gameState) {
    const parts = [];
    
    // Turn info
    const round = gameState.currentRound || 1;
    const phase = this.getTurnPhase(gameState);
    parts.push(`第${round}回合(${phase}期)`);
    
    // Player summary
    if (gameState.players && gameState.players.length > 0) {
      const summaries = gameState.players.map(p => {
        const name = p.name || p.id || '玩家';
        const money = p.money || 0;
        const props = p.properties ? p.properties.length : 0;
        const jail = p.inJail ? ' (在狱中)' : '';
        return `${name}: $${money}, ${props}房产${jail}`;
      });
      parts.push(summaries.join('; '));
    }
    
    // Debt level
    const debtLevel = this.calculateDebtLevel(gameState);
    if (debtLevel !== 'low') {
      parts.push(`全局债务等级: ${debtLevel}`);
    }
    
    return parts.join(' | ');
  }

  /**
   * Compare two game states and return similarity score
   * @param {object} stateA - First game state
   * @param {object} stateB - Second game state
   * @returns {number} Similarity score 0-1
   */
  compare(stateA, stateB) {
    const tokensA = this.extractTokens(stateA);
    const tokensB = this.extractTokens(stateB);
    
    if (tokensA.length === 0 && tokensB.length === 0) return 1;
    if (tokensA.length === 0 || tokensB.length === 0) return 0;
    
    // Count matching tokens
    let matches = 0;
    for (const token of tokensA) {
      if (tokensB.includes(token)) {
        matches++;
      }
    }
    
    // Also check in reverse
    for (const token of tokensB) {
      if (tokensA.includes(token) && !tokensA.includes(token)) {
        matches++;
      }
    }
    
    const maxLen = Math.max(tokensA.length, tokensB.length);
    return matches / maxLen;
  }

  /**
   * Simple string hash function
   * @param {string} str - String to hash
   * @returns {string} Hash string
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
}