/**
 * GameStateAdaptor - Adapts Game State Based on Player Profile
 * 
 * Adapts game state parameters based on player segment, difficulty,
 * and learning progress to provide personalized gaming experience.
 * Part of the Adaptive Gaming System (Direction E v9).
 */

export class GameStateAdaptor {
  /**
   * Create a new GameStateAdaptor
   * @param {AdaptiveGamingFacade} adaptiveFacade - The adaptive gaming facade
   */
  constructor(adaptiveFacade) {
    if (!adaptiveFacade) {
      throw new Error('adaptiveFacade is required');
    }
    
    this.facade = adaptiveFacade;
    
    // Adaptation parameters cache
    this.parametersCache = new Map(); // playerId -> parameters
    
    // Default adaptation parameters
    this.defaultParameters = {
      rentMultiplier: 1.0,
      startingMoney: 1500,
      turnTimeout: 30000,
      cardDrawChance: 0.15,
      propertyValueMultiplier: 1.0,
      auctionBias: 0.5,
      bankruptcyThreshold: 0.2,
      minimumBidIncrement: 10,
      housePriceMultiplier: 1.0,
      hotelPriceMultiplier: 1.0,
      freeParkingPrize: 0,
      salaryBonus: 0,
      maxHouses: 4,
      maxHotels: 1
    };
    
    // Segment-based parameter modifications
    this.segmentModifiers = {
      casual: {
        rentMultiplier: 0.9,
        startingMoney: 2000,
        turnTimeout: 45000,
        cardDrawChance: 0.12,
        propertyValueMultiplier: 0.95,
        freeParkingPrize: 100,
        salaryBonus: 50
      },
      strategic: {
        rentMultiplier: 1.0,
        startingMoney: 1500,
        turnTimeout: 30000,
        cardDrawChance: 0.15,
        propertyValueMultiplier: 1.0,
        freeParkingPrize: 0,
        salaryBonus: 0
      },
      competitive: {
        rentMultiplier: 1.1,
        startingMoney: 1200,
        turnTimeout: 20000,
        cardDrawChance: 0.18,
        propertyValueMultiplier: 1.05,
        auctionBias: 0.7,
        freeParkingPrize: 0,
        salaryBonus: 0
      },
      social: {
        rentMultiplier: 0.85,
        startingMoney: 1800,
        turnTimeout: 40000,
        cardDrawChance: 0.10,
        propertyValueMultiplier: 0.90,
        freeParkingPrize: 200,
        salaryBonus: 100
      }
    };
  }

  /**
   * Adapt game state for a player
   * @param {string} playerId - Player ID
   * @param {Object} gameState - Original game state
   * @returns {Object} Adapted game state
   */
  adaptGameState(playerId, gameState) {
    if (!playerId || !gameState) {
      throw new Error('playerId and gameState are required');
    }
    
    const adaptedParams = this.getAdaptedParameters(playerId);
    const difficulty = this.getAdaptedDifficulty(playerId);
    const playerState = this.facade.getPlayerState(playerId);
    
    // Clone and adapt game state
    const adapted = JSON.parse(JSON.stringify(gameState));
    
    // Apply adapted parameters to game state
    adapted.settings = adapted.settings || {};
    adapted.settings.rentMultiplier = adaptedParams.rentMultiplier;
    adapted.settings.propertyValueMultiplier = adaptedParams.propertyValueMultiplier;
    adapted.settings.housePriceMultiplier = adaptedParams.housePriceMultiplier;
    adapted.settings.hotelPriceMultiplier = adaptedParams.hotelPriceMultiplier;
    adapted.settings.startingMoney = adaptedParams.startingMoney;
    adapted.settings.turnTimeout = adaptedParams.turnTimeout;
    adapted.settings.cardDrawChance = adaptedParams.cardDrawChance;
    adapted.settings.auctionBias = adaptedParams.auctionBias;
    adapted.settings.freeParkingPrize = adaptedParams.freeParkingPrize;
    adapted.settings.salaryBonus = adaptedParams.salaryBonus;
    
    // Apply difficulty modifiers
    this._applyDifficultyModifiers(adapted, difficulty);
    
    // Mark as adapted
    adapted._adapted = true;
    adapted._adaptedFor = playerId;
    adapted._adaptedAt = Date.now();
    adapted._difficultyLevel = difficulty;
    
    return adapted;
  }

