/**
 * ContentTemplateLibrary - Template-based content generation
 * 
 * Provides reusable templates for generating consistent content
 * with parameter substitution.
 */

export class ContentTemplateLibrary {
  /**
   * Create a new template library
   */
  constructor() {
    this.templates = new Map();
    this.generationHistory = [];
    this._initializeDefaultTemplates();
  }

  /**
   * Initialize default templates
   * @private
   */
  _initializeDefaultTemplates() {
    // Property templates by color group
    this.addTemplate('property_brown', {
      type: 'property',
      colorGroup: 'brown',
      priceRange: [60, 100],
      rentMultiplier: 0.05,
      houseCostRange: [50, 60],
    });

    this.addTemplate('property_lightBlue', {
      type: 'property',
      colorGroup: 'lightBlue',
      priceRange: [100, 150],
      rentMultiplier: 0.055,
      houseCostRange: [50, 100],
    });

    this.addTemplate('property_pink', {
      type: 'property',
      colorGroup: 'pink',
      priceRange: [150, 200],
      rentMultiplier: 0.06,
      houseCostRange: [100, 150],
    });

    this.addTemplate('property_orange', {
      type: 'property',
      colorGroup: 'orange',
      priceRange: [200, 250],
      rentMultiplier: 0.065,
      houseCostRange: [100, 150],
    });

    this.addTemplate('property_red', {
      type: 'property',
      colorGroup: 'red',
      priceRange: [250, 350],
      rentMultiplier: 0.07,
      houseCostRange: [150, 200],
    });

    this.addTemplate('property_yellow', {
      type: 'property',
      colorGroup: 'yellow',
      priceRange: [280, 400],
      rentMultiplier: 0.075,
      houseCostRange: [150, 200],
    });

    this.addTemplate('property_green', {
      type: 'property',
      colorGroup: 'green',
      priceRange: [300, 450],
      rentMultiplier: 0.08,
      houseCostRange: [200, 250],
    });

    this.addTemplate('property_darkBlue', {
      type: 'property',
      colorGroup: 'darkBlue',
      priceRange: [350, 500],
      rentMultiplier: 0.085,
      houseCostRange: [200, 300],
    });

    this.addTemplate('property_railroad', {
      type: 'property',
      colorGroup: 'railroad',
      priceRange: [200, 200],
      rentMultiplier: 0,
      houseCostRange: [0, 0],
      isRailroad: true,
    });

    this.addTemplate('property_utility', {
      type: 'property',
      colorGroup: 'utility',
      priceRange: [150, 150],
      rentMultiplier: 0,
      houseCostRange: [0, 0],
      isUtility: true,
    });

    // Event templates
    this.addTemplate('event_money_gain', {
      type: 'event',
      effectType: 'money_gain',
      amountRange: [50, 200],
    });

    this.addTemplate('event_money_loss', {
      type: 'event',
      effectType: 'money_loss',
      amountRange: [50, 150],
    });

    this.addTemplate('event_movement', {
      type: 'event',
      effectType: 'move_player',
      spacesRange: [-5, 10],
    });

    this.addTemplate('event_rent_immunity', {
      type: 'event',
      effectType: 'rent_immunity',
      durationRange: [1, 3],
    });

    // Card templates
    this.addTemplate('card_chance_money', {
      type: 'card',
      cardType: 'chance',
      actionTypes: ['money_gain', 'money_loss'],
      amountRange: [10, 200],
    });

    this.addTemplate('card_chance_movement', {
      type: 'card',
      cardType: 'chance',
      actionTypes: ['move_to', 'advance'],
      positionRange: [0, 39],
    });

    this.addTemplate('card_community_money', {
      type: 'card',
      cardType: 'community',
      actionTypes: ['money_gain', 'money_loss'],
      amountRange: [10, 200],
    });

    this.addTemplate('card_community_tax', {
      type: 'card',
      cardType: 'community',
      actionTypes: ['tax', 'expense'],
      amountRange: [50, 200],
    });
  }

  /**
   * Add a content template
   * @param {string} templateId - Unique template identifier
   * @param {object} template - Template definition
   */
  addTemplate(templateId, template) {
    if (!templateId || typeof templateId !== 'string') {
      throw new Error('Template ID must be a non-empty string');
    }
    if (!template || typeof template !== 'object') {
      throw new Error('Template must be a non-null object');
    }
    this.templates.set(templateId, { ...template });
  }

  /**
   * Get a template by ID
   * @param {string} templateId - Template ID
   * @returns {object|null} Template or null
   */
  getTemplate(templateId) {
    const template = this.templates.get(templateId);
    return template ? { ...template } : null;
  }

  /**
   * Check if template exists
   * @param {string} templateId - Template ID
   * @returns {boolean} True if exists
   */
  hasTemplate(templateId) {
    return this.templates.has(templateId);
  }

  /**
   * Remove a template
   * @param {string} templateId - Template ID
   * @returns {boolean} True if removed
   */
  removeTemplate(templateId) {
    return this.templates.delete(templateId);
  }

  /**
   * Get all template IDs
   * @returns {array} Array of template IDs
   */
  getTemplateIds() {
    return Array.from(this.templates.keys());
  }

