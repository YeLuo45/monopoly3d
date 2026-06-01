/**
 * L1_SemanticMemory - Processed semantic summaries of game situations
 * 
 * This layer encodes game situations as semantic tokens and extracts
 * patterns from raw events to create meaningful situation summaries.
 */

import { L0_RawEventCache } from './l0_rawEventCache.js';

export class L1_SemanticMemory {
  /**
   * @param {L0_RawEventCache} rawCache - Reference to L0 cache
   */
  constructor(rawCache) {
    this.rawCache = rawCache || new L0_RawEventCache();
    this.situationTokens = [];
    this.fingerprints = new Map(); // fingerprint -> situation data
  }

  /**
   * Encode game state as semantic token string
   * @param {object} gameState - Current game state
   * @returns {string} Semantic token
   */
  encodeSituation(gameState) {
    const components = [];
    
    // Player positions
    if (gameState.players) {
      const positions = gameState.players.map(p => p.position || 0).join(',');
      components.push(`P:${positions}`);
    }
    
    // Money situation
    if (gameState.players) {
      const money = gameState.players.map(p => p.money || 0).join(',');
      components.push(`M:${money}`);
    }
    
    // Properties owned
    if (gameState.properties) {
      const owned = gameState.properties
        .filter(p => p.owner !== null)
        .map(p => `${p.id}:${p.owner}`)
        .join(';');
      components.push(`O:${owned}`);
    }
    
    // Current turn
    if (gameState.currentPlayer !== undefined) {
      components.push(`T:${gameState.currentPlayer}`);
    }
    
    // Game phase
    if (gameState.phase) {
      components.push(`H:${gameState.phase}`);
    }
    
    const token = components.join('|');
    this.situationTokens.push({ token, timestamp: Date.now() });
    
    return token;
  }

  /**
   * Decode semantic token back to situation summary
   * @param {string} token - Semantic token
   * @returns {object} Situation summary
   */
  decodeSituation(token) {
    const summary = {
      players: [],
      properties: [],
      currentPlayer: null,
      phase: null,
    };
    
    const parts = token.split('|');
    
    for (const part of parts) {
      const [key, value] = part.split(':');
      
      switch (key) {
        case 'P':
          summary.players = value.split(',').map((pos, i) => ({
            index: i,
            position: parseInt(pos, 10),
          }));
          break;
        case 'M':
          summary.players = summary.players.map((p, i) => ({
            ...p,
            money: parseInt(value.split(',')[i], 10) || 0,
          }));
          break;
        case 'O':
          if (value) {
            summary.properties = value.split(';').map(p => {
              const [id, owner] = p.split(':');
              return { id, owner };
            });
          }
          break;
        case 'T':
          const parsed = parseInt(value, 10);
          summary.currentPlayer = isNaN(parsed) ? null : parsed;
          break;
        case 'H':
          summary.phase = value;
          break;
      }
    }
    
    return summary;
  }

  /**
   * Extract recurring event sequences
   * @param {Array} events - Events to analyze
   * @returns {Array} Detected patterns
   */
  extractPatterns(events) {
    if (!events || events.length < 3) return [];
    
    const patterns = [];
    const windowSize = 3;
    
    for (let i = 0; i < events.length - windowSize + 1; i++) {
      const sequence = events.slice(i, i + windowSize)
        .map(e => e.event || e.type)
        .join('->');
      
      const existing = patterns.find(p => p.sequence === sequence);
      if (existing) {
        existing.count++;
      } else {
        patterns.push({ sequence, count: 1 });
      }
    }
    
    return patterns
      .filter(p => p.count > 1)
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Generate unique hash of board state
   * @param {object} gameState - Game state
   * @returns {string} Fingerprint hash
   */
  getSituationFingerprint(gameState) {
    const components = [];
    
    // Board positions
    if (gameState.board) {
      components.push(`B:${gameState.board.length}`);
    }
    
    // Player assets
    if (gameState.players) {
      for (const player of gameState.players) {
        components.push(`P${player.id}:${player.money || 0}:${player.position || 0}`);
      }
    }
    
    // Properties state
    if (gameState.properties) {
      for (const prop of gameState.properties) {
        components.push(`T${prop.id}:${prop.owner || 'none'}:${prop.houses || 0}`);
      }
    }
    
    const str = components.sort().join('|');
    return this._hashString(str);
  }

  /**
   * Simple hash function for fingerprint
   * @param {string} str - String to hash
   * @returns {string} Hash
   */
  _hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Find similar past situations
   * @param {object} currentState - Current game state
   * @param {number} limit - Max results
   * @returns {Array} Similar past situations
   */
  findSimilarSituations(currentState, limit = 5) {
    const currentFingerprint = this.getSituationFingerprint(currentState);
    
    const results = [];
    for (const [fingerprint, data] of this.fingerprints) {
      if (fingerprint === currentFingerprint) continue;
      
      // Calculate similarity (simple Hamming-like comparison)
      const similarity = this._calculateSimilarity(currentFingerprint, fingerprint);
      results.push({ ...data, similarity });
    }
    
    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, limit);
  }

  /**
   * Calculate similarity between two fingerprints
   * @param {string} fp1 - First fingerprint
   * @param {string} fp2 - Second fingerprint
   * @returns {number} Similarity score 0-1
   */
  _calculateSimilarity(fp1, fp2) {
    if (fp1 === fp2) return 1;
    
    let matches = 0;
    const len = Math.min(fp1.length, fp2.length);
    for (let i = 0; i < len; i++) {
      if (fp1[i] === fp2[i]) matches++;
    }
    
    return matches / Math.max(fp1.length, fp2.length);
  }

  /**
   * Store situation with fingerprint for later lookup
   * @param {object} gameState - Game state
   * @param {object} outcome - Outcome of situation
   */
  storeSituation(gameState, outcome) {
    const fingerprint = this.getSituationFingerprint(gameState);
    const token = this.encodeSituation(gameState);
    
    this.fingerprints.set(fingerprint, {
      fingerprint,
      token,
      gameState,
      outcome,
      timestamp: Date.now(),
    });
    
    return fingerprint;
  }
}