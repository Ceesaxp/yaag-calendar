/**
 * EventPosition class representing the position of an event in the grid
 */
class EventPosition {
  /**
   * @param {number} rowStart - Month index (0-11)
   * @param {number} colStart - Day of week index (0-6)
   * @param {number} rowSpan - Number of months the event spans
   * @param {number} colSpan - Number of days within week the event spans
   * @param {number} swimLane - Vertical position within day cell (0-4)
   */
  constructor(rowStart, colStart, rowSpan, colSpan, swimLane) {
    this.rowStart = rowStart;
    this.colStart = colStart;
    this.rowSpan = rowSpan;
    this.colSpan = colSpan;
    this.swimLane = swimLane;
  }
}

/**
 * EventLayout class extending Event with position property
 */
class EventLayout {
  /**
   * @param {object} event - Event object
   * @param {EventPosition} position - Position of the event in the grid
   */
  constructor(event, position) {
    this.id = event.id;
    this.title = event.title;
    this.description = event.description;
    this.startDate = event.startDate;
    this.endDate = event.endDate;
    this.isRecurring = event.isRecurring;
    this.recurrencePattern = event.recurrencePattern;
    this.startsPM = event.startsPM;
    this.endsAM = event.endsAM;
    this.isPublicHoliday = event.isPublicHoliday;
    this.position = position;
  }
}

/**
 * EventPositionCalculator class for calculating optimal positions for events
 */
class EventPositionCalculator {
  constructor() {
    // Initialize the occupancy grid (12 months × 7 days × 5 swim lanes)
    this.occupancyGrid = Array(12)
      .fill()
      .map(() =>
        Array(7)
          .fill()
          .map(() => Array(5).fill(false)),
      );

    // Special swim lane for public holidays (always at position 5)
    this.holidayLane = 5;

    // Maximum number of regular swim lanes
    this.maxSwimLanes = 5;
  }

  /**
   * Calculate positions for a list of events
   * @param {Array} events - List of events to calculate positions for
   * @param {number} year - The year for which to calculate positions
   * @returns {Array} List of events with calculated positions
   */
  calculatePositions(events, year) {
    if (!events || events.length === 0) {
      return [];
    }

    // Reset occupancy grid
    this.resetOccupancyGrid();

    // Sort events by duration (longest first) then by start date
    const sortedEvents = [...events].sort((a, b) => {
      const durationA = this._calculateDurationInDays(a.startDate, a.endDate);
      const durationB = this._calculateDurationInDays(b.startDate, b.endDate);

      if (durationA !== durationB) {
        return durationB - durationA; // Descending by duration
      }

      // If same duration, sort by start date
      return new Date(a.startDate) - new Date(b.startDate);
    });

    // Calculate positions for each event
    const eventLayouts = sortedEvents.map((event) => {
      const position = this._calculateOptimalPosition(event, year);
      return new EventLayout(event, position);
    });

    return eventLayouts;
  }

  /**
   * Calculate the optimal position for an event
   * @param {object} event - The event to calculate position for
   * @param {number} year - The year for which to calculate position
   * @returns {EventPosition} The calculated position
   */
  _calculateOptimalPosition(event, year) {
    const startDate = new Date(event.startDate);
    const endDate = new Date(event.endDate);

    // Filter events to only this year
    if (startDate.getFullYear() < year) {
      startDate.setFullYear(year, 0, 1);
    }

    if (endDate.getFullYear() > year) {
      endDate.setFullYear(year, 11, 31);
    }

    const startMonth = startDate.getMonth();
    const startDay = startDate.getDay();
    const endMonth = endDate.getMonth();
    const endDay = endDate.getDay();

    // Calculate row and column spans
    const rowSpan = endMonth - startMonth + 1;

    // Handle events within same month
    if (rowSpan === 1) {
      return this._calculateSameMonthPosition(
        event,
        startMonth,
        startDay,
        endDay,
      );
    }

    // Handle events spanning multiple months
    return this._calculateMultiMonthPosition(
      event,
      startMonth,
      startDay,
      endMonth,
      endDay,
    );
  }

