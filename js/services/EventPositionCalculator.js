/**
 * EventPositionCalculator.js - Advanced positioning algorithm for events in a year view
 * 
 * Handles complex positioning scenarios like events spanning weeks and months,
 * overlapping events, and various visual indicators to enhance readability.
 */

/**
 * EventPosition class representing the position of an event in the grid
 */
class EventPosition {
  /**
   * @param {number} rowStart - Month index (0-11)
   * @param {number} colStart - Day of week index (0-6)
   * @param {number} rowSpan - Number of months the event spans
   * @param {number} colSpan - Number of columns (days) within week the event spans
   * @param {number} swimLane - Vertical position within day cell (0-4)
   * @param {Object} [segments] - Segments information for complex multi-month events
   */
  constructor(rowStart, colStart, rowSpan, colSpan, swimLane, segments = null) {
    this.rowStart = rowStart;         // Month index (0-11)
    this.colStart = colStart;         // Day of week index (0-6)
    this.rowSpan = rowSpan;           // Number of months (rows) the event spans
    this.colSpan = colSpan;           // Number of days within the week
    this.swimLane = swimLane;         // Vertical position within day cell
    
    // Advanced properties for multi-segment events
    this.segments = segments;         // Information about segments for multi-week events
    
    // Visual indicators for rendering
    this.continuesLeft = false;       // Event continues from the previous week
    this.continuesRight = false;      // Event continues to the next week
    this.continuesUp = false;         // Event continues from the previous month
    this.continuesDown = false;       // Event continues to the next month
  }
}

/**
 * Segment represents a part of a multi-segment event
 */
class EventSegment {
  /**
   * @param {number} month - Month index (0-11)
   * @param {number} startDay - Start day of week (0-6)
   * @param {number} endDay - End day of week (0-6)
   * @param {boolean} isFirstSegment - Whether this is the first segment of the event
   * @param {boolean} isLastSegment - Whether this is the last segment of the event
   */
  constructor(month, startDay, endDay, isFirstSegment, isLastSegment) {
    this.month = month;
    this.startDay = startDay;
    this.endDay = endDay;
    this.isFirstSegment = isFirstSegment;
    this.isLastSegment = isLastSegment;
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
    // Basic event properties
    this.id = event.id;
    this.title = event.title;
    this.description = event.description;
    this.startDate = event.startDate instanceof Date ? event.startDate : new Date(event.startDate);
    this.endDate = event.endDate instanceof Date ? event.endDate : new Date(event.endDate);
    this.isRecurring = event.isRecurring;
    this.recurrencePattern = event.recurrencePattern;
    this.startsPM = event.startsPM;
    this.endsAM = event.endsAM;
    this.isPublicHoliday = event.isPublicHoliday;
    
    // Position information
    this.position = position;
    
    // Add formatted date information for display
    this.formattedDateRange = this._formatDateRange();
    
    // Track if event crosses week boundaries
    this.isMultiWeek = this._isMultiWeekEvent();
  }
  
  /**
   * Format date range for display in the event
   * @returns {string} Formatted date range
   * @private
   */
  _formatDateRange() {
    // Format options for short date display
    const options = { month: 'short', day: 'numeric' };
    
    const start = this.startDate.toLocaleDateString(undefined, options);
    const end = this.endDate.toLocaleDateString(undefined, options);
    
    // For single day events, just show the start date
    if (this.startDate.getTime() === this.endDate.getTime()) {
      return start;
    }
    
    return `${start} - ${end}`;
  }
  
  /**
   * Determine if the event spans multiple weeks
   * @returns {boolean} True if event spans multiple weeks
   * @private
   */
  _isMultiWeekEvent() {
    // Get week number of start and end dates
    const getWeekNumber = (date) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
      const week1 = new Date(d.getFullYear(), 0, 4);
      return 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
    };
    
    const startWeek = getWeekNumber(this.startDate);
    const endWeek = getWeekNumber(this.endDate);
    
    return startWeek !== endWeek;
  }
}

/**
 * EventPositionCalculator class for calculating optimal positions for events
 */
