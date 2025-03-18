/**
 * RecurrenceCalculator.js - Handles expansion of recurring events
 *
 * Generates concrete instances of recurring events based on their patterns,
 * constrained to the bounds of a specific year.
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
  }

  /**
   * Expand all recurring events into concrete instances
   * @param {Array<Object>} events - Array of events
   * @returns {Array<Object>} Array of events with recurring events expanded
   */
  expandRecurringEvents(events) {
    const nonRecurringEvents = events.filter((event) => !event.isRecurring);
    const recurringEvents = events.filter((event) => event.isRecurring);

    let expandedEvents = [...nonRecurringEvents];

    // Process each recurring event
    for (const baseEvent of recurringEvents) {
      const instances = this.generateRecurrenceInstances(baseEvent);
      expandedEvents = expandedEvents.concat(instances);
    }

    return expandedEvents;
  }

  /**
   * Generate instances of a recurring event
   * @param {Object} baseEvent - The base recurring event
   * @returns {Array<Object>} Array of event instances
   */
  generateRecurrenceInstances(baseEvent) {
    if (!baseEvent.recurrencePattern || !baseEvent.recurrencePattern.type) {
      console.warn(
        `Event ${baseEvent.id} is marked as recurring but has no valid recurrence pattern`,
      );
      return [baseEvent]; // Return original event if no valid pattern
    }

    const { type } = baseEvent.recurrencePattern;

    switch (type) {
      case 'weekly':
        return this.generateWeeklyInstances(baseEvent);
      case 'monthly':
        return this.generateMonthlyInstances(baseEvent);
      case 'annual':
        return this.generateAnnualInstances(baseEvent);
      default:
        console.warn(`Unknown recurrence type: ${type}`);
        return [baseEvent];
    }
  }

  /**
   * Generate weekly instances of a recurring event
   * @param {Object} baseEvent - The base recurring event
   * @returns {Array<Object>} Array of weekly event instances
   */
  generateWeeklyInstances(baseEvent) {
    const instances = [];
    const eventDuration = this.getEventDurationDays(baseEvent);

    // Get the day of week (0-6, where 0 is Sunday)
    const startDayOfWeek = baseEvent.startDate.getDay();

    // Calculate first instance in the year
    let currentDate = new Date(this.year, 0, 1); // Start of year

    // Adjust to first occurrence of the day of week
    const daysDiff = (startDayOfWeek - currentDate.getDay() + 7) % 7;
    currentDate.setDate(currentDate.getDate() + daysDiff);

    // Generate instances for the entire year
    while (currentDate <= this.yearEnd) {
      // Only create instance if it starts within the year
      if (currentDate >= this.yearStart) {
        const instance = this.createEventInstance(
          baseEvent,
          new Date(currentDate),
          eventDuration,
        );
        instances.push(instance);
      }

      // Move to next week
      currentDate.setDate(currentDate.getDate() + 7);
    }

    return instances;
  }

  /**
   * Generate monthly instances of a recurring event
   * @param {Object} baseEvent - The base recurring event
   * @returns {Array<Object>} Array of monthly event instances
   */
  generateMonthlyInstances(baseEvent) {
    const instances = [];
    const eventDuration = this.getEventDurationDays(baseEvent);

    // Get the day of month (1-31)
    const dayOfMonth = baseEvent.startDate.getDate();

    // Generate an instance for each month
    for (let month = 0; month < 12; month++) {
      // Create a date for this month's instance
      const instanceDate = new Date(this.year, month, dayOfMonth);

      // Check if this is a valid date (handles months with fewer days)
      if (instanceDate.getMonth() !== month) {
        // We got bumped to the next month, use last day of intended month
        instanceDate.setDate(0); // Set to last day of previous month
      }

      const instance = this.createEventInstance(
        baseEvent,
        instanceDate,
        eventDuration,
      );
      instances.push(instance);
    }

    return instances;
  }

  /**
   * Generate annual instances of a recurring event
   * @param {Object} baseEvent - The base recurring event
   * @returns {Array<Object>} Array of annual event instances (single instance for current year)
   */
  generateAnnualInstances(baseEvent) {
    const eventDuration = this.getEventDurationDays(baseEvent);

    // Get month and day from the base event
    const month = baseEvent.startDate.getMonth();
    const day = baseEvent.startDate.getDate();

    // Create date for this year's instance
    const instanceDate = new Date(this.year, month, day);

    // Check if this is a valid date (handles Feb 29 in non-leap years)
    if (instanceDate.getMonth() !== month) {
      // Default to Feb 28 for Feb 29 in non-leap years
      instanceDate.setDate(28);
    }

    const instance = this.createEventInstance(
      baseEvent,
      instanceDate,
      eventDuration,
    );

    return [instance];
  }

  /**
   * Create a concrete instance of a recurring event
   * @param {Object} baseEvent - The base recurring event
   * @param {Date} startDate - Start date for the instance
   * @param {number} durationDays - Duration in days
   * @returns {Object} The event instance
   */
  createEventInstance(baseEvent, startDate, durationDays) {
    // Calculate end date based on start date and original duration
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + durationDays);

    // Truncate to year boundaries if necessary
    const finalEndDate = new Date(
      Math.min(endDate.getTime(), this.yearEnd.getTime()),
    );

    // Create a unique ID for this instance
    const instanceId = `${baseEvent.id}_${startDate.toISOString().split('T')[0]}`;

    return {
      ...baseEvent,
      id: instanceId,
      originalEventId: baseEvent.id, // Reference to original event
      startDate: startDate,
      endDate: finalEndDate,
      isRecurrenceInstance: true,
    };
  }

  /**
   * Calculate the duration of an event in days
   * @param {Object} event - The event
   * @returns {number} Duration in days
   */
  getEventDurationDays(event) {
    const startDate = new Date(event.startDate);
    const endDate = new Date(event.endDate);

    // Calculate difference in milliseconds and convert to days
    const diff = endDate.getTime() - startDate.getTime();
    return Math.round(diff / (1000 * 60 * 60 * 24));
  }
}
