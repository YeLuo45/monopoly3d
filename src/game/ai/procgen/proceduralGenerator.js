/**
 * ProceduralGenerator - Main procedural content generation system
 * 
 * Generates properties, events, and cards using seeded random generation.
 * Supports variation and mutation of existing content.
 */

export class ProceduralGenerator {
  /**
   * Create a new procedural generator
   * @param {number|string} seed - Random seed for reproducible generation
   */
  constructor(seed) {
    this.seed = seed ?? Date.now();
    this.rng = this._createRNG(this.seed);
    this.generatedContent = new Map();
    this.contentCounter = 0;
  }

  /**
   * Create a seeded random number generator (Mulberry32)
   * @private
   */
  _createRNG(seed) {
    let s = this._hashSeed(seed);
    return () => {
      s |= 0;
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * Hash seed to numeric value
   * @private
   */
  _hashSeed(seed) {
    if (typeof seed === 'number') return seed;
    if (typeof seed === 'string') {
      let hash = 0;
      for (let i = 0; i < seed.length; i++) {
        const char = seed.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs(hash);
    }
    return Date.now();
  }

  /**
   * Random integer between min and max (inclusive)
   */
  randomInt(min, max) {
    return Math.floor(this.rng() * (max - min + 1)) + min;
  }

  /**
   * Random float between min and max
   */
  randomFloat(min, max) {
    return this.rng() * (max - min) + min;
  }

  /**
   * Random element from array
   */
  randomElement(arr) {
    return arr[Math.floor(this.rng() * arr.length)];
  }

  /**
   * Shuffle array in place
   */
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /**
   * Generate a property with attributes
   * @param {string} name - Property name
   * @returns {object} Generated property
   */
  generateProperty(name) {
    const id = `prop_${++this.contentCounter}_${Date.now()}`;
    
    const colorGroups = ['brown', 'lightBlue', 'pink', 'orange', 'red', 'yellow', 'green', 'darkBlue'];
    const color = this.randomElement(colorGroups);
    
    // Price ranges by color group tier
    const priceRanges = {
      brown: [60, 100],
      lightBlue: [100, 150],
      pink: [150, 200],
      orange: [200, 250],
      red: [250, 350],
      yellow: [280, 400],
      green: [300, 450],
      darkBlue: [350, 500],
    };
    
    const [minPrice, maxPrice] = priceRanges[color] || [100, 300];
    const price = this.randomInt(minPrice, maxPrice);
    
    // Base rent is typically 5-10% of price
    const baseRent = Math.round(price * this.randomFloat(0.05, 0.10));
    
    // House costs scale with property price
    const houseCost = Math.round(price * this.randomFloat(0.4, 0.6));
    
    // House rent multipliers
    const rentWith1House = Math.round(baseRent * this.randomFloat(3, 5));
    const rentWith2House = Math.round(baseRent * this.randomFloat(6, 10));
    const rentWith3House = Math.round(baseRent * this.randomFloat(10, 16));
    const rentWith4House = Math.round(baseRent * this.randomFloat(16, 24));
    const hotelRent = Math.round(baseRent * this.randomFloat(22, 32));
    
    const property = {
      id,
      type: 'property',
      name,
      colorGroup: color,
      price,
      rent: baseRent,
      rentWith1House,
      rentWith2House,
      rentWith3House,
      rentWith4House,
      hotelRent,
      houseCost,
      mortgageValue: Math.round(price * 0.5),
      houseHotelCost: houseCost,
      isMortgaged: false,
      owner: null,
    };
    
    this.generatedContent.set(id, { type: 'property', data: property });
    return property;
  }

  /**
   * Generate a game event
   * @param {string} description - Event description base
   * @returns {object} Generated event
   */
  generateEvent(description) {
    const id = `event_${++this.contentCounter}_${Date.now()}`;
    
    const eventTypes = [
      'money_gain',
      'money_loss',
      'move_player',
      'property_takeover',
      'rent_freeze',
      'double_turn',
      'go_to_jail',
      'get_out_of_jail_free',
      'property_tax',
      'street_repairs',
    ];
    
    const type = this.randomElement(eventTypes);
    let effect = {};
    
    switch (type) {
      case 'money_gain':
        effect = {
          type: 'money',
          amount: this.randomInt(50, 200) * (this.rng() > 0.5 ? 1 : -1),
        };
        break;
      case 'move_player':
        effect = {
          type: 'movement',
          spaces: this.randomInt(-5, 10),
        };
        break;
      case 'property_takeover':
        effect = {
          type: 'property_transfer',
          propertyIndex: this.randomInt(1, 39),
        };
        break;
      case 'rent_freeze':
        effect = {
          type: 'buff',
          duration: this.randomInt(1, 3),
          effect: 'rent_immunity',
        };
        break;
      case 'double_turn':
        effect = {
          type: 'buff',
          duration: 1,
          effect: 'double_dice',
        };
        break;
      case 'go_to_jail':
        effect = {
          type: 'penalty',
          destination: 'jail',
        };
        break;
      case 'get_out_of_jail_free':
        effect = {
          type: 'item',
          item: 'get_out_of_jail_card',
        };
        break;
      case 'property_tax':
        effect = {
          type: 'tax',
          amount: this.randomInt(25, 100),
          perProperty: this.rng() > 0.5,
        };
        break;
      case 'street_repairs':
        effect = {
          type: 'expense',
          houseCost: this.randomInt(25, 75),
          hotelCost: this.randomInt(100, 200),
        };
        break;
      default:
        effect = { type: 'neutral' };
    }
    
    const event = {
      id,
      type,
      description,
      effect,
      rarity: this.randomElement(['common', 'uncommon', 'rare']),
    };
    
    this.generatedContent.set(id, { type: 'event', data: event });
    return event;
  }

  /**
   * Generate a chance or community chest card
   * @param {string} type - 'chance' or 'community'
   * @returns {object} Generated card
   */
  generateCard(type) {
    const id = `card_${++this.contentCounter}_${Date.now()}`;
    
    const cardTemplates = {
      chance: [
        { message: 'Advance to Go', action: 'move_to', position: 0 },
        { message: 'Bank pays you dividend', action: 'money_gain', amount: 50 },
        { message: 'Go directly to Jail', action: 'go_to_jail' },
        { message: 'Make general repairs', action: 'street_repairs', houseCost: 25, hotelCost: 100 },
        { message: 'Your building loan matures', action: 'money_gain', amount: 150 },
        { message: 'Get out of Jail free', action: '获得出狱卡', item: 'get_out_of_jail' },
        { message: 'Go back to Start', action: 'move_to', position: 0 },
        { message: 'Speeding fine', action: 'money_loss', amount: 15 },
      ],
      community: [
        { message: 'Bank error in your favor', action: 'money_gain', amount: 200 },
        { message: 'Doctor fees', action: 'money_loss', amount: 50 },
        { message: 'From sale of stock, you get $50', action: 'money_gain', amount: 50 },
        { message: 'Get out of Jail free', action: '获得出狱卡', item: 'get_out_of_jail' },
        { message: 'Go to Jail', action: 'go_to_jail' },
        { message: 'Holiday fund matures', action: 'money_gain', amount: 100 },
        { message: 'Income tax refund', action: 'money_gain', amount: 20 },
        { message: 'Life insurance matures', action: 'money_gain', amount: 100 },
        { message: 'Pay hospital fees', action: 'money_loss', amount: 100 },
        { message: 'Pay school fees', action: 'money_loss', amount: 150 },
        { message: 'Receive $25 consultancy fee', action: 'money_gain', amount: 25 },
        { message: 'You are assessed for street repairs', action: 'street_repairs', houseCost: 40, hotelCost: 115 },
      ],
    };
    
    const templates = cardTemplates[type] || cardTemplates.chance;
    const template = this.randomElement(templates);
    
    const card = {
      id,
      cardType: type,
      message: template.message,
      action: template.action,
      ...(template.amount && { amount: template.amount }),
      ...(template.position !== undefined && { position: template.position }),
      ...(template.houseCost && { houseCost: template.houseCost }),
      ...(template.hotelCost && { hotelCost: template.hotelCost }),
      ...(template.item && { item: template.item }),
      rarity: this.randomElement(['common', 'uncommon', 'rare']),
    };
    
    this.generatedContent.set(id, { type: 'card', data: card });
    return card;
  }

  /**
   * Generate a variant of existing content
   * @param {object} baseContent - Original content to vary
   * @param {number} intensity - Variation intensity (0-1)
   * @returns {object} Variant content
   */
  generateVariant(baseContent, intensity = 0.5) {
    const id = `variant_${++this.contentCounter}_${Date.now()}`;
    const type = baseContent.type;
    
    const clampedIntensity = Math.max(0, Math.min(1, intensity));
    
    if (type === 'property') {
      return this._variantProperty(baseContent, clampedIntensity, id);
    } else if (type === 'event') {
      return this._variantEvent(baseContent, clampedIntensity, id);
    } else if (type === 'card') {
      return this._variantCard(baseContent, clampedIntensity, id);
    }
    
    return { ...baseContent, id, isVariant: true, intensity: clampedIntensity };
  }

  /**
   * Create property variant
   * @private
   */
  _variantProperty(base, intensity, id) {
    const priceVariation = Math.round(base.price * intensity * this.randomFloat(-0.3, 0.3));
    const newPrice = Math.max(20, base.price + priceVariation);
    
    const rentVariation = Math.round(base.rent * intensity * this.randomFloat(-0.3, 0.3));
    const newRent = Math.max(1, base.rent + rentVariation);
    
    return {
      ...base,
      id,
      name: `${base.name} (变体)`,
      price: newPrice,
      rent: newRent,
      rentWith1House: Math.round(newRent * this.randomFloat(3, 5)),
      rentWith2House: Math.round(newRent * this.randomFloat(6, 10)),
      rentWith3House: Math.round(newRent * this.randomFloat(10, 16)),
      rentWith4House: Math.round(newRent * this.randomFloat(16, 24)),
      hotelRent: Math.round(newRent * this.randomFloat(22, 32)),
      houseCost: Math.round(newPrice * 0.5),
      mortgageValue: Math.round(newPrice * 0.5),
      isVariant: true,
      baseId: base.id,
      intensity,
    };
  }

  /**
   * Create event variant
   * @private
   */
  _variantEvent(base, intensity, id) {
    const effect = { ...base.effect };
    
    if (effect.amount) {
      const amountVariation = Math.round(effect.amount * intensity * this.randomFloat(-0.5, 0.5));
      effect.amount = Math.max(1, effect.amount + amountVariation);
    }
    
    if (effect.duration) {
      effect.duration = Math.max(1, Math.round(effect.duration * (1 + intensity * this.randomFloat(-0.5, 0.5))));
    }
    
    if (effect.spaces) {
      effect.spaces = Math.round(effect.spaces * (1 + intensity * this.randomFloat(-0.3, 0.3)));
    }
    
    return {
      ...base,
      id,
      description: `${base.description} (变体)`,
      effect,
      isVariant: true,
      baseId: base.id,
      intensity,
    };
  }

  /**
   * Create card variant
   * @private
   */
  _variantCard(base, intensity, id) {
    const card = { ...base, id };
    
    if (card.amount) {
      const amountVariation = Math.round(card.amount * intensity * this.randomFloat(-0.5, 0.5));
      card.amount = Math.max(1, card.amount + amountVariation);
    }
    
    card.message = `${card.message} (变体)`;
    card.isVariant = true;
    card.baseId = base.id;
    card.intensity = intensity;
    
    return card;
  }

  /**
   * Mutate content with specific changes
   * @param {string} contentId - ID of content to mutate
   * @param {object} mutations - Specific mutations to apply
   * @returns {object|null} Mutated content or null if not found
   */
  mutateContent(contentId, mutations) {
    const stored = this.generatedContent.get(contentId);
    if (!stored) return null;
    
    const { data: original } = stored;
    const mutatedId = `mutated_${++this.contentCounter}_${Date.now()}`;
    
    const mutated = this._applyMutations(original, mutations);
    mutated.id = mutatedId;
    mutated.originalId = contentId;
    mutated.mutations = { ...mutations };
    
    this.generatedContent.set(mutatedId, { type: original.type, data: mutated });
    return mutated;
  }

  /**
   * Apply mutations to content
   * @private
   */
  _applyMutations(content, mutations) {
    const result = { ...content };
    
    for (const [key, value] of Object.entries(mutations)) {
      if (key === '$multiply' && typeof value === 'object') {
        for (const [field, multiplier] of Object.entries(value)) {
          if (typeof result[field] === 'number') {
            result[field] = Math.round(result[field] * multiplier);
          }
        }
      } else if (key === '$add' && typeof value === 'object') {
        for (const [field, addend] of Object.entries(value)) {
          if (typeof result[field] === 'number') {
            result[field] = result[field] + addend;
          }
        }
      } else if (key === '$set') {
        result[key] = value;
      } else {
        result[key] = value;
      }
    }
    
    return result;
  }

  /**
   * Get generated content by ID
   * @param {string} contentId - Content ID
   * @returns {object|null} Content or null
   */
  getContent(contentId) {
    const stored = this.generatedContent.get(contentId);
    return stored ? stored.data : null;
  }

  /**
   * Get all generated content of a type
   * @param {string} type - Content type
   * @returns {array} Content items
   */
  getContentByType(type) {
    const results = [];
    for (const [, stored] of this.generatedContent) {
      if (stored.type === type) {
        results.push(stored.data);
      }
    }
    return results;
  }

  /**
   * Clear generated content cache
   */
  clearCache() {
    this.generatedContent.clear();
    this.contentCounter = 0;
  }

  /**
   * Get seed used by generator
   * @returns {number} Seed value
   */
  getSeed() {
    return this.seed;
  }

  /**
   * Reset RNG to initial state
   */
  reset() {
    this.rng = this._createRNG(this.seed);
  }
}