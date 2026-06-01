/**
 * EmbeddingIndex - FAISS-like approximate nearest neighbor index
 * 
 * Pure JS in-memory index for embedding vectors. Supports:
 * - Add/remove vectors
 * - Search (top-k nearest neighbors)
 * - Save/load index as JSON
 * - Batch operations
 */

export class EmbeddingIndex {
  /**
   * Create an embedding index
   * @param {number} dimension - Vector dimension (default 128)
   */
  constructor(dimension = 128) {
    this.dimension = dimension;
    this.vectors = new Map(); // id -> vector
    this.idToString = new Map(); // id -> string for comparison
  }

  /**
   * Add a vector to the index
   * @param {string|number} id - Unique identifier
   * @param {number[]} vector - Feature vector
   * @returns {boolean} Success
   */
  add(id, vector) {
    if (!Array.isArray(vector) || vector.length !== this.dimension) {
      return false;
    }
    
    // Check for NaN or Infinity
    for (const val of vector) {
      if (!Number.isFinite(val)) {
        return false;
      }
    }
    
    const idStr = String(id);
    this.vectors.set(idStr, [...vector]);
    this.idToString.set(idStr, idStr);
    
    return true;
  }

  /**
   * Remove a vector from the index
   * @param {string|number} id - Vector ID to remove
   * @returns {boolean} Success
   */
  remove(id) {
    const idStr = String(id);
    return this.vectors.delete(idStr);
  }

  /**
   * Search for k nearest neighbors
   * @param {number[]} queryVector - Query vector
   * @param {number} k - Number of results (default 5)
   * @returns {Array} Array of {id, distance} sorted by distance
   */
  search(queryVector, k = 5) {
    if (!Array.isArray(queryVector) || queryVector.length !== this.dimension) {
      return [];
    }
    
    if (this.vectors.size === 0) {
      return [];
    }
    
    const results = [];
    
    for (const [id, vector] of this.vectors) {
      const distance = this.euclideanDistance(queryVector, vector);
      results.push({ id, distance });
    }
    
    // Sort by distance (ascending)
    results.sort((a, b) => a.distance - b.distance);
    
    return results.slice(0, k);
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
   * Add multiple vectors in batch
   * @param {Array} ids - Array of IDs
   * @param {Array} vectors - Array of vectors
   * @returns {number} Number successfully added
   */
  addBatch(ids, vectors) {
    if (!Array.isArray(ids) || !Array.isArray(vectors)) {
      return 0;
    }
    
    if (ids.length !== vectors.length) {
      return 0;
    }
    
    let successCount = 0;
    for (let i = 0; i < ids.length; i++) {
      if (this.add(ids[i], vectors[i])) {
        successCount++;
      }
    }
    
    return successCount;
  }

  /**
   * Clear all vectors from the index
   */
  clear() {
    this.vectors.clear();
    this.idToString.clear();
  }

  /**
   * Get number of vectors in index
   * @returns {number} Size
   */
  getSize() {
    return this.vectors.size;
  }

  /**
   * Save index to JSON string
   * @returns {string} JSON representation
   */
  saveIndex() {
    const data = {
      dimension: this.dimension,
      vectors: Array.from(this.vectors.entries()),
    };
    return JSON.stringify(data);
  }

  /**
   * Load index from JSON string
   * @param {string} jsonStr - JSON string from saveIndex
   * @returns {boolean} Success
   */
  loadIndex(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      
      if (!data.dimension || !Array.isArray(data.vectors)) {
        return false;
      }
      
      this.dimension = data.dimension;
      this.vectors = new Map(data.vectors);
      this.idToString = new Map();
      
      for (const [id] of data.vectors) {
        this.idToString.set(id, id);
      }
      
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Get vector by ID
   * @param {string|number} id - Vector ID
   * @returns {number[]|null} Vector or null
   */
  getVector(id) {
    const idStr = String(id);
    const vector = this.vectors.get(idStr);
    return vector ? [...vector] : null;
  }

  /**
   * Check if ID exists in index
   * @param {string|number} id - Vector ID
   * @returns {boolean} Exists
   */
  has(id) {
    return this.vectors.has(String(id));
  }

  /**
   * Get all IDs in index
   * @returns {Array} Array of IDs
   */
  getAllIds() {
    return Array.from(this.vectors.keys());
  }
}