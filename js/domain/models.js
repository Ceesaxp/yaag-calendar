/**
 * Core domain models for Year Planner application
 */

/**
 * Represents an event in the Year Planner
 */
class Event {
  /**
   * Create a new Event
   * @param {Object} params - Event parameters
   * @param {string} [params.id] - Unique identifier (UUID), auto-generated if not provided
   * @param {string} params.title - Event title
   * @param {string} [params.description] - Event description
   * @param {Date} params.startDate - Start date
   * @param {Date} params.endDate - End date
   * @param {boolean} [params.isRecurring=false] - Whether event recurs
   * @param {Object} [params.recurrencePattern] - Pattern for recurring events
   * @param {('weekly'|'monthly'|'annual')} [params.recurrencePattern.type] - Type of recurrence
   * @param {boolean} [params.startsPM=false] - Whether event starts in the afternoon
   * @param {boolean} [params.endsAM=false] - Whether event ends in the morning
   * @param {boolean} [params.isPublicHoliday=false] - Whether event is a public holiday
   */
  constructor({
    id = crypto.randomUUID(),
    title,
    description = '',
    startDate,
    endDate,
    isRecurring = false,
    recurrencePattern = null,
    startsPM = false,
    endsAM = false,
    isPublicHoliday = false,
  } = {}) {
    // Validate required fields
    if (!title) throw new Error('Event title is required');
    if (!startDate || !(startDate instanceof Date))
      throw new Error('Valid start date is required');
    if (!endDate || !(endDate instanceof Date))
      throw new Error('Valid end date is required');
    
    // Check if start date is after end date
    if (startDate > endDate) {
      console.log(
        'Event ID: ' +
          id +
          ' Start date: ' +
          startDate +
          ' End date: ' +
          endDate
      );
      // Swap dates instead of throwing an error
      const temp = startDate;
      startDate = endDate;
      endDate = temp;
    }

    // Validate recurrence pattern if isRecurring is true
    if (
      isRecurring &&
      (!recurrencePattern ||
        !['weekly', 'monthly', 'annual'].includes(recurrencePattern.type))
    ) {
      throw new Error(
        'Valid recurrence pattern is required for recurring events',
      );
    }

    this.id = id;
    this.title = title;
    this.description = description;
    this.startDate = startDate;
    this.endDate = endDate;
    this.isRecurring = isRecurring;
    this.recurrencePattern = recurrencePattern;
    this.startsPM = startsPM;
    this.endsAM = endsAM;
    this.isPublicHoliday = isPublicHoliday;
  }

  /**
   * Calculate the duration of the event in days
   * @returns {number} Duration in days (inclusive of start and end dates)
   */
  get duration() {
    const msPerDay = 1000 * 60 * 60 * 24;
    // Adding 1 to include both start and end date in the duration
    return Math.floor((this.endDate - this.startDate) / msPerDay) + 1;
  }

  /**
   * Check if event overlaps with a given date range
   * @param {Date} startDate - Start date to check
   * @param {Date} endDate - End date to check
   * @returns {boolean} True if the event overlaps with the date range
   */
  overlaps(startDate, endDate) {
    return this.startDate <= endDate && this.endDate >= startDate;
  }

  /**
   * Create a copy of this event
   * @returns {Event} A new Event instance with the same properties
   */
  clone() {
    return new Event({
      id: crypto.randomUUID(), // New event gets a new ID
      title: this.title,
      description: this.description,
      startDate: new Date(this.startDate),
      endDate: new Date(this.endDate),
      isRecurring: this.isRecurring,
      recurrencePattern: this.recurrencePattern
        ? { ...this.recurrencePattern }
        : null,
      startsPM: this.startsPM,
      endsAM: this.endsAM,
      isPublicHoliday: this.isPublicHoliday,
    });
  }
}

/**
 * Represents the Year Planner that contains events
 */
class YearPlanner {
  /**
   * Create a new Year Planner
   * @param {Object} params - YearPlanner parameters
   * @param {number} [params.year=currentYear] - Year for the planner
   * @param {Array<Event>} [params.events=[]] - Initial events
   */
  constructor({ year = new Date().getFullYear(), events = [] } = {}) {
    this.year = year;
    this._events = [];

    // Add initial events if provided
    if (events.length > 0) {
      events.forEach((event) => this.addEvent(event));
    }
  }

  /**
   * Get all events in the planner
   * @returns {Array<Event>} Array of Event objects
   */
  get events() {
    return [...this._events]; // Return a copy to prevent direct modification
  }

  /**
   * Add an event to the planner
   * @param {Event} event - Event to add
   * @returns {string} ID of the added event
   * @throws {Error} If event is not an Event instance or if it's outside the planner's year
   */
  addEvent(event) {
    // Validate event
    if (!(event instanceof Event)) {
      throw new Error('Invalid event object');
    }

    // Check if event overlaps with the planner's year
    const yearStart = new Date(this.year, 0, 1);
    const yearEnd = new Date(this.year, 11, 31);

    if (event.endDate < yearStart || event.startDate > yearEnd) {
      throw new Error("Event is outside the planner's year");
    }

    this._events.push(event);
    return event.id;
  }

  /**
   * Remove an event from the planner
   * @param {string} eventId - ID of the event to remove
   * @returns {boolean} True if event was found and removed, false otherwise
   */
  removeEvent(eventId) {
    const initialLength = this._events.length;
    this._events = this._events.filter((event) => event.id !== eventId);
    return this._events.length < initialLength;
  }

  /**
   * Get an event by ID
   * @param {string} eventId - ID of the event to get
   * @returns {Event|null} Event object if found, null otherwise
   */
  getEvent(eventId) {
    return this._events.find((event) => event.id === eventId) || null;
  }

  /**
   * Update an existing event
   * @param {string} eventId - ID of the event to update
   * @param {Object} updates - Properties to update
   * @returns {boolean} True if event was found and updated, false otherwise
   */
  updateEvent(eventId, updates) {
    const eventIndex = this._events.findIndex((event) => event.id === eventId);
    if (eventIndex === -1) return false;

    // Create a new event with updated properties
    const currentEvent = this._events[eventIndex];
    const updatedEvent = new Event({
      ...currentEvent,
      ...updates,
      id: eventId, // Preserve the original ID
    });

    // Check if updated event is within the year
    const yearStart = new Date(this.year, 0, 1);
    const yearEnd = new Date(this.year, 11, 31);
    if (updatedEvent.endDate < yearStart || updatedEvent.startDate > yearEnd) {
      throw new Error("Updated event is outside the planner's year");
    }

    this._events[eventIndex] = updatedEvent;
    return true;
  }

  /**
   * Get events that overlap with a given date range
   * @param {Date} startDate - Start date of the range
   * @param {Date} endDate - End date of the range
   * @returns {Array<Event>} Array of events that overlap with the date range
   */
  getEventsInRange(startDate, endDate) {
    return this._events.filter((event) => event.overlaps(startDate, endDate));
  }

  /**
   * Get events for a specific month
   * @param {number} month - Month (0-11)
   * @returns {Array<Event>} Array of events in the specified month
   */
  getEventsInMonth(month) {
    if (month < 0 || month > 11) {
      throw new Error('Month must be between 0 and 11');
    }

    const monthStart = new Date(this.year, month, 1);
    const monthEnd = new Date(this.year, month + 1, 0); // Last day of month
    return this.getEventsInRange(monthStart, monthEnd);
  }

  /**
   * Clear all events from the planner
   */
  clearEvents() {
    this._events = [];
  }
}

// Export the classes
export { Event, YearPlanner };
