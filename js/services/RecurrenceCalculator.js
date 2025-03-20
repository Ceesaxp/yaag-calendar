/**
 * RecurrenceCalculator.js - Handles expansion of recurring events
 *
 * Generates concrete instances of recurring events based on their patterns,
 * constrained to the bounds of a specific year. Supports weekly, monthly,
 * and annual recurrence patterns with optimization for memory usage.
 */

import { Event } from '../domain/models.js';

/**
 * RecurrencePattern class to handle different types of event recurrence
 */
class RecurrencePattern {
  /**
   * Create a new recurrence pattern
   * @param {string} type - Type of recurrence ('weekly', 'monthly', or 'annual')
   * @param {Object} [options] - Additional recurrence options
   * @param {number[]} [options.daysOfWeek] - Days of week for weekly recurrence (0 = Sunday, 6 = Saturday)
   * @param {boolean} [options.preserveEndOfMonth] - For monthly, if true, always use last day of month for dates like 31st
   */
  constructor(type, options = {}) {
    if (!['weekly', 'monthly', 'annual'].includes(type)) {
      throw new Error(`Invalid recurrence type: ${type}`);
    }
    
    this.type = type;
    this.options = options;
    
    // Set default options based on type
    if (type === 'weekly' && !options.daysOfWeek) {
      this.options.daysOfWeek = []; // Default to the original day
    }
    
    if (type === 'monthly' && options.preserveEndOfMonth === undefined) {
      this.options.preserveEndOfMonth = true;
    }
  }
  
  /**
   * Get a simplified representation for serialization
   * @returns {Object} Simplified object for serialization
   */
  toJSON() {
    return {
      type: this.type,
      ...this.options
    };
  }
  
  /**
   * Create a RecurrencePattern from a plain object
   * @param {Object} obj - Object representation of recurrence pattern
   * @returns {RecurrencePattern} A new RecurrencePattern instance
   */
  static fromObject(obj) {
    if (!obj || !obj.type) {
      throw new Error('Invalid recurrence pattern object');
    }
    
    const { type, ...options } = obj;
    return new RecurrencePattern(type, options);
  }
}

/**
 * RecurrenceCalculator class that handles the expansion of recurring events
 */
class RecurrenceCalculator {
  /**
   * Create a recurrence calculator for a specific year
   * @param {number} year - The year to calculate recurrences for
   */
  constructor(year) {
    this.year = year;
    this.yearStart = new Date(year, 0, 1);
    this.yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);
    
    // Cache for event instances to prevent regeneration
    this._cache = new Map();
    