class EventPositionCalculator {
  /**
   * Create a new EventPositionCalculator
   * @param {Object} [options] - Configuration options
   * @param {number} [options.maxSwimLanes=5] - Maximum number of swim lanes per day
   * @param {number} [options.holidayLane=5] - Special swim lane for holidays
   */
  constructor(options = {}) {
    // Configuration
    this.maxSwimLanes = options.maxSwimLanes || 5;
    this.holidayLane = options.holidayLane || 5;
    
    // Year-specific data
    this.year = new Date().getFullYear();
    
    // Initialize the occupancy grid (12 months × 7 days × 5 swim lanes)
    this.occupancyGrid = this._createOccupancyGrid();
    
    // Track week boundaries for each month
    this.weekBoundaries = [];
    
    // Cache computed positions to prevent recalculation
    this._positionCache = new Map();
  }
  
  /**
   * Create a 3D occupancy grid for tracking event positions
   * @returns {Array} 3D occupancy grid
   * @private
   */
  _createOccupancyGrid() {
    return Array(12) // 12 months
      .fill()
      .map(() => 
        Array(7) // 7 days per week
          .fill()
          .map(() => 
            Array(this.maxSwimLanes) // Swim lanes per day
              .fill(false)
          )
      );
  }

  /**
   * Calculate positions for a list of events
   * @param {Array} events - List of events to calculate positions for
   * @param {number} year - The year for which to calculate positions
   * @returns {Array<EventLayout>} List of events with calculated positions
   */
  calculatePositions(events, year) {
    if (!events || events.length === 0) {
      return [];
    }
    
    // Update year if provided
    if (year && this.year !== year) {
      this.year = year;
      this._positionCache.clear();
    }

    // Reset occupancy grid
    this.resetOccupancyGrid();
    
    // Precalculate week boundaries for the year
    this._calculateWeekBoundaries();
    
    // Clean up cache for events that no longer exist
    this._cleanupCache(events);
    
    // Sort events by priority: holidays first, then by duration (longest first), then by start date
    const sortedEvents = [...events].sort((a, b) => {
      // Public holidays take precedence
      if (a.isPublicHoliday && !b.isPublicHoliday) return -1;
      if (!a.isPublicHoliday && b.isPublicHoliday) return 1;
      
      // Then sort by duration
      const durationA = this._calculateDurationInDays(a.startDate, a.endDate);
      const durationB = this._calculateDurationInDays(b.startDate, b.endDate);
      
      if (durationA !== durationB) {
        return durationB - durationA; // Descending by duration
      }
      
      // If same duration, sort by start date
      return new Date(a.startDate) - new Date(b.startDate);
    });

    // Calculate positions for each event
    const eventLayouts = sortedEvents.map(event => {
      // Check if we already calculated position for this event
      const cacheKey = this._getEventCacheKey(event);
      
      // Check if event has changed since it was cached
      if (this._positionCache.has(cacheKey) && !this._hasEventChanged(event, cacheKey)) {
        return this._positionCache.get(cacheKey);
      }
      
      // Calculate new position
      const position = this._calculateOptimalPosition(event);
      const layout = new EventLayout(event, position);
      
      // Cache the result along with a hash of the event properties
      this._positionCache.set(cacheKey, layout);
      this._positionCache.set(`${cacheKey}_hash`, this._computeEventHash(event));
      
      return layout;
    });

    return eventLayouts;
  }
  
  /**
   * Generate a cache key for an event
   * @param {Object} event - The event object
   * @returns {string} Cache key
   * @private
   */
  _getEventCacheKey(event) {
    return `${event.id}_${this.year}`;
  }
  
  /**
   * Compute a hash of event properties to detect changes
   * @param {Object} event - The event object
   * @returns {string} Hash representing the event state
   * @private
   */
  _computeEventHash(event) {
    // Create a string of the event's critical properties
    const startDateStr = event.startDate instanceof Date ? 
      event.startDate.toISOString() : new Date(event.startDate).toISOString();
    const endDateStr = event.endDate instanceof Date ? 
      event.endDate.toISOString() : new Date(event.endDate).toISOString();
    
    // Include properties that would affect the position calculation
    const criticalProps = [
      event.id,
      startDateStr,
      endDateStr,
      event.isPublicHoliday ? 1 : 0,
      event.isRecurring ? 1 : 0
    ];
    
    // Simple hash is just a string of these properties
    return criticalProps.join('_');
  }
  