  /**
   * Fill a template with parameters
   * @param {string} templateId - Template ID
   * @param {object} params - Parameters to fill
   * @returns {object|null} Filled template or null
   */
  fillTemplate(templateId, params = {}) {
    const template = this.getTemplate(templateId);
    if (!template) return null;

    const filled = { ...template };
    const id = `filled_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    filled.id = id;

    // Apply parameters to override template values
    for (const [key, value] of Object.entries(params)) {
      // Skip internal properties used for generation
      if (key === 'rng') continue;
      filled[key] = value;
    }

    // Record in history
    this.generationHistory.push({
      templateId,
      params,
      result: filled,
      timestamp: Date.now(),
    });

    return filled;
  }

  /**
   * Generate content from template with random variations
   * @param {string} templateId - Template ID
   * @param {object} overrides - Optional parameter overrides
   * @returns {object|null} Generated content or null
   */
  generateFromTemplate(templateId, overrides = {}) {
    const template = this.getTemplate(templateId);
    if (!template) return null;

    const id = `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Generate based on template type
    if (template.type === 'property') {
      return this._generateProperty(template, id, overrides);
    } else if (template.type === 'event') {
      return this._generateEvent(template, id, overrides);
    } else if (template.type === 'card') {
      return this._generateCard(template, id, overrides);
    }

    return null;
  }

  /**
   * Generate property from template
   * @private
   */
  _generateProperty(template, id, overrides) {
    const name = overrides.name || `${template.colorGroup} Property`;

    const priceRange = template.priceRange || [100, 300];
    const price = Math.round(this._randomInRange(priceRange[0], priceRange[1]));

    const rentMultiplier = template.rentMultiplier || 0.06;
    const rent = Math.max(1, Math.round(price * rentMultiplier));

    const houseCostRange = template.houseCostRange || [50, 200];
    const houseCost = Math.round(this._randomInRange(houseCostRange[0], houseCostRange[1]));

    return {
      id,
      type: 'property',
      name,
      colorGroup: template.colorGroup,
      price,
      rent,
      rentWith1House: Math.round(rent * (3 + Math.random() * 2)),
      rentWith2House: Math.round(rent * (6 + Math.random() * 4)),
      rentWith3House: Math.round(rent * (10 + Math.random() * 6)),
      rentWith4House: Math.round(rent * (16 + Math.random() * 8)),
      hotelRent: Math.round(rent * (22 + Math.random() * 10)),
      houseCost,
      mortgageValue: Math.round(price * 0.5),
      isRailroad: template.isRailroad || false,
      isUtility: template.isUtility || false,
      ...overrides,
    };
  }

  /**
   * Generate event from template
   * @private
   */
  _generateEvent(template, id, overrides) {
    const description = overrides.description || 'Game Event';

    const effect = {};

    switch (template.effectType) {
      case 'money_gain':
      case 'money_loss':
        effect.type = template.effectType === 'money_gain' ? 'money' : 'money';
        const amountRange = template.amountRange || [50, 150];
        effect.amount = Math.round(this._randomInRange(amountRange[0], amountRange[1]));
        if (template.effectType === 'money_loss') effect.amount *= -1;
        break;

      case 'move_player':
        effect.type = 'movement';
        const spacesRange = template.spacesRange || [-3, 5];
        effect.spaces = Math.round(this._randomInRange(spacesRange[0], spacesRange[1]));
        break;

      case 'rent_immunity':
        effect.type = 'buff';
        const durationRange = template.durationRange || [1, 3];
        effect.duration = Math.round(this._randomInRange(durationRange[0], durationRange[1]));
        effect.effect = 'rent_immunity';
        break;

      default:
        effect.type = 'neutral';
    }

    return {
      id,
      type: 'event',
      description,
      effect,
      rarity: this._randomRarity(),
      ...overrides,
    };
  }

  /**
   * Generate card from template
   * @private
   */
  _generateCard(template, id, overrides) {
    const actionType = this._randomElement(template.actionTypes || ['money_gain']);

    let card = {
      id,
      type: 'card',
      cardType: template.cardType || 'chance',
      action: actionType,
      rarity: this._randomRarity(),
    };

    switch (actionType) {
      case 'money_gain':
        card.message = 'You receive money';
        const gainRange = template.amountRange || [10, 100];
        card.amount = Math.round(this._randomInRange(gainRange[0], gainRange[1]));
        break;

      case 'money_loss':
        card.message = 'You lose money';
        const lossRange = template.amountRange || [10, 100];
        card.amount = -Math.round(this._randomInRange(lossRange[0], lossRange[1]));
        break;

      case 'move_to':
        card.message = 'Move to a specific location';
        const posRange = template.positionRange || [0, 39];
        card.position = Math.round(this._randomInRange(posRange[0], posRange[1]));
        break;

      case 'advance':
        card.message = 'Advance to a location';
        card.position = Math.round(this._randomInRange(0, 39));
        break;

      default:
        card.message = 'Card effect';
    }

    return { ...card, ...overrides };
  }

  /**
   * Get random number in range
   * @private
   */
  _randomInRange(min, max) {
    return min + Math.random() * (max - min);
  }

  /**
   * Get random element from array
   * @private
   */
  _randomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /**
   * Get random rarity
   * @private
   */
  _randomRarity() {
    const roll = Math.random();
    if (roll < 0.6) return 'common';
    if (roll < 0.9) return 'uncommon';
    return 'rare';
  }

  /**
   * Get generation history
   * @param {number} limit - Max entries to return
   * @returns {array} Generation history
   */
  getHistory(limit = 50) {
    return this.generationHistory.slice(-limit);
  }

  /**
   * Clear generation history
   */
  clearHistory() {
    this.generationHistory = [];
  }

  /**
   * Get template count
   * @returns {number} Number of templates
   */
  getTemplateCount() {
    return this.templates.size;
  }
}