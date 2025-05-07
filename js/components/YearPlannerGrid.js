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

    console.log('YearPlannerGrid: Setting events', value.length, value);
    this._events = value;
    this._recalculateLayout();
    console.log(
      'YearPlannerGrid: After recalculating layout',
      this._layoutEvents.length,
      this._layoutEvents,
    );
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
          /* Use fixed width columns for days to ensure equal sizing - first column is month names */
          grid-template-columns: 3.75em repeat(37, minmax(20px, 1fr));
          grid-template-rows: 40px repeat(12, 80px);
          gap: 1px;
          background-color: #e0e0e0;
          border: 1px solid #e0e0e0;
          width: 100%;
          box-sizing: border-box;
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

        .weekday-name {
          font-size: 0.9em; /* 10% smaller font for weekday names */
        }

        .weekend-header {
          background-color: #f8f3eb; /* Light cream background for weekend headers */
        }

        .day-cell {
          cursor: pointer;
          position: relative;
          overflow: visible;
        }

        .day-cell.weekend {
          background-color: #fcf9f2; /* Light cream background for weekend days */
        }

        .day-cell:hover {
          background-color: #f9f9f9;
        }

        .inactive-cell {
          background-color: #f2f2f2;
          cursor: default;
        }

        .inactive-cell:hover {
          background-color: #f2f2f2;
        }

        .current-day {
          background-color: #e6f7ff;
          box-shadow: inset 0 0 0 2px #4682B4;
        }

        .current-day:hover {
          background-color: #d9f2ff;
        }

        .day-number {
          position: absolute;
          top: 2px;
          right: 3px;
          font-size: 0.85em;
          color: #555;
          opacity: 0.9;
          font-weight: 500;
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
          /* Fix for mobile rendering issues */
          transform: translateZ(0);
          will-change: transform;
          backface-visibility: hidden;
        }

        .event.holiday {
          background-color: #ffecb3;
          border-left: 2px solid #ffc107;
        }

        .event.regular {
          background-color: #e3f2fd;
          border-left: 2px solid #2196f3;
        }

        /* Debug styles for test events */
        .event.test-event {
          background-color: #ff5252;
          border-left: 2px solid #b71c1c;
          font-weight: bold;
          box-shadow: 0 0 5px rgba(0,0,0,0.3);
          z-index: 50 !important;
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
          /* Fix for mobile rendering issues */
          transform: translateZ(0);
          will-change: transform;
          backface-visibility: hidden;
        }

        .event-segment.holiday {
          background-color: #ffecb3;
          border-left: 2px solid #ffc107;
        }

        .event-segment.regular {
          background-color: #e3f2fd;
          border-left: 2px solid #2196f3;
        }

        /* Debug styles for test event segments */
        .event-segment.test-event {
          background-color: #ff5252;
          border-left: 2px solid #b71c1c;
          font-weight: bold;
          box-shadow: 0 0 5px rgba(0,0,0,0.3);
          z-index: 50 !important;
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
          position: absolute;
          right: 2px;
          top: 1px;
        }

        .event-icon {
          display: inline-block;
          margin-right: 2px;
          font-size: 0.85em;
          cursor: help;
          opacity: 0.9;
        }

        .recurring-icon {
          color: #9c27b0;
        }

        .starts-pm-icon {
          color: #ff9800;
        }

        .ends-am-icon {
          color: #2196f3;
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
      <div class="year-grid" id="grid" part="year-grid"></div>
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
    // Year selector cell in top-left corner (col 1, row 1)
    const yearCell = document.createElement('div');
    yearCell.className = 'header-cell';
    yearCell.setAttribute('part', 'header-cell');
    yearCell.innerHTML = `
      <div class="year-selector">
        <span class="year-value">${this._year}</span>
      </div>
    `;
    grid.appendChild(yearCell);

    // Weekday headers (all 37 columns - 5 weeks + 2 extra days)
    const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    // Calculate total number of columns needed (5 weeks + 2 extra days = 37 columns)
    const totalDaysToRender = 37;

    for (let i = 0; i < totalDaysToRender; i++) {
      const dayIndex = i % 7; // Get day of week (0-6)
      const dayHeader = document.createElement('div');
      dayHeader.className = 'header-cell';
      dayHeader.setAttribute('part', 'header-cell');

      // Add weekend class for Saturday and Sunday
      if (dayIndex === 5 || dayIndex === 6) {
        dayHeader.classList.add('weekend-header');
        dayHeader.setAttribute('part', 'header-cell weekend-header');
      }

      // Create smaller font for day names
      const daySpan = document.createElement('span');
      daySpan.className = 'weekday-name';
      daySpan.setAttribute('part', 'weekday-name');
      daySpan.textContent = weekdays[dayIndex];
      dayHeader.appendChild(daySpan);

      grid.appendChild(dayHeader);
    }
  }

  _renderDayCells(grid) {
    // List of month names
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    // Get current date to highlight today
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const currentDay = today.getDate();

    for (let month = 0; month < 12; month++) {
      // Add month name cell at the start of each row
      const monthCell = document.createElement('div');
      monthCell.className = 'month-cell';
      monthCell.setAttribute('part', 'month-cell');
      monthCell.textContent = months[month];
      grid.appendChild(monthCell);

      // Get the first day of the month
      const firstDay = new Date(this._year, month, 1);
      // Get the last day of the month
      const lastDay = new Date(this._year, month + 1, 0);
      const daysInMonth = lastDay.getDate();

      // Get day of week of first day (0 = Sunday, converting to 0 = Monday)
      let firstDayOfWeek = firstDay.getDay() - 1;
      if (firstDayOfWeek < 0) firstDayOfWeek = 6; // Sunday becomes 6

      // Create day cells for each position in the expanded grid (up to 37 days)
      for (let position = 0; position < 37; position++) {
        const dayCell = document.createElement('div');
        dayCell.className = 'day-cell';
        dayCell.setAttribute('part', 'day-cell');

        // Calculate the day number (1-based)
        const dayOffset = position - firstDayOfWeek;
        const dayNumber = dayOffset + 1;

        // Only show day numbers for valid days in the month
        if (dayNumber > 0 && dayNumber <= daysInMonth) {
          const dayNumberDiv = document.createElement('div');
          dayNumberDiv.className = 'day-number';
          dayNumberDiv.setAttribute('part', 'day-number');
          dayNumberDiv.textContent = dayNumber;
          dayCell.appendChild(dayNumberDiv);

          // Store data attributes for identifying the cell
          dayCell.dataset.month = month;
          dayCell.dataset.day = dayNumber;

          // Get the day of week to check for weekends
          const cellDate = new Date(this._year, month, dayNumber);
          const dayOfWeek = cellDate.getDay(); // 0 = Sunday, 6 = Saturday

          // Add weekend class for Saturday (6) and Sunday (0)
          if (dayOfWeek === 0 || dayOfWeek === 6) {
            dayCell.classList.add('weekend');
            dayCell.setAttribute('part', 'day-cell weekend');
          }

          // Check if this is today's date and highlight it
          if (
            this._year === currentYear &&
            month === currentMonth &&
            dayNumber === currentDay
          ) {
            dayCell.classList.add('current-day');
          }

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
          // Empty cell for days outside the month (filler cells)
          dayCell.dataset.empty = true;
          dayCell.classList.add('inactive-cell');
        }

        grid.appendChild(dayCell);
      }
    }
  }

  _renderEvents(grid) {
    console.log(
      'YearPlannerGrid: Rendering events',
      this._layoutEvents ? this._layoutEvents.length : 0,
    );

    if (!this._layoutEvents || this._layoutEvents.length === 0) {
      console.log('YearPlannerGrid: No layout events to render');
      return;
    } else {
      // Debug: Log the layout events data structure
      console.log(
        'YearPlannerGrid: Layout Events Structure:',
        JSON.stringify(this._layoutEvents.slice(0, 2), null, 2),
      );
    }

    // Store all created event segments by event ID for hover effect
    const eventSegments = new Map();

    this._layoutEvents.forEach((layoutEvent) => {
      const eventId = layoutEvent.id;
      const position = layoutEvent.position;

      // Debug: Check if position is valid
      if (!position) {
        console.error('YearPlannerGrid: Event has no position', layoutEvent);
        return;
      }

      // Create a list to store all segments for this event
      if (!eventSegments.has(eventId)) {
        eventSegments.set(eventId, []);
      }

      // Get all cells in the grid
      const allDayCells = Array.from(grid.querySelectorAll('.day-cell')).filter(
        (cell) => !cell.dataset.empty,
      );
      console.log(
        'YearPlannerGrid: Found day cells for events',
        allDayCells.length,
      );

      // Debug: Log a sample of day cells to verify data attributes
      if (allDayCells.length > 0) {
        const sampleCells = allDayCells.slice(0, 3);
        console.log(
          'YearPlannerGrid: Sample day cells:',
          sampleCells.map((cell) => ({
            month: cell.dataset.month,
            day: cell.dataset.day,
            empty: cell.dataset.empty,
            rect: {
              top: cell.getBoundingClientRect().top,
              left: cell.getBoundingClientRect().left,
            },
          })),
        );
      }

      // Check if we have segments for multi-week or multi-month events
      if (position.segments && position.segments.length > 0) {
        // Render each segment separately
        position.segments.forEach((segment) => {
          // Find the cells for this segment
          const segmentCells = allDayCells.filter((cell) => {
            const month = parseInt(cell.dataset.month, 10);
            const day = parseInt(cell.dataset.day, 10);

            // Skip if not in the right month
            if (month !== segment.month) return false;

            // Get day of week for this cell
            const date = new Date(this._year, month, day);
            const dayOfWeek = this._getDayOfWeek(date);

            // Debug: Log all cell evaluations for event segments
            console.log(
              `YearPlannerGrid: Evaluating cell for segment - event:${layoutEvent.id} month:${month} day:${day} dayOfWeek:${dayOfWeek} segment range:${segment.startDay}-${segment.endDay}`,
            );

            // Check if the day falls within the segment's day range
            let isInRange;

            // Always check the actual date against the event's date range
            const isDateInRange =
              layoutEvent.startDate <= date && date <= layoutEvent.endDate;

            // And check day of week against segment range
            if (segment.startDay <= segment.endDay) {
              // Normal case: startDay to endDay
              isInRange =
                dayOfWeek >= segment.startDay &&
                dayOfWeek <= segment.endDay &&
                isDateInRange;
            } else {
              // Wrapped around the week: startDay to end of week OR start of week to endDay
              isInRange =
                (dayOfWeek >= segment.startDay ||
                  dayOfWeek <= segment.endDay) &&
                isDateInRange;
            }

            // Debug date range
            console.log(
              `YearPlannerGrid: Date range check for segment - date:${date.toISOString()} in event range:${layoutEvent.startDate.toISOString()} - ${layoutEvent.endDate.toISOString()} = ${isDateInRange}`,
            );

            if (isInRange) {
              console.log(
                `YearPlannerGrid: Cell matches segment - month:${month} day:${day} dayOfWeek:${dayOfWeek} in range:${segment.startDay}-${segment.endDay}`,
              );
            }

            return isInRange;
          });

          if (segmentCells.length === 0) return;

          // Create segment element
          this._createEventSegment(
            grid,
            layoutEvent,
            position,
            segment,
            segmentCells,
            eventSegments.get(eventId),
          );
        });
      } else {
        // Simple single-day or single-week event
        // Find the cells that match this event
        const eventCells = allDayCells.filter((cell) => {
          const month = parseInt(cell.dataset.month, 10);
          const day = parseInt(cell.dataset.day, 10);
          const date = new Date(this._year, month, day);

          // Fix: Compare dates by their day, month, and year components only
          const isSameOrAfterStartDate =
            date.getFullYear() > layoutEvent.startDate.getFullYear() ||
            (date.getFullYear() === layoutEvent.startDate.getFullYear() &&
              (date.getMonth() > layoutEvent.startDate.getMonth() ||
                (date.getMonth() === layoutEvent.startDate.getMonth() &&
                  date.getDate() >= layoutEvent.startDate.getDate())));

          const isSameOrBeforeEndDate =
            date.getFullYear() < layoutEvent.endDate.getFullYear() ||
            (date.getFullYear() === layoutEvent.endDate.getFullYear() &&
              (date.getMonth() < layoutEvent.endDate.getMonth() ||
                (date.getMonth() === layoutEvent.endDate.getMonth() &&
                  date.getDate() <= layoutEvent.endDate.getDate())));

          const isInRange = isSameOrAfterStartDate && isSameOrBeforeEndDate;

          // Debug: Log date comparison for single-day/single-week events
          console.log(
            `YearPlannerGrid: Evaluating cell for simple event - event:${layoutEvent.id} cell date:${date.toISOString()} (${month}/${day}) event range:${layoutEvent.startDate.toISOString()} - ${layoutEvent.endDate.toISOString()} matches:${isInRange}`,
          );

          // Check if this date is within the event's range
          return isInRange;
        });

        if (eventCells.length === 0) {
          console.log(
            `YearPlannerGrid: No matching cells found for event: ${layoutEvent.id}`,
          );

          // For debug event, force create at least one cell
          if (layoutEvent.id === 'direct-test-event') {
            console.log(
              'YearPlannerGrid: Forcing cell creation for direct test event',
            );

            // Find a cell for the current day or first available cell
            const currentDayCell = allDayCells.find((cell) => {
              const month = parseInt(cell.dataset.month, 10);
              const day = parseInt(cell.dataset.day, 10);
              return month === today.getMonth() && day === today.getDate();
            });

            if (currentDayCell) {
              console.log(
                'YearPlannerGrid: Found current day cell for forced event',
              );
              eventCells.push(currentDayCell);
            } else if (allDayCells.length > 0) {
              console.log(
                'YearPlannerGrid: Using first available cell for forced event',
              );
              eventCells.push(allDayCells[0]);
            }
          } else {
            return;
          }
        }

        // For multi-day events that don't cross week boundaries
        if (eventCells.length > 1) {
          // Group cells by week
          const weekGroups = this._groupCellsByWeek(eventCells);

          // Create an event element for each week group
          weekGroups.forEach((group) => {
            this._createSimpleEventSpan(
              layoutEvent,
              position,
              group,
              eventSegments.get(eventId),
            );
          });
        } else {
          // Single day event
          this._createSimpleEventSpan(
            layoutEvent,
            position,
            eventCells,
            eventSegments.get(eventId),
          );
        }
      }
    });

    // Enhance hover effect to highlight all segments of the same event with better coordination
    eventSegments.forEach((segments, eventId) => {
      // Use debounced approach to reduce flickering
      let hoverTimeout;
      const hoverDelay = 50; // ms
      let isTouch = false; // Detect touch devices

      // Detect touch capability
      try {
        isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      } catch (e) {
        // Fallback if detection fails
        isTouch = false;
      }

      segments.forEach((segment) => {
        // Skip hover effects on touch devices to prevent glitches
        if (isTouch) {
          // For touch devices, we'll leave the hover CSS states to handle this
          // But we'll still make the segment interactive for clicks
          return;
        }

        // Handle mouse enter with delay
        segment.addEventListener('mouseenter', () => {
          clearTimeout(hoverTimeout);

          // Add immediate class to hovered segment
          segment.classList.add('hover');

          // Add connected class to all related segments with slight delay
          hoverTimeout = setTimeout(() => {
            segments.forEach((s) => {
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
            segments.forEach((s) => {
              s.classList.remove('hover-connected');
            });
          }, hoverDelay);
        });

        // Add keyboard accessibility
        segment.setAttribute('tabindex', '0');

        // Add keyboard focus events for accessibility
        segment.addEventListener('focus', () => {
          segment.classList.add('hover');
          segments.forEach((s) => {
            if (s !== segment) {
              s.classList.add('hover-connected');
            }
          });
        });

        segment.addEventListener('blur', () => {
          segment.classList.remove('hover');
          segments.forEach((s) => {
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
  _createEventSegment(
    grid,
    layoutEvent,
    position,
    segment,
    cells,
    segmentList,
  ) {
    console.log(
      'YearPlannerGrid: Creating event segment',
      layoutEvent.id,
      `segment: ${segment.month}/${segment.startDay}-${segment.endDay}`,
      `cells: ${cells.length}`,
    );

    // Sort cells by position in the grid
    cells.sort((a, b) => {
      const aRect = a.getBoundingClientRect();
      const bRect = b.getBoundingClientRect();

      if (aRect.top !== bRect.top) {
        return aRect.top - bRect.top; // Sort by row first
      }

      return aRect.left - bRect.left; // Then by column
    });

    if (cells.length === 0) {
      console.warn('YearPlannerGrid: No cells for segment', segment);
      return;
    }

    const firstCell = cells[0];
    const lastCell = cells[cells.length - 1];

    // Get month for first and last cell to check for month boundaries
    const firstCellMonth = parseInt(firstCell.dataset.month, 10);
    const lastCellMonth = parseInt(lastCell.dataset.month, 10);

    // Check if this segment spans months within the segment itself
    const isMonthBoundarySegment = firstCellMonth !== lastCellMonth;

    // Create segment element
    const segmentEl = document.createElement('div');
    let className = 'event-segment';
    let partName = 'event-segment';

    if (layoutEvent.isPublicHoliday) {
      className += ' holiday';
      partName += ' holiday';
    } else if (layoutEvent.isTestEvent) {
      className += ' test-event';
      partName += ' test-event';
    } else {
      className += ' regular';
      partName += ' regular';
    }

    segmentEl.className = className;
    segmentEl.setAttribute('part', partName);

    // Set event ID for hover effects
    segmentEl.dataset.eventId = layoutEvent.id;
    segmentEl.dataset.originalEventId =
      layoutEvent.originalEventId || layoutEvent.id;

    // Add middle segment class if applicable
    if (!segment.isFirstSegment && !segment.isLastSegment) {
      segmentEl.classList.add('middle-segment');
    }

    // Add title and information
    if (segment.isFirstSegment) {
      // First segment shows full title
      segmentEl.textContent = layoutEvent.title;

      // Add indicators
      let indicators = '';
      if (layoutEvent.isRecurring)
        indicators +=
          '<span class="event-icon recurring-icon" title="Recurring event">↻</span>';
      if (layoutEvent.startsPM && segment.isFirstSegment)
        indicators +=
          '<span class="event-icon starts-pm-icon" title="Starts in afternoon">◑</span>';
      if (layoutEvent.endsAM && segment.isLastSegment)
        indicators +=
          '<span class="event-icon ends-am-icon" title="Ends in morning">◐</span>';

      if (indicators) {
        const indicatorsSpan = document.createElement('span');
        indicatorsSpan.className = 'event-indicators';
        indicatorsSpan.innerHTML = indicators; // Use innerHTML to render the HTML spans
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
      // Middle segments show brief identifier with continuation symbol
      const briefTitle =
        layoutEvent.title.length > 12
          ? layoutEvent.title.substring(0, 10) + '...'
          : layoutEvent.title;
      segmentEl.textContent = '⟼ ' + briefTitle;

      // Add minimal indicators for middle segments
      if (layoutEvent.isRecurring || layoutEvent.startsPM || layoutEvent.endsAM) {
        const miniIndicator = document.createElement('span');
        miniIndicator.className = 'event-indicators mini';
        miniIndicator.style.fontSize = '0.6em';
        miniIndicator.style.opacity = '0.7';
        miniIndicator.style.position = 'absolute';
        miniIndicator.style.right = '2px';
        miniIndicator.style.top = '1px';

        if (layoutEvent.isRecurring) {
          const icon = document.createElement('span');
          icon.className = 'event-icon recurring-icon';
          icon.title = 'Recurring event';
          icon.textContent = '↻';
          miniIndicator.appendChild(icon);
        }

        segmentEl.appendChild(miniIndicator);
      }
    } else if (segment.isLastSegment) {
      // End segments show arrow and title
      segmentEl.textContent = '⟹ ' + layoutEvent.title;

      // Add indicators for last segment
      let indicators = '';
      if (layoutEvent.isRecurring)
        indicators +=
          '<span class="event-icon recurring-icon" title="Recurring event">↻</span>';
      if (layoutEvent.endsAM)
        indicators +=
          '<span class="event-icon ends-am-icon" title="Ends in morning">◐</span>';

      if (indicators) {
        const indicatorsSpan = document.createElement('span');
        indicatorsSpan.className = 'event-indicators';
        indicatorsSpan.innerHTML = indicators;
        segmentEl.appendChild(indicatorsSpan);
      }

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
      const lastDayInMonth = new Date(
        this._year,
        lastCellMonth + 1,
        0,
      ).getDate();
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
      segmentEl.style.zIndex = 100; // Make sure it overlays other cells during scrolling
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
    let className = 'event';
    let partName = 'event';

    if (layoutEvent.isPublicHoliday) {
      className += ' holiday';
      partName += ' holiday';
    } else if (layoutEvent.isTestEvent) {
      className += ' test-event';
      partName += ' test-event';
    } else {
      className += ' regular';
      partName += ' regular';
    }

    eventEl.className = className;
    eventEl.setAttribute('part', partName);
    eventEl.textContent = layoutEvent.title;
    eventEl.dataset.eventId = layoutEvent.id;
    eventEl.dataset.originalEventId =
      layoutEvent.originalEventId || layoutEvent.id;

    // Add transition for smoother hover effects
    eventEl.style.transition = 'all 0.15s ease-in-out';

    // Add indicators
    let indicators = '';
    if (layoutEvent.isRecurring)
      indicators +=
        '<span class="event-icon recurring-icon" title="Recurring event">↻</span>';
    if (layoutEvent.startsPM)
      indicators +=
        '<span class="event-icon starts-pm-icon" title="Starts in afternoon">◑</span>';
    if (layoutEvent.endsAM)
      indicators +=
        '<span class="event-icon ends-am-icon" title="Ends in morning">◐</span>';

    if (indicators) {
      const indicatorsSpan = document.createElement('span');
      indicatorsSpan.className = 'event-indicators';
      indicatorsSpan.innerHTML = indicators; // Use innerHTML to render the HTML spans
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
      const lastDayInFirstMonth = new Date(
        this._year,
        firstCellMonth + 1,
        0,
      ).getDate();
      const firstDayInLastMonth = 1;

      const firstCellDay = parseInt(firstCell.dataset.day, 10);
      const lastCellDay = parseInt(lastCell.dataset.day, 10);

      if (firstCellDay === 1) {
        eventEl.style.borderLeftWidth = '3px';
        eventEl.style.borderLeftStyle = 'dashed';
      }

      if (
        lastCellDay === new Date(this._year, lastCellMonth + 1, 0).getDate()
      ) {
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
      eventEl.style.zIndex = 100; // Make sure it overlays other cells during scrolling
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
    eventEl.setAttribute('aria-label', `Event: ${layoutEvent.title}`);

    // Add aria-description with more details if available
    if (layoutEvent.description) {
      eventEl.setAttribute('aria-description', layoutEvent.description);
    }
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
      const originalEvent = this._events.find(
        (event) => event.id === originalEventId || event.id === layoutEvent.id,
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
    console.log('YearPlannerGrid: Grouping cells by week');
    // Sort cells by date first to ensure correct order
    cells.sort((a, b) => {
      const aMonth = parseInt(a.dataset.month, 10);
      const aDay = parseInt(a.dataset.day, 10);
      const bMonth = parseInt(b.dataset.month, 10);
      const bDay = parseInt(b.dataset.day, 10);

      if (aMonth !== bMonth) return aMonth - bMonth;
      return aDay - bDay;
    });

    // Check if all cells form a continuous date range
    let isContiguous = true;
    for (let i = 1; i < cells.length; i++) {
      const prevCell = cells[i - 1];
      const currentCell = cells[i];

      const prevDate = new Date(this._year, parseInt(prevCell.dataset.month, 10), parseInt(prevCell.dataset.day, 10));
      const currentDate = new Date(this._year, parseInt(currentCell.dataset.month, 10), parseInt(currentCell.dataset.day, 10));

      // Calculate difference in days
      const timeDiff = currentDate.getTime() - prevDate.getTime();
      const diffDays = Math.round(timeDiff / (1000 * 60 * 60 * 24));

      if (diffDays !== 1) {
        isContiguous = false;
        break;
      }
    }

    // If all days are contiguous, return as a single group
    if (isContiguous && cells.length > 0) {
      console.log("Single DIV")
      return [cells];
    }

    console.log("Multiple DIV")

    // Otherwise splits
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

      if (diffDays === 1) {
        // Consecutive days, add to current group regardless of week boundary
        currentGroup.push(currentCell);
      } else {
        // Non-consecutive days, start a new group
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

    // Debug logging
    console.log(
      `_getDayOfWeek: ${date.toISOString()} => JS day: ${date.getDay()} => Our day: ${day}`,
    );

    return day;
  }

  _setupEventListeners() {
    // Need to defer year navigation setup because buttons don't exist yet at initial connection
    setTimeout(() => {
      // Year navigation
      const prevYearBtn = this.shadowRoot.getElementById('prev-year');
      const nextYearBtn = this.shadowRoot.getElementById('next-year');

      if (prevYearBtn) {
        prevYearBtn.addEventListener('click', () => {
          this.year = this._year - 1;
        });
      }

      if (nextYearBtn) {
        nextYearBtn.addEventListener('click', () => {
          this.year = this._year + 1;
        });
      }
    }, 0);
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
      const eventStart =
        event.startDate instanceof Date
          ? event.startDate
          : new Date(event.startDate);
      const eventEnd =
        event.endDate instanceof Date ? event.endDate : new Date(event.endDate);
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