  /**
   * Calculate position for events within the same month
   * @param {object} event - The event to calculate position for
   * @param {number} month - The month index
   * @param {number} startDay - The start day of week
   * @param {number} endDay - The end day of week
   * @returns {EventPosition} The calculated position
   */
  _calculateSameMonthPosition(event, month, startDay, endDay) {
    // Calculate column span (handling week wrap)
    let colSpan = 0;

    if (endDay >= startDay) {
      colSpan = endDay - startDay + 1;
    } else {
      colSpan = 7 - startDay + endDay + 1;
    }

    // For public holidays, use the special swim lane
    if (event.isPublicHoliday) {
      return new EventPosition(month, startDay, 1, colSpan, this.holidayLane);
    }

    // Find first available swim lane
    const swimLane = this._findAvailableSwimLane(month, startDay, 1, colSpan);

    // Mark the occupancy grid as occupied for this event
    this._markOccupied(month, startDay, 1, colSpan, swimLane);

    return new EventPosition(month, startDay, 1, colSpan, swimLane);
  }

  /**
   * Calculate position for events spanning multiple months
   * @param {object} event - The event to calculate position for
   * @param {number} startMonth - The start month index
   * @param {number} startDay - The start day of week
   * @param {number} endMonth - The end month index
   * @param {number} endDay - The end day of week
   * @returns {EventPosition} The calculated position
   */
  _calculateMultiMonthPosition(event, startMonth, startDay, endMonth, endDay) {
    // We'll treat this as multiple event segments, one per month

    // For public holidays, use the special swim lane
    if (event.isPublicHoliday) {
      const swimLane = this.holidayLane;

      // First month (partial)
      const firstMonthColSpan = 7 - startDay;
      this._markOccupied(startMonth, startDay, 1, firstMonthColSpan, swimLane);

      // Middle months (full)
      for (let month = startMonth + 1; month < endMonth; month++) {
        this._markOccupied(month, 0, 1, 7, swimLane);
      }

      // Last month (partial)
      this._markOccupied(endMonth, 0, 1, endDay + 1, swimLane);

      return new EventPosition(
        startMonth,
        startDay,
        endMonth - startMonth + 1,
        0,
        swimLane,
      );
    }

    // Find a consistent swim lane that works across all affected months
    const swimLane = this._findConsistentSwimLane(
      startMonth,
      startDay,
      endMonth,
      endDay,
    );

    // Mark all affected cells as occupied
    // First month (partial)
    const firstMonthColSpan = 7 - startDay;
    this._markOccupied(startMonth, startDay, 1, firstMonthColSpan, swimLane);

    // Middle months (full)
    for (let month = startMonth + 1; month < endMonth; month++) {
      this._markOccupied(month, 0, 1, 7, swimLane);
    }

    // Last month (partial)
    this._markOccupied(endMonth, 0, 1, endDay + 1, swimLane);

    // For multi-month events, colSpan is 0 since we handle it specially in rendering
    return new EventPosition(
      startMonth,
      startDay,
      endMonth - startMonth + 1,
      0,
      swimLane,
    );
  }

  /**
   * Find an available swim lane for an event
   * @param {number} rowStart - Starting row (month)
   * @param {number} colStart - Starting column (day)
   * @param {number} rowSpan - Number of rows (months) the event spans
   * @param {number} colSpan - Number of columns (days) the event spans
   * @returns {number} The first available swim lane
   */
  _findAvailableSwimLane(rowStart, colStart, rowSpan, colSpan) {
    // Check each swim lane
    for (let lane = 0; lane < this.maxSwimLanes; lane++) {
      let laneAvailable = true;

      // Check if all cells for this event are available in this swim lane
      for (let r = 0; r < rowSpan; r++) {
        for (let c = 0; c < colSpan; c++) {
          const row = rowStart + r;
          const col = (colStart + c) % 7;

          if (row < 0 || row >= 12 || this.occupancyGrid[row][col][lane]) {
            laneAvailable = false;
            break;
          }
        }

        if (!laneAvailable) break;
      }

      if (laneAvailable) {
        return lane;
      }
    }

    // If no lane is fully available, return the last lane as fallback
    return this.maxSwimLanes - 1;
  }

  /**
   * Find a consistent swim lane that works across multiple months
   * @param {number} startMonth - The start month index
   * @param {number} startDay - The start day of week
   * @param {number} endMonth - The end month index
   * @param {number} endDay - The end day of week
   * @returns {number} A swim lane that's available across all affected months
   */
  _findConsistentSwimLane(startMonth, startDay, endMonth, endDay) {
    // We need to find a lane that's available in all segments

    for (let lane = 0; lane < this.maxSwimLanes; lane++) {
      let laneAvailable = true;

      // Check first month (from startDay to end of week)
      for (let day = startDay; day < 7; day++) {
        if (this.occupancyGrid[startMonth][day][lane]) {
          laneAvailable = false;
          break;
        }
      }

      if (!laneAvailable) continue;

      // Check middle months (all days)
      for (let month = startMonth + 1; month < endMonth; month++) {
        for (let day = 0; day < 7; day++) {
          if (this.occupancyGrid[month][day][lane]) {
            laneAvailable = false;
            break;
          }
        }
        if (!laneAvailable) break;
      }

      if (!laneAvailable) continue;

      // Check last month (from start of week to endDay)
      for (let day = 0; day <= endDay; day++) {
        if (this.occupancyGrid[endMonth][day][lane]) {
          laneAvailable = false;
          break;
        }
      }

      if (laneAvailable) {
        return lane;
      }
    }

    // If no lane is fully available, return the last lane as fallback
    return this.maxSwimLanes - 1;
  }

