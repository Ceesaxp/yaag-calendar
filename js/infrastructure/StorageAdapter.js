/**
 * StorageAdapter.js
 * Handles persistence for YearPlanner objects using localStorage
 */

class StorageAdapter {
  /**
   * Constructor for the StorageAdapter
   * @param {string} namespace - Optional namespace prefix for storage keys
   */
  constructor(namespace = 'yearPlanner') {
    this.namespace = namespace;
  }

  /**
   * Generate storage key for a specific year
   * @param {number} year - The year to generate key for
   * @returns {string} The generated storage key
   */
  generateKey(year) {
    return `${this.namespace}_${year}`;
  }

  /**
   * Save a YearPlanner object to localStorage
   * @param {YearPlanner} yearPlanner - The YearPlanner object to save
   * @returns {boolean} Success status
   */
  save(yearPlanner) {
    if (!yearPlanner || !yearPlanner.year) {
      console.error('Invalid YearPlanner object');
      return false;
    }

    try {
      const serialized = this._serialize(yearPlanner);
      const key = this.generateKey(yearPlanner.year);
      localStorage.setItem(key, serialized);
      return true;
    } catch (error) {
      console.error('Failed to save YearPlanner:', error);
      return false;
    }
  }

  /**
   * Load a YearPlanner object from localStorage
   * @param {number} year - The year to load
   * @returns {YearPlanner|null} The loaded YearPlanner or null if not found
   */
  load(year) {
    try {
      const key = this.generateKey(year);
      const serialized = localStorage.getItem(key);

      if (!serialized) {
        return null;
      }

      return this._deserialize(serialized);
    } catch (error) {
      console.error('Failed to load YearPlanner:', error);
      return null;
    }
  }

  /**
   * Delete a YearPlanner from localStorage
   * @param {number} year - The year to delete
   * @returns {boolean} Success status
   */
  delete(year) {
    try {
      const key = this.generateKey(year);
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Failed to delete YearPlanner:', error);
      return false;
    }
  }

  /**
   * List all available YearPlanner years
   * @returns {number[]} Array of years that have data
   */
  listAvailableYears() {
    const years = [];
    const prefix = `${this.namespace}_`;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        const year = parseInt(key.substring(prefix.length), 10);
        if (!isNaN(year)) {
          years.push(year);
        }
      }
    }

    return years.sort();
  }

  /**
   * Export YearPlanner data as a JSON string
   * @param {number} year - The year to export
   * @returns {string|null} JSON string or null if not found
   */
  export(year) {
    const yearPlanner = this.load(year);
    if (!yearPlanner) {
      return null;
    }

    return this._serialize(yearPlanner);
  }

  /**
   * Import YearPlanner data from JSON string
   * @param {string} jsonData - JSON string with YearPlanner data
   * @returns {boolean} Success status
   */
  import(jsonData) {
    try {
      const yearPlanner = this._deserialize(jsonData);
      return this.save(yearPlanner);
    } catch (error) {
      console.error('Failed to import YearPlanner:', error);
      return false;
    }
  }

  /**
   * Export all YearPlanner data as a single JSON string
   * @returns {string} JSON string with all YearPlanner data
   */
  exportAll() {
    const years = this.listAvailableYears();
    const data = years.map((year) => this.load(year));
    return JSON.stringify(data);
  }

  /**
   * Import multiple YearPlanner objects
   * @param {string} jsonData - JSON string with multiple YearPlanner objects
   * @returns {boolean} Success status
   */
  importAll(jsonData) {
    try {
      const data = JSON.parse(jsonData);
      if (!Array.isArray(data)) {
        throw new Error('Invalid data format: expected array');
      }

      let success = true;
      data.forEach((yearPlanner) => {
        if (!this.save(yearPlanner)) {
          success = false;
        }
      });

      return success;
    } catch (error) {
      console.error('Failed to import YearPlanner data:', error);
      return false;
    }
  }

  /**
   * Clear all YearPlanner data from localStorage
   * @returns {boolean} Success status
   */
  clearAll() {
    try {
      const years = this.listAvailableYears();
      years.forEach((year) => this.delete(year));
      return true;
    } catch (error) {
      console.error('Failed to clear all YearPlanner data:', error);
      return false;
    }
  }

  /**
   * Serialize YearPlanner to JSON string with special handling for dates
   * @param {YearPlanner} yearPlanner - The YearPlanner to serialize
   * @returns {string} Serialized JSON string
   * @private
   */
  _serialize(yearPlanner) {
    return JSON.stringify(yearPlanner, (key, value) => {
      // Special handling for Date objects
      if (value instanceof Date) {
        // Store dates as ISO strings at midnight UTC
        // This ensures consistent date handling across time zones
        return {
          __type: 'Date',
          value: value.toISOString(),
        };
      }
      return value;
    });
  }

  /**
   * Deserialize JSON string to YearPlanner with special handling for dates
   * @param {string} jsonString - The JSON string to deserialize
   * @returns {YearPlanner} Deserialized YearPlanner
   * @private
   */
  _deserialize(jsonString) {
    return JSON.parse(jsonString, (key, value) => {
      // Revive Date objects
      if (value && typeof value === 'object' && value.__type === 'Date') {
        // Create date at midnight UTC for the calendar date
        const date = new Date(value.value);
        // Ensure it's at midnight UTC
        return new Date(Date.UTC(
          date.getUTCFullYear(),
          date.getUTCMonth(),
          date.getUTCDate()
        ));
      }
      return value;
    });
  }

  /**
   * Clear all events from local storage
   * @returns {boolean} Success status
   */
  clearAllData() {
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.namespace)) {
          keys.push(key);
        }
      }
      keys.forEach((key) => localStorage.removeItem(key));
      return true;
    } catch (error) {
      console.error('Failed to clear all data:', error);
      return false;
    }
  }
}

// Domain models for reference (would typically be imported)
class YearPlanner {
  constructor(year, events = []) {
    this.year = year;
    this.events = events;
  }
}

class Event {
  constructor({
    id = crypto.randomUUID(),
    title = '',
    description = '',
    startDate,
    endDate,
    isRecurring = false,
    recurrencePattern = null,
    startsPM = false,
    endsAM = false,
    isPublicHoliday = false,
  } = {}) {
    this.id = id;
    this.title = title;
    this.description = description;
    
    // Normalize dates to midnight UTC
    if (startDate) {
      // Create date at midnight UTC
      const start = new Date(startDate);
      this.startDate = new Date(Date.UTC(
        start.getFullYear(),
        start.getMonth(),
        start.getDate()
      ));
    } else {
      this.startDate = null;
    }
    
    if (endDate) {
      // Create date at midnight UTC
      const end = new Date(endDate);
      this.endDate = new Date(Date.UTC(
        end.getFullYear(),
        end.getMonth(),
        end.getDate()
      ));
    } else {
      this.endDate = this.startDate;
    }
    
    this.isRecurring = isRecurring;
    this.recurrencePattern = recurrencePattern;
    
    // These flags handle the time-of-day information
    this.startsPM = startsPM;
    this.endsAM = endsAM;
    this.isPublicHoliday = isPublicHoliday;
  }
}

class RecurrencePattern {
  constructor(type) {
    if (!['weekly', 'monthly', 'annual'].includes(type)) {
      throw new Error('Invalid recurrence type');
    }
    this.type = type;
  }
}

export { StorageAdapter, YearPlanner, Event, RecurrencePattern };
