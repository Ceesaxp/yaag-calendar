// components/YearPlannerGrid.js
import { EventPositionCalculator } from '../services/EventPositionCalculator.js';

export class YearPlannerGrid extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._year = new Date().getFullYear();
    this._events = [];
    this._layoutEvents = [];
    this._positionCalculator = new EventPositionCalculator();
    this._initShadowDom();
  }

  // Lifecycle callbacks
  connectedCallback() {
    this._render();
    this._setupEventListeners();
  }

  // Public properties
  set year(value) {
    this._year = parseInt(value, 10);
    this._recalculateLayout();
    this._render();
  }

  get year() {
    return this._year;
  }

  set events(value) {
    if (!Array.isArray(value)) {
      throw new Error('Events must be an array');
    }

    this._events = value;
    this._recalculateLayout();
    this._render();
  }

  get events() {
    return this._events;
  }

  // Private methods
  _initShadowDom() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        }

        .year-grid {
          display: grid;
          grid-template-columns: 100px repeat(35, 1fr);
          grid-template-rows: 40px repeat(12, 80px);
          gap: 1px;
          background-color: #e0e0e0;
          border: 1px solid #e0e0e0;
        }

        .header-cell, .month-cell, .day-cell {
          background-color: white;
          padding: 4px;
          position: relative;
        }

        .header-cell {
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          background-color: #f5f5f5;
        }

        .month-cell {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          font-weight: bold;
          background-color: #f5f5f5;
        }

        .day-cell {
          cursor: pointer;
          position: relative;
          overflow: visible;
        }

        .day-cell:hover {
          background-color: #f9f9f9;
        }

        .day-number {
          position: absolute;
          top: 2px;
          right: 5px;
          font-size: 0.8em;
          color: #666;
        }

        .event {
          position: absolute;
          left: 0;
          right: 0;
          font-size: 0.7em;
          padding: 2px 4px;
          margin: 1px;
          border-radius: 3px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          cursor: pointer;
          z-index: 10;
        }

        .event.holiday {
          background-color: #ffecb3;
          border-left: 2px solid #ffc107;
        }

        .event.regular {
          background-color: #e3f2fd;
          border-left: 2px solid #2196f3;
        }

        /* New styles for multi-segment events */
        .event-segment {
          position: absolute;
          font-size: 0.7em;
          padding: 2px 4px;
          margin: 1px;
          border-radius: 3px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          cursor: pointer;
          z-index: 10;
          box-sizing: border-box;
          transition: all 0.15s ease-in-out;
        }

        .event-segment.holiday {
          background-color: #ffecb3;
          border-left: 2px solid #ffc107;
        }

        .event-segment.regular {
          background-color: #e3f2fd;
          border-left: 2px solid #2196f3;
        }
        
        /* Middle segment styling - clearer indication */
        .event-segment.middle-segment {
          background-image: linear-gradient(to right, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 10%, rgba(255,255,255,0) 90%, rgba(255,255,255,0.1) 100%);
        }

        /* Continuation indicators - enhanced */
        .event-segment.continues-left {
          border-top-left-radius: 0;
          border-bottom-left-radius: 0;
          border-left: none;
          margin-left: 0;
          padding-left: 4px;
        }

        .event-segment.continues-left::before {
          content: "◀";
          position: absolute;
          left: -4px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 0.7em;
          color: rgba(0,0,0,0.5);
          text-shadow: 0 0 2px rgba(255,255,255,0.8);
        }

        .event-segment.continues-right {
          border-top-right-radius: 0;
          border-bottom-right-radius: 0;
          margin-right: 0;
          padding-right: 4px;
        }

        .event-segment.continues-right::after {
          content: "▶";
          position: absolute;
          right: -4px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 0.7em;
          color: rgba(0,0,0,0.5);
          text-shadow: 0 0 2px rgba(255,255,255,0.8);
        }

        .event-segment.continues-up::before {
          content: "↑";
          position: absolute;
          left: 2px;
          top: -1px;
          font-size: 0.8em;
          color: rgba(0,0,0,0.5);
          text-shadow: 0 0 2px rgba(255,255,255,0.8);
        }

        .event-segment.continues-down::after {
          content: "↓";
          position: absolute;
          right: 2px;
          bottom: -1px;
          font-size: 0.8em;
          color: rgba(0,0,0,0.5);
          text-shadow: 0 0 2px rgba(255,255,255,0.8);
        }
        
        /* Month boundary indicators - new */
        .event-segment.month-boundary-start {
          border-left-width: 3px;
          border-left-style: dashed;
        }
        
        .event-segment.month-boundary-end {
          border-right-width: 3px;
          border-right-style: dashed;
          border-right-color: inherit;
        }

        /* Hover effects for multi-segment events - enhanced */
        .event-segment[data-event-id]:hover,
        .event-segment[data-event-id].hover {
          filter: brightness(1.05);
          box-shadow: 0 0 5px rgba(0, 0, 0, 0.2);
          z-index: 20;
          transform: translateY(-1px);
        }
        
        /* Connected segments highlight */
        .event-segment[data-event-id].hover-connected {
          outline: 1px solid rgba(0, 0, 0, 0.3);
          z-index: 19;
        }

        .event-date-range {
          font-size: 0.9em;
          color: rgba(0,0,0,0.6);
          margin-left: 3px;
        }

        .event-indicators {
          display: flex;
          gap: 2px;
          font-size: 0.7em;
        }

        .year-selector {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
        }

        .year-selector button {
          background: none;
          border: none;
          font-size: 1.2em;
          cursor: pointer;
        }

        .year-value {
          margin: 0 10px;
          font-weight: bold;
        }
      </style>
      <div class="year-grid" id="grid"></div>
    `;
  }

  _render() {
    const grid = this.shadowRoot.getElementById('grid');
    grid.innerHTML = '';

    this._renderHeaders(grid);
    this._renderDayCells(grid);
    this._renderEvents(grid);
  }

  _renderHeaders(grid) {
    // Year selector cell
    const yearCell = document.createElement('div');
    yearCell.className = 'header-cell';
    yearCell.innerHTML = `
      <div class="year-selector">
        <button id="prev-year">◀</button>
        <span class="year-value">${this._year}</span>
        <button id="next-year">▶</button>
      </div>
    `;
    grid.appendChild(yearCell);

    // Weekday headers
    const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    for (let week = 0; week < 5; week++) {
      for (let day = 0; day < 7; day++) {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'header-cell';
        dayHeader.textContent = weekdays[day];
        grid.appendChild(dayHeader);
      }
    }

    // Month cells
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    months.forEach((month) => {
      const monthCell = document.createElement('div');
      monthCell.className = 'month-cell';
      monthCell.textContent = month;
      grid.appendChild(monthCell);
    });
  }

  _renderDayCells(grid) {
    for (let month = 0; month < 12; month++) {
      // Get the first day of the month
      const firstDay = new Date(this._year, month, 1);
      // Get the last day of the month
      const lastDay = new Date(this._year, month + 1, 0);

      // Get day of week of first day (0 = Sunday, converting to 0 = Monday)
      let firstDayOfWeek = firstDay.getDay() - 1;
      if (firstDayOfWeek < 0) firstDayOfWeek = 6; // Sunday becomes 6

      // Create day cells for this month
      for (let weekIndex = 0; weekIndex < 5; weekIndex++) {
        for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
          const dayCell = document.createElement('div');
          dayCell.className = 'day-cell';

          // Calculate the day number
          const dayOffset = weekIndex * 7 + dayOfWeek - firstDayOfWeek;
          const dayNumber = dayOffset + 1;

          // Only show day numbers for valid days in the month
          if (dayNumber > 0 && dayNumber <= lastDay.getDate()) {
            dayCell.innerHTML = `<div class="day-number">${dayNumber}</div>`;

            // Store data attributes for identifying the cell
            dayCell.dataset.month = month;
            dayCell.dataset.day = dayNumber;

            // Add click event to emit day-click custom event
            dayCell.addEventListener('click', (e) => {
              // Only trigger if the click was directly on the cell (not on an event)
              if (e.target === dayCell || e.target.className === 'day-number') {
                const clickEvent = new CustomEvent('day-click', {
                  detail: {
                    date: new Date(this._year, month, dayNumber),
                    month: month,
                    day: dayNumber,
                  },
                  bubbles: true,
                  composed: true,
                });
                this.dispatchEvent(clickEvent);
              }
            });
          } else {
            // Empty cell for days outside the month
            dayCell.dataset.empty = true;
          }

          grid.appendChild(dayCell);
        }
      }
    }
  }

  _renderEvents(grid) {
    if (!this._layoutEvents || this._layoutEvents.length === 0) return;

    // Store all created event segments by event ID for hover effect
    const eventSegments = new Map();

    this._layoutEvents.forEach((layoutEvent) => {
      const eventId = layoutEvent.id;
      const position = layoutEvent.position;
      
      // Create a list to store all segments for this event
      if (!eventSegments.has(eventId)) {
        eventSegments.set(eventId, []);
      }
      
      // Get all cells in the grid
      const allDayCells = Array.from(grid.querySelectorAll('.day-cell'))
        .filter(cell => !cell.dataset.empty);
      
      // Check if we have segments for multi-week or multi-month events
      if (position.segments && position.segments.length > 0) {
        // Render each segment separately
        position.segments.forEach(segment => {
          // Find the cells for this segment
          const segmentCells = allDayCells.filter(cell => {
            const month = parseInt(cell.dataset.month, 10);
            const day = parseInt(cell.dataset.day, 10);
            
            // Skip if not in the right month
            if (month !== segment.month) return false;
            
            // Get day of week for this cell
            const date = new Date(this._year, month, day);
            const dayOfWeek = this._getDayOfWeek(date);
            
            // Check if the day falls within the segment's day range
            if (segment.startDay <= segment.endDay) {
              // Normal case: startDay to endDay
              return dayOfWeek >= segment.startDay && dayOfWeek <= segment.endDay;
            } else {
              // Wrapped around the week: startDay to end of week OR start of week to endDay
              return dayOfWeek >= segment.startDay || dayOfWeek <= segment.endDay;
            }
          });
          
          if (segmentCells.length === 0) return;
          
          // Create segment element
          this._createEventSegment(
            grid,
            layoutEvent,
            position,
            segment,
            segmentCells,
            eventSegments.get(eventId)
          );
        });
      } else {
        // Simple single-day or single-week event
        // Find the cells that match this event
        const eventCells = allDayCells.filter(cell => {
          const month = parseInt(cell.dataset.month, 10);
          const day = parseInt(cell.dataset.day, 10);
          const date = new Date(this._year, month, day);
          
          // Check if this date is within the event's range
          return date >= layoutEvent.startDate && date <= layoutEvent.endDate;
        });
        
        if (eventCells.length === 0) return;
        
        // For multi-day events that don't cross week boundaries
        if (eventCells.length > 1) {
          // Group cells by week
          const weekGroups = this._groupCellsByWeek(eventCells);
          
          // Create an event element for each week group
          weekGroups.forEach(group => {
            this._createSimpleEventSpan(
              layoutEvent,
              position,
              group,
              eventSegments.get(eventId)
            );
          });
        } else {
          // Single day event
          this._createSimpleEventSpan(
            layoutEvent,
            position,
            eventCells,
            eventSegments.get(eventId)
          );
        }
      }
    });
    
    // Enhance hover effect to highlight all segments of the same event with better coordination
    eventSegments.forEach((segments, eventId) => {
      // Use debounced approach to reduce flickering
      let hoverTimeout;
      const hoverDelay = 50; // ms
      
      segments.forEach(segment => {
        // Handle mouse enter with delay
        segment.addEventListener('mouseenter', () => {
          clearTimeout(hoverTimeout);
          
          // Add immediate class to hovered segment
          segment.classList.add('hover');
          
          // Add connected class to all related segments with slight delay
          hoverTimeout = setTimeout(() => {
            segments.forEach(s => {
              if (s !== segment) {
                s.classList.add('hover-connected');
              }
            });
          }, hoverDelay);
        });
        
        // Handle mouse leave
        segment.addEventListener('mouseleave', () => {
          clearTimeout(hoverTimeout);
          
          // Remove immediate class from hovered segment
          segment.classList.remove('hover');
          
          // Remove connected class from all segments with delay
          hoverTimeout = setTimeout(() => {
            segments.forEach(s => {
              s.classList.remove('hover-connected');
            });
          }, hoverDelay);
        });
        
        // Add keyboard accessibility
        segment.setAttribute('tabindex', '0');
        
        // Add keyboard focus events for accessibility
        segment.addEventListener('focus', () => {
          segment.classList.add('hover');
          segments.forEach(s => {
            if (s !== segment) {
              s.classList.add('hover-connected');
            }
          });
        });
        
        segment.addEventListener('blur', () => {
          segment.classList.remove('hover');
          segments.forEach(s => {
            s.classList.remove('hover-connected');
          });
        });
      });
    });
  }
  
  /**
   * Create a segment for a multi-week or multi-month event
   * @param {HTMLElement} grid - The grid container
   * @param {Object} layoutEvent - The event layout data
   * @param {Object} position - The position data
   * @param {Object} segment - The segment data
   * @param {Array} cells - The cells for this segment
   * @param {Array} segmentList - List to store all segments for this event
   * @private
   */
  _createEventSegment(grid, layoutEvent, position, segment, cells, segmentList) {
    // Sort cells by position in the grid
    cells.sort((a, b) => {
      const aRect = a.getBoundingClientRect();
      const bRect = b.getBoundingClientRect();
      
      if (aRect.top !== bRect.top) {
        return aRect.top - bRect.top; // Sort by row first
      }
      
      return aRect.left - bRect.left; // Then by column
    });
    
    if (cells.length === 0) return;
    
    const firstCell = cells[0];
    const lastCell = cells[cells.length - 1];
    
    // Get month for first and last cell to check for month boundaries
    const firstCellMonth = parseInt(firstCell.dataset.month, 10);
    const lastCellMonth = parseInt(lastCell.dataset.month, 10);
    
    // Check if this segment spans months within the segment itself
    const isMonthBoundarySegment = firstCellMonth !== lastCellMonth;
    
    // Create segment element
    const segmentEl = document.createElement('div');
    segmentEl.className = layoutEvent.isPublicHoliday
      ? 'event-segment holiday'
      : 'event-segment regular';
    
    // Set event ID for hover effects
    segmentEl.dataset.eventId = layoutEvent.id;
    segmentEl.dataset.originalEventId = layoutEvent.originalEventId || layoutEvent.id;
    
    // Add middle segment class if applicable
    if (!segment.isFirstSegment && !segment.isLastSegment) {
      segmentEl.classList.add('middle-segment');
    }
    
    // Add title and information
    if (segment.isFirstSegment) {
      // First segment shows full title and indicators
      segmentEl.textContent = layoutEvent.title;
      
      // Add indicators
      let indicators = '';
      if (layoutEvent.isRecurring) indicators += '↻ ';
      if (layoutEvent.startsPM && segment.isFirstSegment) indicators += '◑ ';
      if (layoutEvent.endsAM && segment.isLastSegment) indicators += '◐ ';
      
      if (indicators) {
        const indicatorsSpan = document.createElement('span');
        indicatorsSpan.className = 'event-indicators';
        indicatorsSpan.textContent = indicators;
        segmentEl.appendChild(indicatorsSpan);
      }
      
      // Add date range for multi-day events
      if (layoutEvent.formattedDateRange) {
        const dateRangeSpan = document.createElement('span');
        dateRangeSpan.className = 'event-date-range';
        dateRangeSpan.textContent = layoutEvent.formattedDateRange;
        segmentEl.appendChild(dateRangeSpan);
      }
    } else if (!segment.isFirstSegment && !segment.isLastSegment) {
      // Middle segments show brief identifier
      const briefTitle = layoutEvent.title.length > 12 ? 
        layoutEvent.title.substring(0, 10) + '...' : 
        layoutEvent.title;
      segmentEl.textContent = '⟼ ' + briefTitle; 
    } else if (segment.isLastSegment) {
      // End segments show arrow and title
      segmentEl.textContent = '⟹ ' + layoutEvent.title;
      
      // Add end date for multi-day events
      if (layoutEvent.formattedDateRange) {
        const endDate = new Date(layoutEvent.endDate);
        const options = { month: 'short', day: 'numeric' };
        const endDateStr = endDate.toLocaleDateString(undefined, options);
        
        const dateEndSpan = document.createElement('span');
        dateEndSpan.className = 'event-date-range';
        dateEndSpan.textContent = 'ends: ' + endDateStr;
        segmentEl.appendChild(dateEndSpan);
      }
    }
    
    // Add continuation indicators
    if (!segment.isFirstSegment) {
      segmentEl.classList.add('continues-left');
    }
    
    if (!segment.isLastSegment) {
      segmentEl.classList.add('continues-right');
    }
    
    // Add month continuation indicators
    if (position.continuesUp) {
      segmentEl.classList.add('continues-up');
    }
    
    if (position.continuesDown) {
      segmentEl.classList.add('continues-down');
    }
    
    // Add month boundary indicators for segments that cross month boundaries
    if (isMonthBoundarySegment) {
      // If first day of this segment is first day of its month
      const firstCellDay = parseInt(firstCell.dataset.day, 10);
      if (firstCellDay === 1) {
        segmentEl.classList.add('month-boundary-start');
      }
      
      // If last day of this segment is last day of its month
      const lastCellDay = parseInt(lastCell.dataset.day, 10);
      const lastDayInMonth = new Date(this._year, lastCellMonth + 1, 0).getDate();
      if (lastCellDay === lastDayInMonth) {
        segmentEl.classList.add('month-boundary-end');
      }
    }
    
    // Calculate position and size
    const height = 16; // Fixed height for events
    const swimLaneOffset = position.swimLane * height;
    const topOffset = 20; // Offset from top to avoid day number
    
    segmentEl.style.top = `${swimLaneOffset + topOffset}px`;
    segmentEl.style.height = `${height}px`;
    
    // For single-cell segments
    if (cells.length === 1) {
      segmentEl.style.left = '0';
      segmentEl.style.right = '0';
      firstCell.appendChild(segmentEl);
    } else {
      // For multi-cell segments, position across cells
      const firstRect = firstCell.getBoundingClientRect();
      const lastRect = lastCell.getBoundingClientRect();
      const width = lastRect.right - firstRect.left;
      
      // Position relative to the first cell
      segmentEl.style.width = `${width - 2}px`; // Subtract margin
      firstCell.appendChild(segmentEl);
      segmentEl.style.zIndex = 15; // Make sure it overlays other cells
    }
    
    // Add click event handler
    this._addEventClickHandler(segmentEl, layoutEvent);
    
    // Add to segment list for hover effects
    segmentList.push(segmentEl);
    
    // Add tooltip with full event details
    const tooltipTitle = layoutEvent.title;
    const tooltipDates = layoutEvent.formattedDateRange || '';
    const tooltipContent = `${tooltipTitle}\n${tooltipDates}${layoutEvent.description ? `\n${layoutEvent.description}` : ''}`;
    segmentEl.title = tooltipContent;
  }
  
  /**
   * Create a simple event span for non-segmented events
   * @param {Object} layoutEvent - The event layout data
   * @param {Object} position - The position data
   * @param {Array} cells - The cells for this event
   * @param {Array} segmentList - List to store all segments for this event
   * @private
   */
  _createSimpleEventSpan(layoutEvent, position, cells, segmentList) {
    if (cells.length === 0) return;
    
    const firstCell = cells[0];
    const lastCell = cells[cells.length - 1];
    
    // Get month information for month boundary detection
    const firstCellMonth = parseInt(firstCell.dataset.month, 10);
    const lastCellMonth = parseInt(lastCell.dataset.month, 10);
    const isMonthBoundaryEvent = firstCellMonth !== lastCellMonth;
    
    // Create event element
    const eventEl = document.createElement('div');
    eventEl.className = layoutEvent.isPublicHoliday
      ? 'event holiday'
      : 'event regular';
    eventEl.textContent = layoutEvent.title;
    eventEl.dataset.eventId = layoutEvent.id;
    eventEl.dataset.originalEventId = layoutEvent.originalEventId || layoutEvent.id;
    
    // Add transition for smoother hover effects
    eventEl.style.transition = 'all 0.15s ease-in-out';
    
    // Add indicators
    let indicators = '';
    if (layoutEvent.isRecurring) indicators += '↻ ';
    if (layoutEvent.startsPM) indicators += '◑ ';
    if (layoutEvent.endsAM) indicators += '◐ ';
    
    if (indicators) {
      const indicatorsSpan = document.createElement('span');
      indicatorsSpan.className = 'event-indicators';
      indicatorsSpan.textContent = indicators;
      eventEl.appendChild(indicatorsSpan);
    }
    
    // Add date range for multi-day events
    if (cells.length > 1 && layoutEvent.formattedDateRange) {
      const dateRangeSpan = document.createElement('span');
      dateRangeSpan.className = 'event-date-range';
      dateRangeSpan.textContent = layoutEvent.formattedDateRange;
      eventEl.appendChild(dateRangeSpan);
    }
    
    // Add month boundary indicators for events that cross months
    if (isMonthBoundaryEvent) {
      // Apply month boundary styles consistent with segmented events
      const lastDayInFirstMonth = new Date(this._year, firstCellMonth + 1, 0).getDate();
      const firstDayInLastMonth = 1;
      
      const firstCellDay = parseInt(firstCell.dataset.day, 10);
      const lastCellDay = parseInt(lastCell.dataset.day, 10);
      
      if (firstCellDay === 1) {
        eventEl.style.borderLeftWidth = '3px';
        eventEl.style.borderLeftStyle = 'dashed';
      }
      
      if (lastCellDay === new Date(this._year, lastCellMonth + 1, 0).getDate()) {
        eventEl.style.borderRightWidth = '3px';
        eventEl.style.borderRightStyle = 'dashed';
        eventEl.style.borderRightColor = 'inherit';
      }
    }
    
    // Calculate position and size
    const height = 16; // Fixed height for events
    const swimLaneOffset = position.swimLane * height;
    
    eventEl.style.top = `${swimLaneOffset + 20}px`; // 20px offset from top to avoid day number
    eventEl.style.height = `${height}px`;
    
    // For single-cell events
    if (cells.length === 1) {
      firstCell.appendChild(eventEl);
    } else {
      // For multi-cell events, position across cells
      const firstRect = firstCell.getBoundingClientRect();
      const lastRect = lastCell.getBoundingClientRect();
      const width = lastRect.right - firstRect.left;
      
      eventEl.style.width = `${width - 2}px`; // Subtract margin
      firstCell.appendChild(eventEl);
      eventEl.style.zIndex = 10; // Make sure it overlays other cells
    }
    
    // Add click event handler
    this._addEventClickHandler(eventEl, layoutEvent);
    
    // Add to segment list for hover effects
    segmentList.push(eventEl);
    
    // Add keyboard accessibility
    eventEl.setAttribute('tabindex', '0');
    
    // Add tooltip with full event details
    const tooltipTitle = layoutEvent.title;
    const tooltipDates = layoutEvent.formattedDateRange || '';
    const tooltipContent = `${tooltipTitle}\n${tooltipDates}${layoutEvent.description ? `\n${layoutEvent.description}` : ''}`;
    eventEl.title = tooltipContent;
    
    // Add ARIA attributes for accessibility
    eventEl.setAttribute('role', 'button');
    eventEl.setAttribute('aria-label', tooltipContent.replace(/\n/g, ', '));
  }
  
  /**
   * Add click event handler to an event element with keyboard accessibility
   * @param {HTMLElement} element - The event element
   * @param {Object} layoutEvent - The event layout data
   * @private
   */
  _addEventClickHandler(element, layoutEvent) {
    // Create a handler function to reuse for both click and keyboard
    const handleEventActivation = (e) => {
      e.stopPropagation(); // Prevent triggering day-click
      
      // Find the original event if this is a segment or instance
      const originalEventId = layoutEvent.originalEventId || layoutEvent.id;
      const originalEvent = this._events.find(event => 
        event.id === originalEventId || event.id === layoutEvent.id
      );
      
      const clickEvent = new CustomEvent('event-click', {
        detail: {
          eventId: layoutEvent.id,
          originalEventId: originalEventId,
          event: originalEvent || layoutEvent,
        },
        bubbles: true,
        composed: true,
      });
      
      this.dispatchEvent(clickEvent);
    };
    
    // Mouse click event
    element.addEventListener('click', handleEventActivation);
    
    // Keyboard event for accessibility
    element.addEventListener('keydown', (e) => {
      // Activate on Enter or Space
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault(); // Prevent scrolling on Space
        handleEventActivation(e);
      }
    });
    
    // Add proper ARIA attributes
    element.setAttribute('role', 'button');
    element.setAttribute('aria-label', `Event: ${layoutEvent.title}`);
    
    // Add aria-description with more details if available
    if (layoutEvent.description) {
      element.setAttribute('aria-description', layoutEvent.description);
    }
  }
  
  /**
   * Group cells by week for proper event rendering
   * @param {Array} cells - The cells to group
   * @returns {Array} Array of cell groups by week
   * @private
   */
  _groupCellsByWeek(cells) {
    const weekGroups = [];
    let currentGroup = [cells[0]];
    
    for (let i = 1; i < cells.length; i++) {
      const prevCell = cells[i - 1];
      const currentCell = cells[i];
      
      const prevDay = parseInt(prevCell.dataset.day, 10);
      const prevMonth = parseInt(prevCell.dataset.month, 10);
      const currentDay = parseInt(currentCell.dataset.day, 10);
      const currentMonth = parseInt(currentCell.dataset.month, 10);
      
      // Check if this is a consecutive day in the same week
      const prevDate = new Date(this._year, prevMonth, prevDay);
      const currentDate = new Date(this._year, currentMonth, currentDay);
      const diffDays = Math.round(
        (currentDate - prevDate) / (1000 * 60 * 60 * 24),
      );
      
      if (diffDays === 1 && prevDate.getDay() !== 0) {
        // Same week, add to current group
        currentGroup.push(currentCell);
      } else {
        // New week or non-consecutive day, start a new group
        weekGroups.push(currentGroup);
        currentGroup = [currentCell];
      }
    }
    
    // Add the last group
    weekGroups.push(currentGroup);
    
    return weekGroups;
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

  _setupEventListeners() {
    // Year navigation
    this.shadowRoot
      .getElementById('prev-year')
      .addEventListener('click', () => {
        this.year = this._year - 1;
      });

    this.shadowRoot
      .getElementById('next-year')
      .addEventListener('click', () => {
        this.year = this._year + 1;
      });
  }

  _recalculateLayout() {
    if (!this._events || this._events.length === 0) {
      this._layoutEvents = [];
      return;
    }

    // Filter events for the current year
    const yearStart = new Date(this._year, 0, 1);
    const yearEnd = new Date(this._year, 11, 31, 23, 59, 59, 999);

    const eventsInYear = this._events.filter((event) => {
      const eventStart = event.startDate instanceof Date ? event.startDate : new Date(event.startDate);
      const eventEnd = event.endDate instanceof Date ? event.endDate : new Date(event.endDate);
      return eventEnd >= yearStart && eventStart <= yearEnd;
    });

    // If we have a position calculator, use it to calculate layout
    if (this._positionCalculator) {
      // Reset any previous data and calculate for the current year
      this._positionCalculator.resetOccupancyGrid();
      
      // Calculate positions for all events in the year
      this._layoutEvents = this._positionCalculator.calculatePositions(
        eventsInYear,
        this._year,
      );
    } else {
      // Fallback if no position calculator is provided
      this._layoutEvents = eventsInYear.map((event) => ({
        ...event,
        position: {
          swimLane: 0, // Default swimlane
        },
      }));
    }
  }
}

// Register the custom element
customElements.define('year-planner-grid', YearPlannerGrid);
