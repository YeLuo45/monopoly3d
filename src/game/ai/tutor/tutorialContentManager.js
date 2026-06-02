/**
 * Tutorial Content Manager
 * 
 * Manages tutorial content and matches it to player needs
 * based on the knowledge graph and learning profiles.
 */

import { AdaptiveLearningEngine } from './adaptiveLearningEngine.js';
import { KnowledgeGraph } from './knowledgeGraph.js';

export class TutorialContentManager {
  constructor(knowledgeGraph) {
    this.knowledgeGraph = knowledgeGraph;
    
    // Content storage: { contentId -> ContentDetails }
    this.content = new Map();
    
    // Content to concept mapping
    this.contentConcepts = new Map();
    
    // Initialize with default content types
    this.contentTypes = {
      LESSON: 'lesson',
      QUIZ: 'quiz',
      EXAMPLE: 'example',
      PRACTICE: 'practice',
      VIDEO: 'video',
      INTERACTIVE: 'interactive'
    };
  }

  /**
   * Content details structure
   */
  static ContentFormats = {
    TEXT: 'text',
    VIDEO: 'video',
    INTERACTIVE: 'interactive',
    QUIZ: 'quiz'
  };

  /**
   * Add tutorial content
   * @param {string} contentId - Unique content identifier
   * @param {object} details - Content details { title, type, format, body, conceptId, difficulty, duration, objectives }
   */
  addContent(contentId, details = {}) {
    const content = {
      id: contentId,
      title: details.title || contentId,
      type: details.type || this.contentTypes.LESSON,
      format: details.format || TutorialContentManager.ContentFormats.TEXT,
      body: details.body || '',
      conceptId: details.conceptId || null,
      difficulty: details.difficulty || 1,
      duration: details.duration || 10, // minutes
      objectives: details.objectives || [],
      prerequisites: details.prerequisites || [],
      tags: details.tags || [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    this.content.set(contentId, content);
    
    // Map content to concept if conceptId provided
    if (content.conceptId) {
      this.contentConcepts.set(contentId, content.conceptId);
    }
    
    return content;
  }

  /**
   * Get content by ID
   */
  getContent(contentId) {
    return this.content.get(contentId) || null;
  }

  /**
   * Get all content for a concept
   */
  getContentForConcept(conceptId) {
    const result = [];
    
    for (const [contentId, c] of this.content.entries()) {
      if (c.conceptId === conceptId) {
        result.push(c);
      }
    }
    
    return result;
  }

  /**
   * Get content by type
   */
  getContentByType(type) {
    const result = [];
    
    for (const c of this.content.values()) {
      if (c.type === type) {
        result.push(c);
      }
    }
    
    return result;
  }

  /**
   * Match content to player needs
   * @param {string} playerId - Player identifier
   * @param {string} conceptId - Target concept to learn
   */
  matchContentToPlayer(playerId, conceptId) {
    // Get the concept details
    const concept = this.knowledgeGraph.getConcept(conceptId);
    if (!concept) {
      return {
        matched: false,
        message: `Concept ${conceptId} not found`,
        content: null
      };
    }
    
    // Get learning path for this concept
    const learningPath = this.knowledgeGraph.getLearningPath(conceptId);
    
    // Get player mastery level for this concept
    const masteryLevel = this.knowledgeGraph.getMasteryLevel(playerId, conceptId);
    
    // Find appropriate content based on mastery
    let matchedContent = null;
    let matchType = '';
    
    if (masteryLevel < 20) {
      // Beginner - need basics lesson
      matchedContent = this.findContent(conceptId, 'lesson', 1);
      matchType = 'introduction';
    } else if (masteryLevel < 50) {
      // Intermediate - examples and practice
      matchedContent = this.findContent(conceptId, 'example', concept.difficulty);
      matchType = 'examples';
    } else if (masteryLevel < 80) {
      // Advanced - quizzes and practice
      matchedContent = this.findContent(conceptId, 'quiz', concept.difficulty);
      matchType = 'assessment';
    } else {
      // Expert - advanced challenges
      matchedContent = this.findContent(conceptId, 'practice', concept.difficulty + 1);
      matchType = 'mastery';
    }
    
    // Fallback: find any content for this concept
    if (!matchedContent) {
      const conceptContent = this.getContentForConcept(conceptId);
      if (conceptContent.length > 0) {
        matchedContent = conceptContent[0];
        matchType = 'fallback';
      }
    }
    
    return {
      matched: matchedContent !== null,
      content: matchedContent,
      matchType,
      concept,
      learningPath: learningPath || [],
      masteryLevel,
      recommendations: this.generateRecommendations(playerId, conceptId, masteryLevel)
    };
  }

  /**
   * Find content matching criteria
   */
  findContent(conceptId, type, difficulty) {
    let bestMatch = null;
    let bestDifficultyDiff = Infinity;
    
    for (const c of this.content.values()) {
      if (c.conceptId === conceptId && c.type === type) {
        const diff = Math.abs(c.difficulty - difficulty);
        if (diff < bestDifficultyDiff) {
          bestDifficultyDiff = diff;
          bestMatch = c;
        }
      }
    }
    
    return bestMatch;
  }

  /**
   * Generate content recommendations for a concept
   */
  generateRecommendations(playerId, conceptId, masteryLevel) {
    const recommendations = [];
    
    // Get all content for this concept
    const conceptContent = this.getContentForConcept(conceptId);
    
    // Sort by suitability for current mastery level
    for (const c of conceptContent) {
      recommendations.push({
        contentId: c.id,
        title: c.title,
        type: c.type,
        suitability: this.calculateSuitability(masteryLevel, c),
        reason: this.getSuitabilityReason(masteryLevel, c)
      });
    }
    
    // Sort by suitability
    recommendations.sort((a, b) => b.suitability - a.suitability);
    
    return recommendations;
  }

  /**
   * Calculate content suitability for player mastery level
   */
  calculateSuitability(masteryLevel, content) {
    // Higher suitability for content that matches current level
    const levelMatch = 1 - (Math.abs(content.difficulty * 20 - masteryLevel) / 100);
    
    // Type suitability based on mastery level
    let typeSuitability = 0.5;
    if (masteryLevel < 30 && content.type === 'lesson') {
      typeSuitability = 0.9;
    } else if (masteryLevel >= 30 && masteryLevel < 60 && content.type === 'example') {
      typeSuitability = 0.9;
    } else if (masteryLevel >= 60 && masteryLevel < 80 && content.type === 'quiz') {
      typeSuitability = 0.9;
    } else if (masteryLevel >= 80 && content.type === 'practice') {
      typeSuitability = 0.9;
    }
    
    return (levelMatch + typeSuitability) / 2;
  }

  /**
   * Get human-readable suitability reason
   */
  getSuitabilityReason(masteryLevel, content) {
    if (masteryLevel < 30 && content.type === 'lesson') {
      return 'Perfect for beginners - introduces core concepts';
    } else if (masteryLevel >= 30 && masteryLevel < 60 && content.type === 'example') {
      return 'Good for intermediate learners - shows practical examples';
    } else if (masteryLevel >= 60 && content.type === 'quiz') {
      return 'Tests your knowledge and identifies gaps';
    } else if (content.difficulty > masteryLevel / 20) {
      return 'Challenging content to advance your skills';
    }
    return 'Relevant content for your level';
  }

  /**
   * Get next recommended content for player
   */
  getNextContent(playerId) {
    // Get player weak areas
    const weakAreas = this.knowledgeGraph.getWeakAreas(playerId);
    
    if (weakAreas.length === 0) {
      return {
        content: null,
        message: 'No recommendations available'
      };
    }
    
    // Get the highest priority weak area
    const topWeakArea = weakAreas[0];
    
    // Match content for this concept
    const match = this.matchContentToPlayer(playerId, topWeakArea.concept.id);
    
    return {
      content: match.content,
      concept: topWeakArea.concept,
      reason: `Based on your performance in ${topWeakArea.concept.name}`,
      matchType: match.matchType
    };
  }

  /**
   * Update content
   */
  updateContent(contentId, updates) {
    const content = this.content.get(contentId);
    if (!content) {
      return null;
    }
    
    const updated = {
      ...content,
      ...updates,
      updatedAt: Date.now()
    };
    
    this.content.set(contentId, updated);
    return updated;
  }

  /**
   * Delete content
   */
  deleteContent(contentId) {
    const content = this.content.get(contentId);
    if (content) {
      this.contentConcepts.delete(contentId);
    }
    return this.content.delete(contentId);
  }

  /**
   * Get content statistics
   */
  getStats() {
    const stats = {
      totalContent: this.content.size,
      byType: {},
      byFormat: {},
      averageDuration: 0
    };
    
    let totalDuration = 0;
    
    for (const c of this.content.values()) {
      stats.byType[c.type] = (stats.byType[c.type] || 0) + 1;
      stats.byFormat[c.format] = (stats.byFormat[c.format] || 0) + 1;
      totalDuration += c.duration;
    }
    
    if (this.content.size > 0) {
      stats.averageDuration = totalDuration / this.content.size;
    }
    
    return stats;
  }

  /**
   * Search content by keyword or tag
   */
  searchContent(query) {
    const results = [];
    const lowerQuery = query.toLowerCase();
    
    for (const c of this.content.values()) {
      if (c.title.toLowerCase().includes(lowerQuery) ||
          c.body.toLowerCase().includes(lowerQuery) ||
          c.tags.some(tag => tag.toLowerCase().includes(lowerQuery))) {
        results.push(c);
      }
    }
    
    return results;
  }
}