/**
 * GameEmbedding - Game-specific embedding space for semantic similarity
 * 
 * Encodes game states and situations into feature vectors for
 * similarity search and clustering. Pure JS implementation.
 */

import { EmbeddingIndex } from './embeddingIndex.js';
import { SituationEncoder } from './situationEncoder.js';

export class GameEmbedding {
  constructor() {
    this.dimension = 128;
    this.index = new EmbeddingIndex(this.dimension);
    this.encoder = new SituationEncoder();
    
    // Memory layer reference for findSimilar
    this.memoryLayer = null;
    
    // Token weights for vector construction
    this.tokenWeights = {
      'game:turn_phase:early': 0.5,
      'game:turn_phase:mid': 0.7,
      'game:turn_phase:late': 1.0,
      'board:property_density': 0.8,
      'board:debt_level:low': 0.3,
      'board:debt_level:med': 0.6,
      'board:debt_level:high': 1.0,
      'player:money_rank': 0.9,
      'player:property_count': 0.7,
      'player:jail_status:yes': 0.8,
      'player:jail_status:no': 0.2,
    };
  }

  /**
   * Encode game state into a feature vector
   * @param {object} gameState - Current game state
   * @returns {object} {vector: number[], tokens: string[]}
   */
  encodeState(gameState) {
    const tokens = this.encoder.extractTokens(gameState);
    const vector = this.tokensToVector(tokens);
    
    return { vector, tokens };
  }

  /**
   * Encode a decision situation with available actions
   * @param {string} playerId - Current player ID
   * @param {object} gameState - Current game state
   * @param {Array} availableActions - Available action choices
   * @returns {number[]} Feature vector
   */
  encodeSituation(playerId, gameState, availableActions) {
    const baseEncoding = this.encodeState(gameState);
    let vector = baseEncoding.vector;
    
    // Augment with action context
    if (availableActions && availableActions.length > 0) {
      const actionVector = this.actionsToVector(availableActions);
      vector = this.combineVectors(vector, actionVector, 0.7, 0.3);
    }
    
    // Augment with player context
    const playerVector = this.getPlayerContext(playerId, gameState);
    vector = this.combineVectors(vector, playerVector, 0.8, 0.2);
    
    return vector;
  }

  /**
   * Convert tokens to feature vector
   * @param {string[]} tokens - Semantic tokens
   * @returns {number[]} Feature vector
   */
  tokensToVector(tokens) {
    // Initialize vector with zeros
    const vector = new Array(this.dimension).fill(0);
    
    // Use multiple hash locations per token for better distribution
    for (let tokenIdx = 0; tokenIdx < tokens.length; tokenIdx++) {
      const token = tokens[tokenIdx];
      const weight = this.getTokenWeight(token);
      
      // Hash token to multiple dimensions
      const hash1 = this.hashToken(token, 0);
      const hash2 = this.hashToken(token, 1);
      const hash3 = this.hashToken(token, 2);
      
      // Spread influence across 3 dimensions
      const dim1 = hash1 % this.dimension;
      const dim2 = (hash1 + hash2) % this.dimension;
      const dim3 = (hash1 + hash2 + hash3) % this.dimension;
      
      // Add weighted contribution
      vector[dim1] += weight * 0.5;
      vector[dim2] += weight * 0.3;
      vector[dim3] += weight * 0.2;
    }
    
    // Normalize vector
    return this.normalizeVector(vector);
  }

  /**
   * Get weight for a token
   * @param {string} token - Token string
   * @returns {number} Weight 0-1
   */
  getTokenWeight(token) {
    // Check for exact match
    if (this.tokenWeights[token]) {
      return this.tokenWeights[token];
    }
    
    // Check for prefix match
    const parts = token.split(':');
    if (parts.length >= 2) {
      const prefix = parts.slice(0, 2).join(':');
      if (this.tokenWeights[prefix]) {
        return this.tokenWeights[prefix] * 0.8;
      }
    }
    
    // Default weight based on token type
    if (token.startsWith('game:')) return 0.6;
    if (token.startsWith('board:')) return 0.7;
    if (token.startsWith('player:')) return 0.5;
    
    return 0.4;
  }