    // Flag to detect if timezone has DST to handle edge cases
    this.hasDST = this._checkForDST();
  }
  
  /**
   * Check if the current timezone has DST
   * @returns {boolean} True if the timezone has DST
   * @private
   */
  _checkForDST() {
    // Check if January and July have different offsets
    const jan = new Date(this.year, 0, 1).getTimezoneOffset();
    const jul = new Date(this.year, 6, 1).getTimezoneOffset();
    return jan !== jul;
  }

  /**
   * Expand all recurring events into concrete instances
   * @param {Array<Event>} events - Array of events
   * @returns {Array<Event>} Array of events with recurring events expanded
   */
  expandRecurringEvents(events) {
    if (!events || !Array.isArray(events)) {
      return [];
    }
    
    // Separate recurring and non-recurring events
    const nonRecurringEvents = events.filter(event => !event.isRecurring);
    const recurringEvents = events.filter(event => event.isRecurring);

    // Start with all non-recurring events
    let expandedEvents = [...nonRecurringEvents];

    // Process each recurring event
    for (const baseEvent of recurringEvents) {
      try {
        // Check if we have this event in cache by its ID
        if (this._cache.has(baseEvent.id)) {
          expandedEvents = expandedEvents.concat(this._cache.get(baseEvent.id));
          continue;
        }
        
        // Generate new instances
        const instances = this.generateRecurrenceInstances(baseEvent);
        
        // Add to expanded events
        expandedEvents = expandedEvents.concat(instances);
        
        // Cache the instances for future use
        this._cache.set(baseEvent.id, instances);
      } catch (error) {
        console.error(`Error expanding recurring event ${baseEvent.id}:`, error);
        // Include the original event if expansion fails
        expandedEvents.push(baseEvent);
      }
    }

    return expandedEvents;
  }

  /**
   * Generate instances of a recurring event
   * @param {Event} baseEvent - The base recurring event
   * @returns {Array<Event>} Array of event instances
   */
  generateRecurrenceInstances(baseEvent) {
    if (!baseEvent.isRecurring) {
      return [baseEvent];
    }

    if (!baseEvent.recurrencePattern || !baseEvent.recurrencePattern.type) {
      console.warn(
        `Event ${baseEvent.id} is marked as recurring but has no valid recurrence pattern`
      );
      return [baseEvent]; // Return original event if no valid pattern
    }

    const { type } = baseEvent.recurrencePattern;
    
    // Convert to RecurrencePattern instance if it's not already
    const pattern = (baseEvent.recurrencePattern instanceof RecurrencePattern)
      ? baseEvent.recurrencePattern
      : RecurrencePattern.fromObject(baseEvent.recurrencePattern);

    switch (type) {
      case 'weekly':
        return this.generateWeeklyInstances(baseEvent, pattern);
      case 'monthly':
        return this.generateMonthlyInstances(baseEvent, pattern);
      case 'annual':
        return this.generateAnnualInstances(baseEvent, pattern);
      default:
        console.warn(`Unknown recurrence type: ${type}`);
        return [baseEvent];
    }
  }

  /**
   * Generate weekly instances of a recurring event
   * @param {Event} baseEvent - The base recurring event
   * @param {RecurrencePattern} pattern - The recurrence pattern
   * @returns {Array<Event>} Array of weekly event instances
   */
  generateWeeklyInstances(baseEvent, pattern) {
    const instances = [];
    const eventDuration = this.getEventDurationDays(baseEvent);
    
    // Determine which days of the week this event occurs on
    let daysOfWeek;
    if (pattern.options.daysOfWeek && pattern.options.daysOfWeek.length > 0) {
      // Use specified days of week
      daysOfWeek = pattern.options.daysOfWeek;
    } else {
      // Default to the same day of week as the original event
      daysOfWeek = [baseEvent.startDate.getDay()];
    }

    // Get a start date that's not earlier than both:
    // 1. The original event start date (so we only recur forward)
    // 2. The beginning of the current year we're planning
    const originalStart = baseEvent.startDate;
    const yearStart = new Date(this.year, 0, 1);
    let planningStart = new Date(Math.max(originalStart.getTime(), yearStart.getTime()));

    // For each day of week this event occurs on
    for (const dayOfWeek of daysOfWeek) {
      // Calculate first instance in the year for this day of week that is not earlier than originalStart
      let currentDate = new Date(planningStart);
      
      // If the current date is not the right day of week, advance to the next occurrence
      if (currentDate.getDay() !== dayOfWeek) {
        // Adjust to first occurrence of this day of week
        const daysDiff = (dayOfWeek - currentDate.getDay() + 7) % 7;
        currentDate.setDate(currentDate.getDate() + daysDiff);
      }

      // Generate instances for the entire year
      while (currentDate <= this.yearEnd) {
        // Only create instance if it starts within the current year boundary
        if (currentDate >= this.yearStart) {
          const instance = this.createEventInstance(
            baseEvent,
            new Date(currentDate),
            eventDuration
          );
          instances.push(instance);
        }

        // Move to next week
        currentDate.setDate(currentDate.getDate() + 7);
      }
    }

    return instances;
  }

  /**
   * Generate monthly instances of a recurring event
   * @param {Event} baseEvent - The base recurring event
   * @param {RecurrencePattern} pattern - The recurrence pattern
   * @returns {Array<Event>} Array of monthly event instances
   */
  generateMonthlyInstances(baseEvent, pattern) {
    const instances = [];
    const eventDuration = this.getEventDurationDays(baseEvent);
    
    // Get the day of month from the original event (1-31)
    const dayOfMonth = baseEvent.startDate.getDate();
    
    // Get the original month to check if it's the last day of month
    const origMonth = baseEvent.startDate.getMonth();
    const origYear = baseEvent.startDate.getFullYear();
    const lastDayOfOrigMonth = new Date(origYear, origMonth + 1, 0).getDate();
    const isLastDayOfMonth = dayOfMonth === lastDayOfOrigMonth;
    
    // Determine start month - only generate forward from original date
    // If the event starts in a future year, start from January
    // If the event starts in the past, start from the current month if we're in the same year
    const startMonth = origYear < this.year ? 0 : 
                        (origYear > this.year ? 0 : origMonth);
    
    // Generate an instance for each month in the year, starting from the determined month
    for (let month = startMonth; month < 12; month++) {
      let instanceDate;
      
      if (pattern.options.preserveEndOfMonth && isLastDayOfMonth) {
        // If we're preserving end-of-month and the original was on the last day,
        // always use the last day of the target month
        const lastDay = new Date(this.year, month + 1, 0).getDate();
        instanceDate = new Date(this.year, month, lastDay);
      } else {
        // Normal case: use the same day of month
        instanceDate = new Date(this.year, month, dayOfMonth);
        
        // Check if this is a valid date (handles months with fewer days)
        if (instanceDate.getMonth() !== month) {
          // We got bumped to the next month, use last day of intended month
          instanceDate = new Date(this.year, month + 1, 0);
        }
      }

      const instance = this.createEventInstance(
        baseEvent,
        instanceDate,
        eventDuration
      );
      instances.push(instance);
    }

    return instances;
  }

  /**
   * Generate annual instances of a recurring event
   * @param {Event} baseEvent - The base recurring event
   * @param {RecurrencePattern} pattern - The recurrence pattern
   * @returns {Array<Event>} Array of annual event instances (single instance for current year)
   */
  generateAnnualInstances(baseEvent, pattern) {
    const eventDuration = this.getEventDurationDays(baseEvent);
    
    // Get month and day from the base event
    const origMonth = baseEvent.startDate.getMonth();
    const day = baseEvent.startDate.getDate();
    const origYear = baseEvent.startDate.getFullYear();
    
    // Only create an instance if the original date is in the past or this year
    // Don't generate instances for future years
    if (origYear > this.year) {
      return [];
    }
    
    // If the event occurs later in the year than the current date and we're in the original year,
    // don't generate an instance yet
    const now = new Date();
    if (origYear === this.year && origYear === now.getFullYear()) {
      if (origMonth > now.getMonth() || 
          (origMonth === now.getMonth() && day > now.getDate())) {
        return [];
      }
    }
    
    // Check if it was February 29 in a leap year
    const isLeapDayInLeapYear = origMonth === 1 && day === 29 && this._isLeapYear(origYear);
    
    // Create date for this year's instance
    let instanceDate;
    
    if (isLeapDayInLeapYear) {
      // Handle Feb 29 specially
      if (this._isLeapYear(this.year)) {
        instanceDate = new Date(this.year, 1, 29); // Feb 29 in current year
      } else {
        // Current year is not a leap year, use Feb 28 or Mar 1 based on pattern
        instanceDate = pattern.options.fallbackForLeapDay === 'after'
          ? new Date(this.year, 2, 1)   // March 1
          : new Date(this.year, 1, 28);  // February 28
      }
    } else {
      // Normal case
      instanceDate = new Date(this.year, origMonth, day);
      
      // Check if this is a valid date (handles other edge cases)
      if (instanceDate.getMonth() !== origMonth) {
        // Default to last day of the intended month
        instanceDate = new Date(this.year, origMonth + 1, 0);
      }
    }

    const instance = this.createEventInstance(
      baseEvent,
      instanceDate,
      eventDuration
    );

    return [instance];
  }

  /**
   * Create a concrete instance of a recurring event
   * @param {Event} baseEvent - The base recurring event
   * @param {Date} startDate - Start date for the instance
   * @param {number} durationDays - Duration in days
   * @returns {Event} The event instance
   */
  createEventInstance(baseEvent, startDate, durationDays) {
    // Calculate end date based on start date and original duration
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + durationDays);
    
    // Truncate to year boundaries if necessary
    const finalEndDate = new Date(
      Math.min(endDate.getTime(), this.yearEnd.getTime())
    );

    // Create a unique ID for this instance based on original ID and date
    const instanceId = `${baseEvent.id}_${startDate.toISOString().split('T')[0]}`;
    
    // Apply time from original event to preserve AM/PM indicators
    this._applyTimeFromDate(startDate, baseEvent.startDate);
    this._applyTimeFromDate(finalEndDate, baseEvent.endDate);
    
    // Create a new Event instance
    try {
      return new Event({
        id: instanceId,
        title: baseEvent.title,
        description: baseEvent.description,
        startDate: startDate,
        endDate: finalEndDate,
        isRecurring: false, // Instances are not themselves recurring
        startsPM: baseEvent.startsPM,
        endsAM: baseEvent.endsAM,
        isPublicHoliday: baseEvent.isPublicHoliday,
        // Add metadata for instances
        isRecurrenceInstance: true,
        originalEventId: baseEvent.id,
        recurrencePattern: baseEvent.recurrencePattern
      });
    } catch (error) {
      // Fallback to plain object if Event construction fails
      console.warn(`Failed to create Event instance: ${error.message}. Using plain object.`);
      return {
        id: instanceId,
        title: baseEvent.title,
        description: baseEvent.description,
        startDate: startDate,
        endDate: finalEndDate,
        isRecurring: false,
        startsPM: baseEvent.startsPM,
        endsAM: baseEvent.endsAM,
        isPublicHoliday: baseEvent.isPublicHoliday,
        isRecurrenceInstance: true,
        originalEventId: baseEvent.id
      };
    }
  }

  /**
   * Apply hours, minutes, and seconds from one date to another
   * @param {Date} targetDate - Date to modify
   * @param {Date} sourceDate - Date to get time from
   * @private
   */
  _applyTimeFromDate(targetDate, sourceDate) {
    targetDate.setHours(
      sourceDate.getHours(),
      sourceDate.getMinutes(),
      sourceDate.getSeconds(),
      sourceDate.getMilliseconds()
    );
  }

  /**
   * Calculate the duration of an event in days
   * @param {Event} event - The event
   * @returns {number} Duration in days
   */
  getEventDurationDays(event) {
    // Use the event's duration getter if available
    if (event.duration !== undefined && typeof event.duration !== 'function') {
      return event.duration;
    }
    
    // Otherwise calculate manually
    const startDate = new Date(event.startDate);
    const endDate = new Date(event.endDate);
    
    // Reset time components to ensure accurate day calculation
    const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    
    // Calculate difference in milliseconds and convert to days
    const diff = end.getTime() - start.getTime();
    return Math.round(diff / (1000 * 60 * 60 * 24)) + 1; // Include both start and end days
  }
  
  /**
   * Check if a year is a leap year
   * @param {number} year - The year to check
   * @returns {boolean} True if it's a leap year
   * @private
   */
  _isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  }
  
  /**
   * Clear the instance cache
   * Use this when changing years or when events are updated
   */
  clearCache() {
    this._cache.clear();
  }
  
  /**
   * Update the calculator's year
   * @param {number} year - The new year to calculate for
   */
  setYear(year) {
    if (this.year !== year) {
      this.year = year;
      this.yearStart = new Date(year, 0, 1);
      this.yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);
      this.clearCache(); // Clear cache when changing year
    }
  }
}

// Export classes
export { RecurrencePattern, RecurrenceCalculator };
