/**
 * EventSerializer - Serialize/deserialize game events for export/import/replay
 * 
 * Provides portable JSON format for game events with schema versioning
 * and migration support for backward compatibility.
 */

export const CURRENT_SCHEMA_VERSION = '1.0.0';

/**
 * Schema version migrations
 * Each migration function takes old data and returns migrated data
 */
const MIGRATIONS = {
  '1.0.0': (data) => data, // Current version, no migration needed
};

export class EventSerializer {
  constructor() {
    this.version = CURRENT_SCHEMA_VERSION;
  }

  /**
   * Serialize a single event to portable JSON format
   * @param {string} type - Event type
   * @param {object} data - Event data
   * @returns {object} Serialized event {type, data, timestamp, version}
   */
  serializeEvent(type, data) {
    return {
      type,
      data: data || {},
      timestamp: Date.now(),
      version: this.version,
    };
  }

  /**
   * Deserialize a JSON object back to event format
   * @param {object} jsonObj - Serialized event object
   * @returns {object} {type, data, timestamp}
   */
  deserializeEvent(jsonObj) {
    if (!jsonObj || typeof jsonObj !== 'object') {
      throw new Error('Invalid event object: expected object');
    }

    const type = jsonObj.type;
    const data = jsonObj.data || {};
    const timestamp = jsonObj.timestamp || Date.now();

    if (!type || typeof type !== 'string') {
      throw new Error('Invalid event object: missing or invalid type');
    }

    return { type, data, timestamp };
  }

  /**
   * Serialize multiple events to JSON string
   * @param {Array} events - Array of events [{type, data}, ...]
   * @returns {string} JSON string of serialized events
   */
  serializeEvents(events) {
    if (!Array.isArray(events)) {
      throw new Error('Invalid events array: expected array');
    }

    const serialized = events.map((event) => {
      const type = event.type || event.event;
      const data = event.data || event.detail || {};
      return this.serializeEvent(type, data);
    });

    return JSON.stringify({
      version: this.version,
      events: serialized,
      exportedAt: Date.now(),
    });
  }

  /**
   * Deserialize JSON string back to array of events
   * @param {string} jsonStr - JSON string from serializeEvents
   * @returns {Array} Array of deserialized events [{type, data, timestamp}, ...]
   */
  deserializeEvents(jsonStr) {
    if (typeof jsonStr !== 'string') {
      throw new Error('Invalid input: expected JSON string');
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      throw new Error(`Invalid JSON: ${e.message}`);
    }

    if (!parsed.events || !Array.isArray(parsed.events)) {
      throw new Error('Invalid event format: missing events array');
    }

    // Check if migration is needed
    const inputVersion = parsed.version || '1.0.0';
    if (inputVersion !== this.version) {
      return this._migrateEvents(parsed.events, inputVersion);
    }

    return parsed.events.map((event) => this.deserializeEvent(event));
  }

  /**
   * Get current schema version
   * @returns {string} Current version string
   */
  getVersion() {
    return this.version;
  }

  /**
   * Migrate events from old version to current
   * @param {string} jsonStr - JSON string or events array
   * @param {string} fromVersion - Source version
   * @returns {Array} Migrated events array
   */
  migrate(jsonStr, fromVersion) {
    if (!MIGRATIONS[this.version]) {
      throw new Error(`No migration path from ${fromVersion} to ${this.version}`);
    }

    let events;
    if (typeof jsonStr === 'string') {
      const parsed = JSON.parse(jsonStr);
      events = parsed.events || [];
    } else if (Array.isArray(jsonStr)) {
      events = jsonStr;
    } else {
      throw new Error('Invalid input: expected JSON string or events array');
    }

    // Apply migration functions in sequence
    let migratedEvents = events;
    const versions = Object.keys(MIGRATIONS);
    const fromIdx = versions.indexOf(fromVersion);
    const toIdx = versions.indexOf(this.version);

    if (fromIdx === -1 || toIdx === -1) {
      throw new Error(`Invalid version: ${fromVersion} -> ${this.version}`);
    }

    for (let i = fromIdx; i < toIdx; i++) {
      const migrationFn = MIGRATIONS[versions[i + 1]];
      migratedEvents = migratedEvents.map(migrationFn);
    }

    return migratedEvents;
  }

  /**
   * Internal: Migrate events array from old version to current
   * @private
   */
  _migrateEvents(events, fromVersion) {
    const migrationFn = MIGRATIONS[this.version];
    if (!migrationFn) {
      throw new Error(`No migration available for version ${fromVersion}`);
    }
    return events.map(migrationFn);
  }

  /**
   * Validate an event object has required fields
   * @param {object} event - Event object to validate
   * @returns {boolean} True if valid
   */
  validateEvent(event) {
    if (!event || typeof event !== 'object') return false;
    if (typeof event.type !== 'string') return false;
    if (event.data && typeof event.data !== 'object') return false;
    return true;
  }

  /**
   * Get summary info about serialized events
   * @param {string} jsonStr - JSON string
   * @returns {object} Summary {count, version, duration}
   */
  getSummary(jsonStr) {
    const parsed = JSON.parse(jsonStr);
    const events = parsed.events || [];
    
    const firstEvent = events[0];
    const lastEvent = events[events.length - 1];
    
    return {
      count: events.length,
      version: parsed.version,
      exportedAt: parsed.exportedAt,
      duration: firstEvent && lastEvent 
        ? lastEvent.timestamp - firstEvent.timestamp 
        : 0,
    };
  }
}

// Default export for convenience
export default EventSerializer;