  /**
   * Check if an event has changed since it was cached
   * @param {Object} event - The event to check
   * @param {string} cacheKey - The cache key for this event
   * @returns {boolean} True if the event has changed
   * @private
   */
  _hasEventChanged(event, cacheKey) {
    // If we don't have a hash for this event, it has changed
    if (!this._positionCache.has(`${cacheKey}_hash`)) {
      return true;
    }
    
    // Compare the current hash with the stored hash
    const storedHash = this._positionCache.get(`${cacheKey}_hash`);
    const currentHash = this._computeEventHash(event);
    
    return storedHash !== currentHash;
  }
  
  /**
   * Remove cached entries for events that no longer exist
   * @param {Array} currentEvents - Current list of events
   * @private
   */
  _cleanupCache(currentEvents) {
    // Create a set of current event IDs for quick lookup
    const currentEventIds = new Set(currentEvents.map(event => event.id));
    
    // Get all cache keys that are for event positions
    const cacheKeys = Array.from(this._positionCache.keys())
      .filter(key => !key.endsWith('_hash'));
    
    // Delete cache entries for events that no longer exist
    for (const key of cacheKeys) {
      // Extract event ID from the cache key
      const eventId = key.split('_')[0];
      
      if (!currentEventIds.has(eventId)) {
        // Remove both the position and hash entries
        this._positionCache.delete(key);
        this._positionCache.delete(`${key}_hash`);
      }
    }
  }
  
