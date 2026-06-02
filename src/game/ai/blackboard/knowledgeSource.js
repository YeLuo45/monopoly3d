/**
 * KnowledgeSource - Agent Knowledge Contributions
 * 
 * Represents an agent's contribution to the blackboard with confidence tracking.
 * Allows agents to contribute, revise, and query their knowledge.
 */

class KnowledgeSource {
  /**
   * @param {BlackboardStore} blackboardStore - The shared blackboard store
   * @param {string} agentId - Unique identifier for this agent
   */
  constructor(blackboardStore, agentId) {
    if (!blackboardStore) {
      throw new Error('KnowledgeSource requires a BlackboardStore');
    }
    if (!agentId) {
      throw new Error('KnowledgeSource requires an agentId');
    }
    
    this.blackboard = blackboardStore;
    this.agentId = agentId;
    
    // Track knowledge contributed by this source
    this.knowledgeMap = new Map(); // key -> { knowledge, confidence, timestamp }
    
    // Confidence thresholds
    this.defaultConfidence = 0.5;
    this.maxConfidence = 1.0;
    this.minConfidence = 0.0;
  }

  /**
   * Contribute new knowledge to the blackboard
   * @param {string} key - Knowledge key
   * @param {*} knowledge - The knowledge to contribute
   * @param {number} confidence - Confidence level (0-1)
   * @returns {Object} Contribution result
   */
  contribute(key, knowledge, confidence = this.defaultConfidence) {
    // Validate confidence
    const normalizedConfidence = this._normalizeConfidence(confidence);
    
    // Store in local knowledge map
    this.knowledgeMap.set(key, {
      knowledge,
      confidence: normalizedConfidence,
      timestamp: Date.now(),
      contributedBy: this.agentId
    });
    
    // Write to blackboard with confidence metadata
    const entry = this.blackboard.write(
      key,
      {
        value: knowledge,
        confidence: normalizedConfidence,
        source: this.agentId
      },
      this.agentId
    );
    
    return {
      success: true,
      key,
      confidence: normalizedConfidence,
      entry
    };
  }

  /**
   * Revise existing knowledge
   * @param {string} key - Knowledge key to revise
   * @param {*} newKnowledge - New knowledge value
   * @param {number} newConfidence - New confidence level (optional)
   * @returns {Object} Revision result
   */
  revise(key, newKnowledge, newConfidence = null) {
    const existing = this.knowledgeMap.get(key);
    
    if (!existing) {
      // If doesn't exist, contribute as new
      const result = this.contribute(key, newKnowledge, newConfidence ?? this.defaultConfidence);
      // Add newKnowledge to result for test compatibility
      return { ...result, newKnowledge };
    }
    
    // Determine new confidence
    const updatedConfidence = newConfidence !== null
      ? this._normalizeConfidence(newConfidence)
      : existing.confidence;
    
    // Update local knowledge map
    this.knowledgeMap.set(key, {
      knowledge: newKnowledge,
      confidence: updatedConfidence,
      timestamp: Date.now(),
      contributedBy: this.agentId,
      revised: true,
      previousConfidence: existing.confidence
    });
    
    // Update blackboard
    const entry = this.blackboard.update(
      key,
      {
        value: newKnowledge,
        confidence: updatedConfidence,
        source: this.agentId,
        revised: true
      },
      this.agentId
    );
    
    return {
      success: true,
      key,
      previousKnowledge: existing.knowledge,
      newKnowledge,
      previousConfidence: existing.confidence,
      newConfidence: updatedConfidence,
      entry
    };
  }

  /**
   * Get confidence level for a key
   * @param {string} key - Knowledge key
   * @returns {number} Confidence level (0-1), -1 if not found
   */
  getConfidence(key) {
    const local = this.knowledgeMap.get(key);
    if (local) {
      return local.confidence;
    }
    
    // Check blackboard
    const blackboardValue = this.blackboard.read(key);
    if (blackboardValue && typeof blackboardValue === 'object' && 'confidence' in blackboardValue) {
      return blackboardValue.confidence;
    }
    
    return -1; // Not found
  }

  /**
   * Get the source agent ID for a key
   * @param {string} key - Knowledge key
   * @returns {string|null} Source agent ID or null if not found
   */
  getSource(key) {
    const local = this.knowledgeMap.get(key);
    if (local) {
      return local.contributedBy;
    }
    
    // Check blackboard
    const blackboardValue = this.blackboard.read(key);
    if (blackboardValue && typeof blackboardValue === 'object') {
      return blackboardValue.source || null;
    }
    
    return null;
  }

  /**
   * Get knowledge contributed by this source
   * @param {string} key - Knowledge key
   * @returns {*} Knowledge value or undefined
   */
  getKnowledge(key) {
    const local = this.knowledgeMap.get(key);
    if (local) {
      return local.knowledge;
    }
    
    const blackboardValue = this.blackboard.read(key);
    if (blackboardValue && typeof blackboardValue === 'object' && 'value' in blackboardValue) {
      return blackboardValue.value;
    }
    
    // If value is not wrapped, return as-is
    return blackboardValue;
  }

  /**
   * Get all keys this source has contributed to
   * @returns {string[]} Array of keys
   */
  getContributedKeys() {
    return [...this.knowledgeMap.keys()];
  }

  /**
   * Get confidence for all contributed knowledge
   * @returns {Object[]} Array of { key, confidence }
   */
  getAllConfidenceLevels() {
    const result = [];
    for (const [key, data] of this.knowledgeMap) {
      result.push({
        key,
        confidence: data.confidence
      });
    }
    return result;
  }

  /**
   * Query knowledge with minimum confidence threshold
   * @param {string} key - Knowledge key
   * @param {number} minConfidence - Minimum confidence required
   * @returns {Object|null} Knowledge if meets threshold
   */
  queryWithConfidence(key, minConfidence) {
    const confidence = this.getConfidence(key);
    
    if (confidence >= minConfidence) {
      return {
        knowledge: this.getKnowledge(key),
        confidence
      };
    }
    
    return null;
  }

  /**
   * Batch contribute multiple knowledge entries
   * @param {Object[]} entries - Array of { key, knowledge, confidence }
   * @returns {Object[]} Results for each contribution
   */
  batchContribute(entries) {
    return entries.map(entry => {
      const { key, knowledge, confidence } = entry;
      return this.contribute(key, knowledge, confidence);
    });
  }

  /**
   * Get knowledge metadata for a key
   * @param {string} key - Knowledge key
   * @returns {Object|null} Metadata including timestamp, confidence, etc.
   */
  getKnowledgeMetadata(key) {
    const local = this.knowledgeMap.get(key);
    if (!local) {
      // Try to get from blackboard metadata
      const metadata = this.blackboard.getMetadata(key);
      if (metadata) {
        const blackboardValue = this.blackboard.read(key);
        return {
          ...metadata,
          confidence: blackboardValue?.confidence ?? -1
        };
      }
      return null;
    }
    
    return {
      key,
      timestamp: local.timestamp,
      confidence: local.confidence,
      contributedBy: local.contributedBy,
      revised: local.revised || false
    };
  }

  // Private helper methods

  /**
   * Normalize confidence to 0-1 range
   * @param {number} confidence - Raw confidence value
   * @returns {number} Normalized confidence
   */
  _normalizeConfidence(confidence) {
    if (confidence === null || confidence === undefined) {
      return this.defaultConfidence;
    }
    return Math.max(this.minConfidence, Math.min(this.maxConfidence, confidence));
  }
}

export { KnowledgeSource };