  /**
   * Mark cells in the occupancy grid as occupied
   * @param {number} rowStart - Starting row (month)
   * @param {number} colStart - Starting column (day)
   * @param {number} rowSpan - Number of rows (months) the event spans
   * @param {number} colSpan - Number of columns (days) the event spans
   * @param {number} swimLane - The swim lane to mark as occupied
   */
  _markOccupied(rowStart, colStart, rowSpan, colSpan, swimLane) {
    for (let r = 0; r < rowSpan; r++) {
      for (let c = 0; c < colSpan; c++) {
        const row = rowStart + r;
        const col = (colStart + c) % 7;

        if (row >= 0 && row < 12 && col >= 0 && col < 7) {
          this.occupancyGrid[row][col][swimLane] = true;
        }
      }
    }
  }

  /**
   * Calculate the duration of an event in days
   * @param {Date|string} startDate - The start date of the event
   * @param {Date|string} endDate - The end date of the event
   * @returns {number} The duration in days
   */
  _calculateDurationInDays(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1; // Include both start and end days
  }

  /**
   * Reset the occupancy grid
   */
  resetOccupancyGrid() {
    this.occupancyGrid = Array(12)
      .fill()
      .map(() =>
        Array(7)
          .fill()
          .map(() => Array(5).fill(false)),
      );
  }

  /**
   * Test the calculator with various scenarios
   * @param {number} year - The year to test with
   * @returns {object} Test results
   */
  runTests(year) {
    // Create test events
    const testEvents = [
      // Single-day event
      {
        id: 'event1',
        title: 'Single Day Event',
        description: 'Test single day event',
        startDate: new Date(year, 0, 15), // Jan 15
        endDate: new Date(year, 0, 15), // Jan 15
        isRecurring: false,
        startsPM: false,
        endsAM: false,
        isPublicHoliday: false,
      },

      // Multi-day event within same month
      {
        id: 'event2',
        title: 'Multi-Day Event (Same Month)',
        description: 'Test multi-day event within month',
        startDate: new Date(year, 2, 10), // Mar 10
        endDate: new Date(year, 2, 15), // Mar 15
        isRecurring: false,
        startsPM: false,
        endsAM: false,
        isPublicHoliday: false,
      },

      // Event spanning across months
      {
        id: 'event3',
        title: 'Multi-Month Event',
        description: 'Test event spanning months',
        startDate: new Date(year, 4, 25), // May 25
        endDate: new Date(year, 5, 10), // Jun 10
        isRecurring: false,
        startsPM: false,
        endsAM: false,
        isPublicHoliday: false,
      },

      // Public holiday
      {
        id: 'event4',
        title: 'Public Holiday',
        description: 'Test public holiday',
        startDate: new Date(year, 0, 1), // Jan 1
        endDate: new Date(year, 0, 1), // Jan 1
        isRecurring: false,
        startsPM: false,
        endsAM: false,
        isPublicHoliday: true,
      },

      // Overlapping events to test swim lanes
      {
        id: 'event5',
        title: 'Overlapping Event 1',
        description: 'Test overlapping events',
        startDate: new Date(year, 7, 5), // Aug 5
        endDate: new Date(year, 7, 7), // Aug 7
        isRecurring: false,
        startsPM: false,
        endsAM: false,
        isPublicHoliday: false,
      },
      {
        id: 'event6',
        title: 'Overlapping Event 2',
        description: 'Test overlapping events',
        startDate: new Date(year, 7, 6), // Aug 6
        endDate: new Date(year, 7, 8), // Aug 8
        isRecurring: false,
        startsPM: false,
        endsAM: false,
        isPublicHoliday: false,
      },
    ];

    // Calculate positions
    const results = this.calculatePositions(testEvents, year);

    return {
      events: testEvents,
      results: results,
      summary: {
        totalEvents: testEvents.length,
        positionsCalculated: results.length,
        validPositions: results.filter((e) => e.position !== null).length,
      },
    };
  }
}

// Export the classes
export { EventPosition, EventLayout, EventPositionCalculator };
