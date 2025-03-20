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
        }

        .event-segment.holiday {
          background-color: #ffecb3;
          border-left: 2px solid #ffc107;
        }

        .event-segment.regular {
          background-color: #e3f2fd;
          border-left: 2px solid #2196f3;
        }

        /* Continuation indicators */
        .event-segment.continues-left {
          border-top-left-radius: 0;
          border-bottom-left-radius: 0;
          border-left: none;
          margin-left: 0;
          padding-left: 2px;
        }

        .event-segment.continues-left::before {
          content: "";
          position: absolute;
          left: -2px;
          top: 0;
          bottom: 0;
          width: 2px;
          background: linear-gradient(to right, transparent, currentColor);
        }

        .event-segment.continues-right {
          border-top-right-radius: 0;
          border-bottom-right-radius: 0;
          margin-right: 0;
          padding-right: 2px;
        }

        .event-segment.continues-right::after {
          content: "";
          position: absolute;
          right: -2px;
          top: 0;
          bottom: 0;
          width: 2px;
          background: linear-gradient(to left, transparent, currentColor);
        }

        .event-segment.continues-up::before {
          content: "↑";
          position: absolute;
          left: 2px;
          top: -1px;
          font-size: 0.8em;
          opacity: 0.7;
        }

        .event-segment.continues-down::after {
          content: "↓";
          position: absolute;
          right: 2px;
          bottom: -1px;
          font-size: 0.8em;
          opacity: 0.7;
        }

        /* Hover effects for multi-segment events */
        .event-segment[data-event-id]:hover,
        .event-segment[data-event-id].hover {
          filter: brightness(0.9);
          z-index: 20;
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

    this._layoutEvents.forEach((layoutEvent) => {
      // Create event element
      const eventEl = document.createElement('div');
      eventEl.className = layoutEvent.isPublicHoliday
        ? 'event holiday'
        : 'event regular';
      eventEl.textContent = layoutEvent.title;
      eventEl.dataset.eventId = layoutEvent.id;

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

      // Calculate position based on the layout data
      const pos = layoutEvent.position;

      // Find all day cells that match the position
      const cells = Array.from(grid.querySelectorAll('.day-cell'))
        .filter((cell) => !cell.dataset.empty)
        .filter((cell) => {
          const month = parseInt(cell.dataset.month, 10);
          const day = parseInt(cell.dataset.day, 10);
          const date = new Date(this._year, month, day);

          // Check if this date is within the event's range
          return date >= layoutEvent.startDate && date <= layoutEvent.endDate;
        });

      if (cells.length === 0) return;

      // For multi-day events, we need to create multiple event elements
      if (cells.length > 1) {
        // Group cells by week to create continuous event spans
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

        // Create event elements for each week group
        weekGroups.forEach((group) => {
          const firstCell = group[0];
          const lastCell = group[group.length - 1];

          // Create a clone of the event element
          const groupEvent = eventEl.cloneNode(true);

          // Set position and size
          const rect = firstCell.getBoundingClientRect();
          const height = 16; // Fixed height for events
          const swimLaneOffset = pos.swimLane * height;

          groupEvent.style.top = `${swimLaneOffset + 20}px`; // 20px offset from top to avoid day number
          groupEvent.style.height = `${height}px`;

          // For single cell events
          if (group.length === 1) {
            firstCell.appendChild(groupEvent);
          } else {
            // For multi-cell events, position across cells
            const firstRect = firstCell.getBoundingClientRect();
            const lastRect = lastCell.getBoundingClientRect();
            const width = lastRect.right - firstRect.left;

            groupEvent.style.width = `${width - 2}px`; // Subtract border
            firstCell.appendChild(groupEvent);
            groupEvent.style.zIndex = 100; // Make sure it overlays other cells
          }

          // Add click event handler
          groupEvent.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent triggering day-click
            const clickEvent = new CustomEvent('event-click', {
              detail: {
                eventId: layoutEvent.id,
                event: this._events.find((e) => e.id === layoutEvent.id),
              },
              bubbles: true,
              composed: true,
            });
            this.dispatchEvent(clickEvent);
          });
        });
      } else {
        // Single day event
        const cell = cells[0];

        // Set position in the swimlane
        const height = 16; // Fixed height for events
        const swimLaneOffset = pos.swimLane * height;

        eventEl.style.top = `${swimLaneOffset + 20}px`; // 20px offset from top to avoid day number
        eventEl.style.height = `${height}px`;

        cell.appendChild(eventEl);

        // Add click event handler
        eventEl.addEventListener('click', (e) => {
          e.stopPropagation(); // Prevent triggering day-click
          const clickEvent = new CustomEvent('event-click', {
            detail: {
              eventId: layoutEvent.id,
              event: this._events.find((e) => e.id === layoutEvent.id),
            },
            bubbles: true,
            composed: true,
          });
          this.dispatchEvent(clickEvent);
        });
      }
    });
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
    const yearEnd = new Date(this._year, 11, 31);

    const eventsInYear = this._events.filter((event) => {
      return event.startDate <= yearEnd && event.endDate >= yearStart;
    });

    // If we have a position calculator, use it to calculate layout
    if (this._positionCalculator) {
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

// Helper class for calculating event positions
class EventPositionCalculator {
  constructor() {
    this.MAX_SWIMLANES = 5;
  }

  calculatePositions(events, year) {
    if (!events || events.length === 0) return [];

    // Clone events to avoid modifying the originals
    const sortedEvents = [...events];

    // Sort events by duration (longest first), then by start date
    sortedEvents.sort((a, b) => {
      const aDuration = this._getDurationInDays(a.startDate, a.endDate);
      const bDuration = this._getDurationInDays(b.startDate, b.endDate);

      if (aDuration !== bDuration) {
        return bDuration - aDuration; // Longest first
      }

      // If same duration, sort by start date
      return a.startDate - b.startDate;
    });

    // Create a 12x35 grid to track swimlane occupancy
    // [month][day]: Array of occupied swimlanes
    const occupancyGrid = Array(12)
      .fill()
      .map(() =>
        Array(35)
          .fill()
          .map(() => Array(this.MAX_SWIMLANES).fill(false)),
      );

    // Process events to assign swimlanes
    const layoutEvents = sortedEvents.map((event) => {
      // Get starting month and day indices
      const startMonth = event.startDate.getMonth();
      const startDay = event.startDate.getDate();

      // Get ending month and day indices
      const endMonth = event.endDate.getMonth();
      const endDay = event.endDate.getDate();

      // Special handling for holidays (always get swimlane 0)
      let swimLane = 0;

      if (!event.isPublicHoliday) {
        // Find the first available swimlane across all days of the event
        swimLane = this._findAvailableSwimLane(
          event.startDate,
          event.endDate,
          occupancyGrid,
          year,
        );
      }

      // Mark the swimlane as occupied for all days of the event
      this._markOccupied(
        event.startDate,
        event.endDate,
        swimLane,
        occupancyGrid,
        year,
      );

      // Create the position data
      const position = {
        swimLane,
      };

      // Return the event with position data
      return {
        ...event,
        position,
      };
    });

    return layoutEvents;
  }

  _getDurationInDays(startDate, endDate) {
    return Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
  }

  _findAvailableSwimLane(startDate, endDate, occupancyGrid, year) {
    // Iterate through all swimlanes
    for (let swimLane = 0; swimLane < this.MAX_SWIMLANES; swimLane++) {
      // Check if this swimlane is available for all days of the event
      if (
        this._isSwimLaneAvailable(
          startDate,
          endDate,
          swimLane,
          occupancyGrid,
          year,
        )
      ) {
        return swimLane;
      }
    }

    // If no swimlane is fully available, use the last one (overflow)
    return this.MAX_SWIMLANES - 1;
  }

  _isSwimLaneAvailable(startDate, endDate, swimLane, occupancyGrid, year) {
    // Clone dates to avoid modifying the original
    const currentDate = new Date(startDate);

    // Iterate through all days of the event
    while (currentDate <= endDate) {
      // Skip if date is not in the current year
      if (currentDate.getFullYear() !== year) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      const month = currentDate.getMonth();
      const day = currentDate.getDate() - 1; // 0-based day index

      // Check if swimlane is occupied for this day
      if (occupancyGrid[month][day][swimLane]) {
        return false;
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return true;
  }

  _markOccupied(startDate, endDate, swimLane, occupancyGrid, year) {
    // Clone dates to avoid modifying the original
    const currentDate = new Date(startDate);

    // Iterate through all days of the event
    while (currentDate <= endDate) {
      // Skip if date is not in the current year
      if (currentDate.getFullYear() !== year) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      const month = currentDate.getMonth();
      const day = currentDate.getDate() - 1; // 0-based day index

      // Mark swimlane as occupied for this day
      occupancyGrid[month][day][swimLane] = true;

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }
}

// Register the custom element
customElements.define('year-planner-grid', YearPlannerGrid);