  /**
   * Calculate week boundaries for each month in the year
   * @private
   */
  _calculateWeekBoundaries() {
    this.weekBoundaries = [];
    
    for (let month = 0; month < 12; month++) {
      // Get the first day of the month
      const firstDate = new Date(this.year, month, 1);
      // Get the last day of the month
      const lastDate = new Date(this.year, month + 1, 0);
      
      // Calculate week boundaries within this month
      const boundaries = [];
      
      // First day of week (0-6, where 0 is Sunday, adjust to Monday start)
      let firstDayOfWeek = firstDate.getDay() - 1;
      if (firstDayOfWeek < 0) firstDayOfWeek = 6; // Sunday becomes 6
      
      // Last day of week (0-6)
      let lastDayOfWeek = lastDate.getDay() - 1;
      if (lastDayOfWeek < 0) lastDayOfWeek = 6;
      
      // Get number of days in month
      const daysInMonth = lastDate.getDate();
      
      // Initialize boundaries
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(this.year, month, day);
        let dayOfWeek = date.getDay() - 1;
        if (dayOfWeek < 0) dayOfWeek = 6;
        
        // If first day of week or first day of month
        if (dayOfWeek === 0 || day === 1) {
          boundaries.push({ 
            start: day, 
            startDayOfWeek: dayOfWeek,
            isMonthStart: day === 1
          });
        }
        
        // If last day of week or last day of month
        if (dayOfWeek === 6 || day === daysInMonth) {
          // Update the last entry
          const lastEntry = boundaries[boundaries.length - 1];
          lastEntry.end = day;
          lastEntry.endDayOfWeek = dayOfWeek;
          lastEntry.isMonthEnd = day === daysInMonth;
        }
      }
      
      this.weekBoundaries[month] = boundaries;
    }
  }

  /**
   * Calculate the optimal position for an event
   * @param {object} event - The event to calculate position for
   * @returns {EventPosition} The calculated position
   * @private
   */
  _calculateOptimalPosition(event) {
    // Ensure dates are Date objects
    const startDate = new Date(event.startDate);
    const endDate = new Date(event.endDate);

    // Filter events to only this year
    const yearStart = new Date(this.year, 0, 1);
    const yearEnd = new Date(this.year, 11, 31, 23, 59, 59, 999);
    
    // Adjust dates if they're outside this year
    const adjustedStartDate = new Date(Math.max(startDate.getTime(), yearStart.getTime()));
    const adjustedEndDate = new Date(Math.min(endDate.getTime(), yearEnd.getTime()));
    
    // Get month and day info
    const startMonth = adjustedStartDate.getMonth();
    const startDate_ = adjustedStartDate.getDate();
    const startDay = this._getDayOfWeek(adjustedStartDate);
    
    const endMonth = adjustedEndDate.getMonth();
    const endDate_ = adjustedEndDate.getDate();
    const endDay = this._getDayOfWeek(adjustedEndDate);
    
    // Calculate row span
    const rowSpan = endMonth - startMonth + 1;
    
    // Special case: Public holidays always go in the holiday swim lane
    if (event.isPublicHoliday) {
      // For simple single-day holidays
      if (adjustedStartDate.getTime() === adjustedEndDate.getTime()) {
        return new EventPosition(
          startMonth,
          startDay,
          1,
          1,
          this.holidayLane
        );
      }
      
      // For multi-day holidays, use segments for cleaner display
      const segments = this._calculateEventSegments(
        startMonth, startDate_, startDay,
        endMonth, endDate_, endDay
      );
      
      // Create position for a multi-segment holiday
      const position = new EventPosition(
        startMonth,
        startDay,
        rowSpan,
        0, // Will be calculated per segment
        this.holidayLane,
        segments
      );
      
      // Mark holiday segments as occupied
      this._markSegmentsOccupied(segments, this.holidayLane);
      
      return position;
    }
    
    // Handle single-month events
    if (rowSpan === 1) {
      return this._calculateSameMonthPosition(
        event, startMonth, startDate_, startDay, endDate_, endDay
      );
    }
    
    // Handle events spanning multiple months
    return this._calculateMultiMonthPosition(
      event, startMonth, startDate_, startDay, endMonth, endDate_, endDay
    );
  }

  /**
   * Calculate position for events within the same month
   * @param {object} event - The event to calculate position for
   * @param {number} month - The month index
   * @param {number} startDate - The start date (1-31)
   * @param {number} startDay - The start day of week (0-6)
   * @param {number} endDate - The end date (1-31)
   * @param {number} endDay - The end day of week (0-6)
   * @returns {EventPosition} The calculated position
   * @private
   */
  _calculateSameMonthPosition(event, month, startDate, startDay, endDate, endDay) {
    // Get the day span (number of days)
    const daySpan = this._getDaySpan(month, startDate, endDate);
    
    // Check if event spans multiple weeks
    if (daySpan > 7 || (startDay > endDay && daySpan > 1)) {
      // Multi-week event within same month
      const segments = this._calculateEventSegments(
        month, startDate, startDay,
        month, endDate, endDay
      );
      
      // Find available swim lane for all segments
      const swimLane = this._findAvailableSwimLaneForSegments(segments);
      
      // Mark occupied
      this._markSegmentsOccupied(segments, swimLane);
      
      // Create position with segments
      const position = new EventPosition(
        month,
        startDay,
        1,
        0, // Will be calculated per segment
        swimLane,
        segments
      );
      
      // Set continuation flags
      if (segments.length > 1) {
        position.continuesRight = true;
      }
      
      return position;
    }
    
    // Simple case: event stays within one week
    let colSpan;
    
    if (endDay >= startDay) {
      colSpan = endDay - startDay + 1;
    } else {
      // Wrap around the week
      colSpan = 7 - startDay + endDay + 1;
    }
    
    // Find first available swim lane
    const swimLane = this._findAvailableSwimLane(month, startDay, 1, colSpan);
    
    // Mark the occupancy grid as occupied
    this._markOccupied(month, startDay, 1, colSpan, swimLane);
    
    // Create the position
    return new EventPosition(month, startDay, 1, colSpan, swimLane);
  }

  /**
   * Calculate position for events spanning multiple months
   * @param {object} event - The event to calculate position for
   * @param {number} startMonth - The start month index
   * @param {number} startDate - The start date (1-31)
   * @param {number} startDay - The start day of week (0-6)
   * @param {number} endMonth - The end month index
   * @param {number} endDate - The end date (1-31)
   * @param {number} endDay - The end day of week (0-6)
   * @returns {EventPosition} The calculated position
   * @private
   */
  _calculateMultiMonthPosition(event, startMonth, startDate, startDay, endMonth, endDate, endDay) {
    // Calculate all segments across multiple months
    const segments = this._calculateEventSegments(
      startMonth, startDate, startDay,
      endMonth, endDate, endDay
    );
    
    // Find consistent swim lane for all segments
    const swimLane = this._findAvailableSwimLaneForSegments(segments);
    
    // Mark all segments as occupied
    this._markSegmentsOccupied(segments, swimLane);
    
    // Create position with continuation flags
    const position = new EventPosition(
      startMonth,
      startDay,
      endMonth - startMonth + 1,
      0, // Will be calculated per segment
      swimLane,
      segments
    );
    
    // Set continuation flags
    position.continuesDown = endMonth > startMonth;
    position.continuesRight = segments.length > 1 || (endDay > startDay);
    
    return position;
  }
  
  /**
   * Calculate all segments for an event that might span weeks and/or months
   * @param {number} startMonth - The start month index
   * @param {number} startDate - The start date (1-31)
   * @param {number} startDay - The start day of week (0-6)
   * @param {number} endMonth - The end month index
   * @param {number} endDate - The end date (1-31)
   * @param {number} endDay - The end day of week (0-6)
   * @returns {Array<EventSegment>} Array of segments
   * @private
   */
  _calculateEventSegments(startMonth, startDate, startDay, endMonth, endDate, endDay) {
    const segments = [];
    
    // Process each month
    for (let month = startMonth; month <= endMonth; month++) {
      // Get the boundaries for this month
      const boundaries = this.weekBoundaries[month];
      
      // Find weeks that contain our event
      for (let i = 0; i < boundaries.length; i++) {
        const boundary = boundaries[i];
        
        // Skip weeks before our event starts or after it ends
        if (month === startMonth && boundary.end < startDate) continue;
        if (month === endMonth && boundary.start > endDate) continue;
        
        // Create a segment for this week
        let segStartDay, segEndDay;
        
        // Calculate segment start day
        if (month === startMonth && boundary.start <= startDate) {
          // This is the first week of the event
          segStartDay = startDay;
        } else {
          // Not the first week, start at the beginning of week
          segStartDay = boundary.startDayOfWeek;
        }
        
        // Calculate segment end day
        if (month === endMonth && boundary.end >= endDate) {
          // This is the last week of the event
          segEndDay = endDay;
        } else {
          // Not the last week, end at the end of week
          segEndDay = boundary.endDayOfWeek;
        }
        
        // Determine if this is the first or last segment of the event
        const isFirstSegment = month === startMonth && boundary.start <= startDate;
        const isLastSegment = month === endMonth && boundary.end >= endDate;
        
        // Create segment
        const segment = new EventSegment(
          month,
          segStartDay,
          segEndDay,
          isFirstSegment,
          isLastSegment
        );
        
        segments.push(segment);
      }
    }
    
    return segments;
  }
  
  /**
   * Find a consistent swim lane that works for all segments
   * @param {Array<EventSegment>} segments - The segments to check
   * @returns {number} The most optimal available swim lane
   * @private
   */
  _findAvailableSwimLaneForSegments(segments) {
    // First check if there are any completely free lanes
    const availableLanes = this._getAvailableLanesForSegments(segments);
    
    if (availableLanes.length > 0) {
      // Return the first completely free lane
      return availableLanes[0];
    }
    
    // If no completely free lanes, find the lane with least conflicts
    return this._findOptimalLaneWithLeastConflicts(segments);
  }
  
  /**
   * Get all completely available lanes for segments
   * @param {Array<EventSegment>} segments - The segments to check
   * @returns {Array<number>} Array of available lane indices
   * @private
   */
  _getAvailableLanesForSegments(segments) {
    const availableLanes = [];
    
    // Test each lane
    for (let lane = 0; lane < this.maxSwimLanes; lane++) {
      let laneAvailable = true;
      
      // Check if this lane is available for all segments
      for (const segment of segments) {
        const { month, startDay, endDay } = segment;
        
        // Calculate the column span
        let colSpan;
        if (endDay >= startDay) {
          colSpan = endDay - startDay + 1;
        } else {
          colSpan = 7 - startDay + endDay + 1;
        }
        
        // Check if this segment can fit in this lane
        for (let day = 0; day < colSpan; day++) {
          const col = (startDay + day) % 7;
          
          if (this.occupancyGrid[month][col][lane]) {
            laneAvailable = false;
            break;
          }
        }
        
        if (!laneAvailable) break;
      }
      
      if (laneAvailable) {
        availableLanes.push(lane);
      }
    }
    
    return availableLanes;
  }
  
  /**
   * Find the optimal lane with least conflicts when no fully available lane exists
   * @param {Array<EventSegment>} segments - The segments to check
   * @returns {number} The lane index with least conflicts
   * @private
   */
  _findOptimalLaneWithLeastConflicts(segments) {
    const laneScores = new Array(this.maxSwimLanes).fill(0);
    
    // Calculate a score for each lane based on occupancy
    for (let lane = 0; lane < this.maxSwimLanes; lane++) {
      let conflictCount = 0;
      let totalCells = 0;
      
      // Check conflicts for each segment
      for (const segment of segments) {
        const { month, startDay, endDay } = segment;
        
        // Calculate the column span
        let colSpan;
        if (endDay >= startDay) {
          colSpan = endDay - startDay + 1;
        } else {
          colSpan = 7 - startDay + endDay + 1;
        }
        
        totalCells += colSpan;
        
        // Count conflicts
        for (let day = 0; day < colSpan; day++) {
          const col = (startDay + day) % 7;
          
          if (this.occupancyGrid[month][col][lane]) {
            conflictCount++;
          }
        }
      }
      
      // Score is the percentage of cells that are conflict-free
      laneScores[lane] = 1 - (conflictCount / totalCells);
    }
    
    // Find the lane with the highest score (least conflicts)
    let bestLane = 0;
    let bestScore = laneScores[0];
    
    for (let lane = 1; lane < this.maxSwimLanes; lane++) {
      // Prefer lower lanes when scores are equal
      if (laneScores[lane] > bestScore) {
        bestLane = lane;
        bestScore = laneScores[lane];
      }
    }
    
    // If all lanes have significant conflicts, return the last lane as fallback
    if (bestScore < 0.5) {
      return this.maxSwimLanes - 1;
    }
    
    return bestLane;
  }

  /**
   * Find an available swim lane for an event
   * @param {number} month - The month index
   * @param {number} startDay - The start day of week (0-6)
   * @param {number} rowSpan - Number of rows (months) the event spans
   * @param {number} colSpan - Number of columns (days) the event spans
   * @returns {number} The first available swim lane
   * @private
   */
  _findAvailableSwimLane(month, startDay, rowSpan, colSpan) {
    // Try each swim lane
    for (let lane = 0; lane < this.maxSwimLanes; lane++) {
      let laneAvailable = true;
      
      // Check if this lane is available for all cells
      for (let c = 0; c < colSpan; c++) {
        const col = (startDay + c) % 7;
        
        if (this.occupancyGrid[month][col][lane]) {
          laneAvailable = false;
          break;
        }
      }
      
      if (laneAvailable) {
        return lane;
      }
    }
    
    // If no lane is available, use the last lane
    return this.maxSwimLanes - 1;
  }
  
  /**
   * Mark all cells in the given segments as occupied
   * @param {Array<EventSegment>} segments - The segments to mark
   * @param {number} swimLane - The swim lane to mark
   * @private
   */
  _markSegmentsOccupied(segments, swimLane) {
    for (const segment of segments) {
      const { month, startDay, endDay } = segment;
      
      // Calculate the column span
      let colSpan;
      if (endDay >= startDay) {
        colSpan = endDay - startDay + 1;
      } else {
        colSpan = 7 - startDay + endDay + 1;
      }
      
      // Mark as occupied
      this._markOccupied(month, startDay, 1, colSpan, swimLane);
    }
  }

  /**
   * Mark cells in the occupancy grid as occupied
   * @param {number} month - Month index
   * @param {number} startDay - Starting day of week (0-6)
   * @param {number} rowSpan - Number of rows (months) to mark
   * @param {number} colSpan - Number of columns (days) to mark
   * @param {number} swimLane - The swim lane to mark
   * @private
   */
  _markOccupied(month, startDay, rowSpan, colSpan, swimLane) {
    for (let c = 0; c < colSpan; c++) {
      const col = (startDay + c) % 7;
      
      if (month >= 0 && month < 12 && col >= 0 && col < 7) {
        this.occupancyGrid[month][col][swimLane] = true;
      }
    }
  }
  
  /**
   * Get the day of week (0-6, where 0 is Monday, 6 is Sunday)
   * @param {Date} date - The date
   * @returns {number} Day of week (0-6)
   * @private
   */
  _getDayOfWeek(date) {
    // Convert from JS day (0=Sunday, 6=Saturday) to our format (0=Monday, 6=Sunday)
    let day = date.getDay() - 1;
    if (day < 0) day = 6;
    return day;
  }
  
  /**
   * Get the number of days between two dates in the same month
   * @param {number} month - The month index
   * @param {number} startDate - The start date (1-31)
   * @param {number} endDate - The end date (1-31)
   * @returns {number} Number of days
   * @private
   */
  _getDaySpan(month, startDate, endDate) {
    return endDate - startDate + 1;
  }

  /**
   * Calculate the duration of an event in days
   * @param {Date|string} startDate - The start date of the event
   * @param {Date|string} endDate - The end date of the event
   * @returns {number} The duration in days
   * @private
   */
  _calculateDurationInDays(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Reset time components to ensure accurate day calculation
    const startNormalized = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate()
    );
    
    const endNormalized = new Date(
      end.getFullYear(),
      end.getMonth(),
      end.getDate()
    );
    
    const diffTime = Math.abs(endNormalized - startNormalized);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays + 1; // Include both start and end dates
  }

  /**
   * Reset the occupancy grid
   */
  resetOccupancyGrid() {
    this.occupancyGrid = this._createOccupancyGrid();
  }
  
  /**
   * Clear the position cache
   */
  clearCache() {
    this._positionCache.clear();
  }
  
  /**
   * Get a formatted date string for display
   * @param {Date} date - The date to format
   * @returns {string} Formatted date
   */
  formatDate(date) {
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric'
    });
  }

  /**
   * Test the calculator with various scenarios including complex overlaps
   * @param {number} year - The year to test with
   * @returns {object} Test results with event layouts
   */
  runTests(year) {
    // Create test events with various patterns
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
      
      // Event spanning a full week
      {
        id: 'event7',
        title: 'Full Week Event',
        description: 'Test event spanning an entire week',
        startDate: new Date(year, 9, 4), // Oct 4 (Monday)
        endDate: new Date(year, 9, 10), // Oct 10 (Sunday)
        isRecurring: false,
        startsPM: false,
        endsAM: false,
        isPublicHoliday: false,
      },
      
      // Complex multi-month event with week overlaps
      {
        id: 'event8',
        title: 'Complex Multi-Month Event',
        description: 'Test complex event spanning weeks and months',
        startDate: new Date(year, 10, 25), // Nov 25
        endDate: new Date(year, 11, 15), // Dec 15
        isRecurring: false,
        startsPM: false,
        endsAM: false,
        isPublicHoliday: false,
      },
      
      // Multi-day public holiday
      {
        id: 'event9',
        title: 'Multi-Day Holiday',
        description: 'Test multi-day public holiday',
        startDate: new Date(year, 11, 24), // Dec 24
        endDate: new Date(year, 11, 26), // Dec 26
        isRecurring: false,
        startsPM: false,
        endsAM: false,
        isPublicHoliday: true,
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
        segmentedEvents: results.filter((e) => e.position.segments !== null).length,
      },
    };
  }
}

// Export the classes
export { EventPosition, EventSegment, EventLayout, EventPositionCalculator };