  /**
   * Hash token to dimension index
   * @param {string} token - Token
   * @param {number} seed - Seed for multiple hashes
   * @returns {number} Hash value
   */
  hashToken(token, seed = 0) {
    let hash = seed * 31;
    for (let i = 0; i < token.length; i++) {
      hash = ((hash << 5) - hash) + token.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  /**
   * Normalize vector to unit length
   * @param {number[]} vector - Input vector
   * @returns {number[]} Normalized vector
   */
  normalizeVector(vector) {
    let magnitude = 0;
    for (const val of vector) {
      magnitude += val * val;
    }
    magnitude = Math.sqrt(magnitude);
    
    if (magnitude === 0) {
      return new Array(this.dimension).fill(0);
    }
    
    return vector.map(v => v / magnitude);
  }

  /**
   * Convert actions to vector
   * @param {Array} actions - Available actions
   * @returns {number[]} Action vector
   */
  actionsToVector(actions) {
    const vector = new Array(this.dimension).fill(0);
    
    if (!actions || actions.length === 0) {
      return vector;
    }
    
    // Simple hash-based encoding of action types
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      const type = action.type || action.action || 'unknown';
      const hash = this.hashToken(type, i);
      const dim = hash % this.dimension;
      vector[dim] += 0.3; // Weight by frequency of action type
    }
    
    return this.normalizeVector(vector);
  }

  /**
   * Get player context vector
   * @param {string} playerId - Player ID
   * @param {object} gameState - Game state
   * @returns {number[]} Player context vector
   */
  getPlayerContext(playerId, gameState) {
    const vector = new Array(this.dimension).fill(0);
    
    if (!playerId || !gameState.players) {
      return vector;
    }
    
    const player = gameState.players.find(p => 
      p.id === playerId || p.name === playerId
    );
    
    if (!player) {
      return vector;
    }
    
    // Encode player state
    const moneyHash = this.hashToken(`money:${player.money}`, 0);
    const posHash = this.hashToken(`pos:${player.position}`, 0);
    
    vector[moneyHash % this.dimension] = 0.5;
    vector[posHash % this.dimension] = 0.5;
    
    return this.normalizeVector(vector);
  }

  /**
   * Combine two vectors with weights
   * @param {number[]} a - First vector
   * @param {number[]} b - Second vector
   * @param {number} weightA - Weight for first vector
   * @param {number} weightB - Weight for second vector
   * @returns {number[]} Combined vector
   */
  combineVectors(a, b, weightA, weightB) {
    const result = new Array(this.dimension).fill(0);
    
    for (let i = 0; i < this.dimension; i++) {
      result[i] = (a[i] || 0) * weightA + (b[i] || 0) * weightB;
    }
    
    return this.normalizeVector(result);
  }

  /**
   * Calculate cosine similarity between two vectors
   * @param {number[]} a - First vector
   * @param {number[]} b - Second vector
   * @returns {number} Similarity (-1 to 1)
   */
  cosineSimilarity(a, b) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) return 0;
    
