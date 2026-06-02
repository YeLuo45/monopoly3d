/**
 * Knowledge Graph
 * 
 * Tracks concepts and their relationships to provide
 * structured learning paths and identify weak areas.
 */

export class KnowledgeGraph {
  constructor() {
    // Concept nodes: { conceptId -> ConceptDetails }
    this.concepts = new Map();
    
    // Prerequisites edges: { conceptId -> [requiredConceptIds] }
    this.prerequisites = new Map();
    
    // Reverse dependencies (what depends on this concept)
    this.dependents = new Map();
    
    // Player mastery tracking: { playerId -> { conceptId -> masteryLevel } }
    this.playerMastery = new Map();
  }

  /**
   * Concept details structure
   */
  static ConceptTypes = {
    PROPERTY: 'property',
    TRADING: 'trading',
    INVESTMENT: 'investment',
    AUCTION: 'auction',
    FINANCIAL: 'financial',
    STRATEGY: 'strategy',
    TACTICS: 'tactics'
  };

  /**
   * Add a knowledge concept node
   * @param {string} conceptId - Unique concept identifier
   * @param {object} details - Concept details { name, type, description, difficulty, keywords }
   */
  addConcept(conceptId, details = {}) {
    const concept = {
      id: conceptId,
      name: details.name || conceptId,
      type: details.type || KnowledgeGraph.ConceptTypes.STRATEGY,
      description: details.description || '',
      difficulty: details.difficulty || 1,
      keywords: details.keywords || [],
      createdAt: Date.now(),
      relatedConcepts: details.relatedConcepts || []
    };
    
    this.concepts.set(conceptId, concept);
    
    // Initialize prerequisites set
    if (!this.prerequisites.has(conceptId)) {
      this.prerequisites.set(conceptId, []);
    }
    
    // Initialize dependents set
    if (!this.dependents.has(conceptId)) {
      this.dependents.set(conceptId, []);
    }
    
    return concept;
  }

  /**
   * Get concept details
   */
  getConcept(conceptId) {
    return this.concepts.get(conceptId) || null;
  }

  /**
   * Get all concepts
   */
  getAllConcepts() {
    return Array.from(this.concepts.values());
  }

  /**
   * Add a prerequisite relationship
   * @param {string} conceptId - The concept that requires the prerequisite
   * @param {string} requiresId - The prerequisite concept
   */
  addPrerequisite(conceptId, requiresId) {
    // Verify both concepts exist
    if (!this.concepts.has(conceptId)) {
      throw new Error(`Concept ${conceptId} does not exist`);
    }
    if (!this.concepts.has(requiresId)) {
      throw new Error(`Prerequisite ${requiresId} does not exist`);
    }
    
    // Add to prerequisites
    const prereqs = this.prerequisites.get(conceptId);
    if (!prereqs.includes(requiresId)) {
      prereqs.push(requiresId);
    }
    
    // Add reverse dependency
    const deps = this.dependents.get(requiresId);
    if (!deps.includes(conceptId)) {
      deps.push(conceptId);
    }
    
    return this.prerequisites.get(conceptId);
  }

  /**
   * Get prerequisites for a concept
   */
  getPrerequisites(conceptId) {
    const prereqs = this.prerequisites.get(conceptId) || [];
    return prereqs.map(id => this.getConcept(id)).filter(Boolean);
  }

  /**
   * Get concepts that depend on this one
   */
  getDependents(conceptId) {
    const deps = this.dependents.get(conceptId) || [];
    return deps.map(id => this.getConcept(id)).filter(Boolean);
  }

  /**
   * Get complete learning path to master a concept
   * Returns concepts in order they should be learned
   */
  getLearningPath(targetConceptId) {
    if (!this.concepts.has(targetConceptId)) {
      return null;
    }
    
    const path = [];
    const visited = new Set();
    
    // DFS to build learning path
    const buildPath = (conceptId) => {
      if (visited.has(conceptId)) return;
      visited.add(conceptId);
      
      // First add all prerequisites
      const prereqs = this.prerequisites.get(conceptId) || [];
      for (const prereq of prereqs) {
        buildPath(prereq);
      }
      
      // Then add this concept
      path.push(this.getConcept(conceptId));
    };
    
    buildPath(targetConceptId);
    
    return path;
  }

