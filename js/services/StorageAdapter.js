/**
 * StorageAdapter.js - Persistence layer for Year Planner
 *
 * Provides methods for saving and retrieving events using local storage
 * with fallback mechanisms and import/export capabilities.
 */

export class StorageAdapter {
  constructor() {
    this.storagePrefix = 'yearPlanner_';
    this.checkStorageAvailability();
  }

  /**
   * Check if local storage is available
   * @throws {Error} If local storage is not available
   */
  checkStorageAvailability() {
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, testKey);
      localStorage.removeItem(testKey);
    } catch (e) {
      throw new Error(
        'Local storage is not available. The Year Planner requires local storage to function properly.',
      );
    }
  }

  /**
   * Get the storage key for a specific year
   * @param {number} year - The year to get events for
   * @returns {string} The storage key
   */
  getYearKey(year) {
    return `${this.storagePrefix}events_${year}`;
  }

  /**
   * Load events for a specific year
   * @param {number} year - The year to load events for
   * @returns {Promise<Array>} Promise resolving to an array of events
   */
  async loadEvents(year) {
    try {
      const key = this.getYearKey(year);
      const data = localStorage.getItem(key);

      if (!data) {
        return [];
      }

      const events = JSON.parse(data);

      // Convert string dates back to Date objects
      return events.map((event) => {
        return {
          ...event,
          startDate: new Date(event.startDate),
          endDate: new Date(event.endDate),
        };
      });
    } catch (error) {
      console.error(`Error loading events for year ${year}:`, error);
      throw new Error(
        `Failed to load events for year ${year}: ${error.message}`,
      );
    }
  }

  /**
   * Save an event
   * @param {Object} event - The event to save
   * @returns {Promise<void>}
   */
  async saveEvent(event) {
    try {
      const year = event.startDate.getFullYear();
      const key = this.getYearKey(year);

      // Load existing events
      let events = await this.loadEvents(year);

      // Find the event index if it already exists
      const existingIndex = events.findIndex((e) => e.id === event.id);

      if (existingIndex >= 0) {
        // Update existing event
        events[existingIndex] = event;
      } else {
        // Add new event
        events.push(event);
      }

      // Save back to storage
      localStorage.setItem(key, JSON.stringify(events));

      return true;
    } catch (error) {
      console.error('Error saving event:', error);
      throw new Error(`Failed to save event: ${error.message}`);
    }
  }

  /**
   * Delete an event
   * @param {string} eventId - ID of the event to delete
   * @returns {Promise<boolean>} Promise resolving to true if deleted, false if not found
   */
  async deleteEvent(eventId) {
    try {
      // We don't know which year the event belongs to, so check all years
      const years = this.getStoredYears();
      let deleted = false;

      for (const year of years) {
        const events = await this.loadEvents(year);
        const initialLength = events.length;

        const filteredEvents = events.filter((e) => e.id !== eventId);

        if (filteredEvents.length !== initialLength) {
          // Event found and filtered out
          localStorage.setItem(
            this.getYearKey(year),
            JSON.stringify(filteredEvents),
          );
          deleted = true;
        }
      }

      return deleted;
    } catch (error) {
      console.error(`Error deleting event ${eventId}:`, error);
      throw new Error(`Failed to delete event: ${error.message}`);
    }
  }

  /**
   * Get a list of years that have stored events
   * @returns {Array<number>} Array of years
   */
  getStoredYears() {
    const years = [];
    const prefixLength = this.storagePrefix.length + 7; // length of 'events_'

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);

      if (key && key.startsWith(this.storagePrefix + 'events_')) {
        const yearStr = key.substring(prefixLength);
        const year = parseInt(yearStr);

        if (!isNaN(year)) {
          years.push(year);
        }
      }
    }

    return years;
  }

  /**
   * Export events data to JSON
   * @param {number} [year] - Optional year to export data for
   * @returns {Promise<string>} Promise resolving to a JSON string
   */
  async exportData(year) {
    try {
      const exportData = {};

      if (year) {
        // Export specific year
        exportData[year] = await this.loadEvents(year);
      } else {
        // Export all years
        const years = this.getStoredYears();

        for (const year of years) {
          exportData[year] = await this.loadEvents(year);
        }
      }

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Error exporting data:', error);
      throw new Error(`Failed to export data: ${error.message}`);
    }
  }

  /**
   * Import events data from JSON
   * @param {string} jsonData - JSON string to import
   * @returns {Promise<void>}
   */
  async importData(jsonData) {
    try {
      const data = JSON.parse(jsonData);

      // Validate the imported data structure
      if (typeof data !== 'object') {
        throw new Error('Invalid data format');
      }

      // Import data for each year
      for (const yearStr in data) {
        const year = parseInt(yearStr);

        if (isNaN(year)) {
          console.warn(`Skipping invalid year: ${yearStr}`);
          continue;
        }

        const events = data[yearStr];

        if (!Array.isArray(events)) {
          console.warn(`Skipping invalid events data for year ${year}`);
          continue;
        }

        // Convert string dates back to Date objects and validate event structure
        const validEvents = events
          .filter((event) => this.validateEventStructure(event))
          .map((event) => {
            return {
              ...event,
              startDate: new Date(event.startDate),
              endDate: new Date(event.endDate),
            };
          });

        // Save to storage
        localStorage.setItem(
          this.getYearKey(year),
          JSON.stringify(validEvents),
        );
      }

      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      throw new Error(`Failed to import data: ${error.message}`);
    }
  }

  /**
   * Validate event structure
   * @param {Object} event - Event to validate
   * @returns {boolean} True if valid, false otherwise
   */
  validateEventStructure(event) {
    // Check required fields
    const requiredFields = ['id', 'title', 'startDate', 'endDate'];

    for (const field of requiredFields) {
      if (event[field] === undefined) {
        return false;
      }
    }

    // Validate dates
    if (
      !this.isValidDateString(event.startDate) ||
      !this.isValidDateString(event.endDate)
    ) {
      return false;
    }

    return true;
  }

  /**
   * Check if a string can be parsed as a valid date
   * @param {string} dateStr - Date string to check
   * @returns {boolean} True if valid, false otherwise
   */
  isValidDateString(dateStr) {
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
  }

  /**
   * Clear all stored data
   * @returns {Promise<void>}
   */
  async clearAllData() {
    try {
      const keys = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);

        if (key && key.startsWith(this.storagePrefix)) {
          keys.push(key);
        }
      }

      for (const key of keys) {
        localStorage.removeItem(key);
      }

      return true;
    } catch (error) {
      console.error('Error clearing data:', error);
      throw new Error(`Failed to clear data: ${error.message}`);
    }
  }
}