    return dotProduct / denominator;
  }

  /**
   * Calculate Euclidean distance between two vectors
   * @param {number[]} a - First vector
   * @param {number[]} b - Second vector
   * @returns {number} Distance
   */
  euclideanDistance(a, b) {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  /**
   * Find similar past situations from memory layer
   * @param {number[]} currentVector - Current situation vector
   * @param {object} memoryLayer - L1/L2 memory layer with stored situations
   * @param {number} limit - Max results (default 5)
   * @returns {Array} Array of {situation, similarity}
   */
  findSimilar(currentVector, memoryLayer, limit = 5) {
    if (!memoryLayer) {
      return [];
    }
    
    // Build index from memory layer if not already done
    if (!this.memoryLayer || this.memoryLayer !== memoryLayer) {
      this.memoryLayer = memoryLayer;
      this.buildIndexFromMemory(memoryLayer);
    }
    
    // Search the index
    const results = this.index.search(currentVector, limit);
    
    return results.map(r => ({
      id: r.id,
      distance: r.distance,
      similarity: 1 - Math.min(r.distance, 2) / 2, // Normalize distance to similarity
    }));
  }

  /**
   * Build search index from memory layer
   * @param {object} memoryLayer - Memory layer with stored situations
   */
  buildIndexFromMemory(memoryLayer) {
    this.index.clear();
    
    if (!memoryLayer.fingerprints) {
      return;
    }
    
    for (const [fingerprint, data] of memoryLayer.fingerprints) {
      // Reconstruct vector from stored tokens/state
      const state = data.gameState || {};
      const { vector } = this.encodeState(state);
      
      this.index.add(fingerprint, vector);
    }
  }

  /**
   * Semantic clustering using k-means
   * @param {number[][]} vectors - Array of vectors
   * @param {number} k - Number of clusters (default 5)
   * @returns {object} {centroids, assignments, distances}
   */
  clusterSituations(vectors, k = 5) {
    if (!vectors || vectors.length === 0) {
      return { centroids: [], assignments: [], distances: [] };
    }
    
    if (vectors.length <= k) {
      // Not enough vectors for clustering
      return {
        centroids: vectors.map(v => [...v]),
        assignments: vectors.map((_, i) => i),
        distances: vectors.map(() => 0),
      };
    }
    
    // Initialize centroids by picking evenly spaced vectors
    const centroids = this.initializeCentroids(vectors, k);
    
    let assignments = new Array(vectors.length);
    let distances = new Array(vectors.length);
    let changed = true;
    let iterations = 0;
    const maxIterations = 20;
    
    while (changed && iterations < maxIterations) {
      changed = false;
      iterations++;
      
      // Assign vectors to nearest centroids
      const newAssignments = new Array(vectors.length);
      const newDistances = new Array(vectors.length);
      
      for (let i = 0; i < vectors.length; i++) {
        let minDist = Infinity;
        let bestCluster = 0;
        
        for (let c = 0; c < k; c++) {
          const dist = this.euclideanDistance(vectors[i], centroids[c]);
          if (dist < minDist) {
            minDist = dist;
            bestCluster = c;
          }
        }
        
        newAssignments[i] = bestCluster;
        newDistances[i] = minDist;
        
        if (assignments[i] !== bestCluster) {
          changed = true;
        }
      }
      
      assignments = newAssignments;
      distances = newDistances;
      
      // Update centroids
      this.updateCentroids(vectors, assignments, centroids, k);
    }
    
    return { centroids, assignments, distances };
  }

  /**
   * Initialize centroids using k-means++ style
   * @param {number[][]} vectors - Input vectors
   * @param {number} k - Number of centroids
   * @returns {number[][]} Initial centroids
   */
  initializeCentroids(vectors, k) {
    const centroids = [];
    
    // Pick first centroid randomly
    const firstIdx = Math.floor(Math.random() * vectors.length);
    centroids.push([...vectors[firstIdx]]);
    
    // Pick remaining centroids with probability proportional to distance
    for (let i = 1; i < k; i++) {
      const distances = [];
      let totalDist = 0;
      
      for (const vector of vectors) {
        let minDist = Infinity;
        for (const centroid of centroids) {
          const dist = this.euclideanDistance(vector, centroid);
          minDist = Math.min(minDist, dist);
        }
        distances.push(minDist);
        totalDist += minDist * minDist;
      }
      
      // Pick next centroid with weighted probability
      let target = Math.random() * totalDist;
      let cumulative = 0;
      let selectedIdx = 0;
      
      for (let j = 0; j < distances.length; j++) {
        cumulative += distances[j] * distances[j];
        if (cumulative >= target) {
          selectedIdx = j;
          break;
        }
      }
      
      centroids.push([...vectors[selectedIdx]]);
    }
    
    return centroids;
  }

  /**
   * Update centroids based on assignments
   * @param {number[][]} vectors - Input vectors
   * @param {number[]} assignments - Cluster assignments
   * @param {number[][]} centroids - Current centroids
   * @param {number} k - Number of clusters
   */
  updateCentroids(vectors, assignments, centroids, k) {
    // Reset centroids
    for (let c = 0; c < k; c++) {
      centroids[c] = new Array(this.dimension).fill(0);
    }
    
    // Count per cluster
    const counts = new Array(k).fill(0);
    
    // Sum vectors per cluster
    for (let i = 0; i < vectors.length; i++) {
      const cluster = assignments[i];
      counts[cluster]++;
      
      for (let d = 0; d < this.dimension; d++) {
        centroids[cluster][d] += vectors[i][d];
      }
    }
    
    // Average
    for (let c = 0; c < k; c++) {
      if (counts[c] > 0) {
        for (let d = 0; d < this.dimension; d++) {
          centroids[c][d] /= counts[c];
        }
      }
    }
  }
}