  /**
   * Set player mastery level for a concept
   */
  setMasteryLevel(playerId, conceptId, level) {
    if (!this.playerMastery.has(playerId)) {
      this.playerMastery.set(playerId, new Map());
    }
    
    const playerData = this.playerMastery.get(playerId);
    playerData.set(conceptId, {
      level: Math.max(0, Math.min(100, level)),
      updatedAt: Date.now()
    });
    
    return playerData.get(conceptId);
  }

  /**
   * Get player mastery for a concept
   */
  getMasteryLevel(playerId, conceptId) {
    const playerData = this.playerMastery.get(playerId);
    if (!playerData) return 0;
    
    const mastery = playerData.get(conceptId);
    return mastery ? mastery.level : 0;
  }

  /**
   * Identify weak areas for a player
   */
  getWeakAreas(playerId) {
    const weakAreas = [];
    const playerData = this.playerMastery.get(playerId);
    
    if (!playerData) {
      // No data - return concepts with low difficulty as weak areas
      for (const concept of this.concepts.values()) {
        if (concept.difficulty <= 2) {
          weakAreas.push({
            concept: concept,
            masteryLevel: 0,
            reason: 'beginner_concept'
          });
        }
      }
      return weakAreas;
    }
    
    // Find concepts with low mastery
    for (const [conceptId, mastery] of playerData.entries()) {
      if (mastery.level < 50) {
        const concept = this.getConcept(conceptId);
        weakAreas.push({
          concept: concept,
          masteryLevel: mastery.level,
          reason: mastery.level < 25 ? 'not_started' : 'needs_review'
        });
      }
    }
    
    // Sort by difficulty (lowest first)
    weakAreas.sort((a, b) => a.concept.difficulty - b.concept.difficulty);
    
    return weakAreas;
  }

  /**
   * Get concepts ready for learning (prerequisites met)
   */
  getReadyConcepts(playerId) {
    const readyConcepts = [];
    const playerData = this.playerMastery.get(playerId);
    
    for (const concept of this.concepts.values()) {
      // Check if already mastered
      if (playerData) {
        const mastery = playerData.get(concept.id);
        if (mastery && mastery.level >= 80) continue;
      }
      
      // Check if prerequisites are met
      const prereqs = this.prerequisites.get(concept.id) || [];
      let allPrereqsMet = true;
      
      for (const prereq of prereqs) {
        const prereqMastery = playerData ? playerData.get(prereq)?.level || 0 : 0;
        if (prereqMastery < 70) {
          allPrereqsMet = false;
          break;
        }
      }
      
      if (allPrereqsMet) {
        readyConcepts.push(concept);
      }
    }
    
    return readyConcepts;
  }

  /**
   * Get learning recommendations based on current state
   */
  getRecommendations(playerId) {
    const weakAreas = this.getWeakAreas(playerId);
    const readyConcepts = this.getReadyConcepts(playerId);
    
    // Prioritize weak areas that are also ready
    const priorityConcepts = readyConcepts.filter(rc => 
      weakAreas.some(wa => wa.concept.id === rc.id)
    );
    
    return {
      priorityLessons: priorityConcepts.slice(0, 3),
      recommendedPractice: weakAreas.slice(0, 5),
      nextChallenge: readyConcepts[0] || null,
      totalConcepts: this.concepts.size,
      masteredCount: this.getMasteredCount(playerId)
    };
  }

  /**
   * Get count of mastered concepts for a player
   */
  getMasteredCount(playerId) {
    const playerData = this.playerMastery.get(playerId);
    if (!playerData) return 0;
    
    let count = 0;
    for (const [, mastery] of playerData.entries()) {
      if (mastery.level >= 80) count++;
    }
    return count;
  }

  /**
   * Clear player data
   */
  clearPlayerData(playerId) {
    this.playerMastery.delete(playerId);
  }

  /**
   * Get graph statistics
   */
  getStats() {
    return {
      totalConcepts: this.concepts.size,
      totalPrerequisites: Array.from(this.prerequisites.values()).reduce((sum, arr) => sum + arr.length, 0),
      conceptTypes: this.getConceptTypeCounts()
    };
  }

  /**
   * Get counts by concept type
   */
  getConceptTypeCounts() {
    const counts = {};
    for (const concept of this.concepts.values()) {
      counts[concept.type] = (counts[concept.type] || 0) + 1;
    }
    return counts;
  }
}