  /**
   * Get adapted parameters for a player
   * @param {string} playerId - Player ID
   * @returns {Object} Adapted parameters
   */
  getAdaptedParameters(playerId) {
    // Check cache first
    if (this.parametersCache.has(playerId)) {
      return this.parametersCache.get(playerId);
    }
    
    // Get player state
    const playerState = this.facade.getPlayerState(playerId);
    if (!playerState) {
      return this.defaultParameters;
    }
    
    // Get player segment
    const segment = playerState.adaptationState?.segment || 'casual';
    const modifiers = this.segmentModifiers[segment] || this.segmentModifiers.casual;
    
    // Get difficulty level
    const difficulty = this.getAdaptedDifficulty(playerId);
    
    // Calculate adapted parameters
    const adapted = { ...this.defaultParameters };
    
    Object.keys(modifiers).forEach(key => {
      if (key in adapted) {
        // Apply segment modifier
        adapted[key] = modifiers[key];
      }
    });
    
    // Apply difficulty scaling
    const difficultyScale = this._getDifficultyScale(difficulty);
    adapted.rentMultiplier *= difficultyScale;
    adapted.propertyValueMultiplier *= difficultyScale;
    adapted.startingMoney = Math.round(adapted.startingMoney * difficultyScale);
    
    // Cache parameters
    this.parametersCache.set(playerId, adapted);
    
    return adapted;
  }

  /**
   * Get adapted difficulty level for a player
   * @param {string} playerId - Player ID
   * @returns {string} Difficulty level
   */
  getAdaptedDifficulty(playerId) {
    const playerState = this.facade.getPlayerState(playerId);
    if (!playerState) {
      return 'normal';
    }
    
    // Get difficulty from facade
    const facadeDifficulty = this.facade.getDifficultyEngine().getDifficulty(playerId);
    
    // Get player's adaptation state
    const adaptationState = playerState.adaptationState || {};
    const playerDifficulty = adaptationState.currentDifficulty || facadeDifficulty || 'normal';
    
    return playerDifficulty;
  }

  /**
   * Clear parameters cache for a player
   * @param {string} playerId - Player ID
   */
  clearCache(playerId) {
    if (playerId) {
      this.parametersCache.delete(playerId);
    } else {
      this.parametersCache.clear();
    }
  }

  /**
   * Get difficulty scale factor
   * @private
   * @param {string} difficulty - Difficulty level
   * @returns {number} Scale factor
   */
  _getDifficultyScale(difficulty) {
    const scales = {
      very_easy: 0.7,
      easy: 0.85,
      normal: 1.0,
      hard: 1.15,
      very_hard: 1.3
    };
    return scales[difficulty] || 1.0;
  }

  /**
   * Apply difficulty modifiers to game state
   * @private
   * @param {Object} gameState - Game state to modify
   * @param {string} difficulty - Difficulty level
   */
  _applyDifficultyModifiers(gameState, difficulty) {
    const scale = this._getDifficultyScale(difficulty);
    
    // Adjust property prices based on difficulty
    if (gameState.properties) {
      gameState.properties = gameState.properties.map(prop => ({
        ...prop,
        price: prop.originalPrice
          ? Math.round(prop.originalPrice * scale)
          : prop.price,
        rent: prop.originalRent
          ? prop.originalRent.map(r => Math.round(r * scale))
          : prop.rent
      }));
    }
    
    // Adjust starting money
    if (gameState.players) {
      gameState.players = gameState.players.map(player => ({
        ...player,
        money: player.money || gameState.settings?.startingMoney || 1500
      }));
    }
    
    // Adjust card probabilities for chance/community chest
    if (gameState.cards) {
      gameState.cards = gameState.cards.map(card => ({
        ...card,
        probability: card.originalProbability
          ? Math.min(1, card.originalProbability * scale)
          : card.probability
      }));
    }
  }

  /**
   * Get adaptation summary for a player
   * @param {string} playerId - Player ID
   * @returns {Object} Adaptation summary
   */
  getAdaptationSummary(playerId) {
    const params = this.getAdaptedParameters(playerId);
    const difficulty = this.getAdaptedDifficulty(playerId);
    const playerState = this.facade.getPlayerState(playerId);
    
    return {
      playerId,
      difficulty,
      segment: playerState?.adaptationState?.segment || 'unknown',
      parameters: params,
      learningProgress: playerState?.adaptationState?.learningProgress || 0,
      confidence: playerState?.adaptationState?.confidence || 0,
      summary: {
        rentMultiplier: params.rentMultiplier.toFixed(2),
        startingMoney: params.startingMoney,
        turnTimeout: `${(params.turnTimeout / 1000).toFixed(0)}s`,
        freeParkingPrize: `$${params.freeParkingPrize}`
      }
    };
  }
}