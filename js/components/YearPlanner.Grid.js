// YearPlannerGrid.js
// A Web Component for displaying a yearly calendar grid

class YearPlannerGrid extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._year = new Date().getFullYear();
    this._selectedCell = null;
    this._init();
  }

  static get observedAttributes() {
    return ['year'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'year' && oldValue !== newValue) {
      this._year = parseInt(newValue, 10);
      this._render();
    }
  }

  connectedCallback() {
    this._render();
  }

  _init() {
    // Create the basic structure and styles
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          --grid-border: 1px solid #ddd;
          --header-bg: #f5f5f5;
          --weekend-bg: #f9f9f9;
          --cell-size: 30px;
          --selected-bg: rgba(66, 133, 244, 0.1);
          --hover-bg: rgba(66, 133, 244, 0.05);
        }

        .year-planner {
          display: grid;
          grid-template-columns: 100px repeat(35, var(--cell-size));
          grid-auto-rows: var(--cell-size);
          border: var(--grid-border);
          border-radius: 4px;
          overflow: auto;
        }

        .year-selector {
          grid-column: 1;
          grid-row: 1;
          display: flex;
          justify-content: center;
          align-items: center;
          font-weight: bold;
          background-color: var(--header-bg);
          border-right: var(--grid-border);
          border-bottom: var(--grid-border);
        }

        .weekday-header {
          display: flex;
          justify-content: center;
          align-items: center;
          background-color: var(--header-bg);
          border-bottom: var(--grid-border);
          font-weight: 500;
          font-size: 0.9em;
        }

        .month-header {
          grid-column: 1;
          display: flex;
          justify-content: center;
          align-items: center;
          background-color: var(--header-bg);
          border-right: var(--grid-border);
          border-bottom: var(--grid-border);
          font-weight: 500;
        }

        .day-cell {
          position: relative;
          border-right: var(--grid-border);
          border-bottom: var(--grid-border);
          cursor: pointer;
        }

        .day-cell:hover {
          background-color: var(--hover-bg);
        }

        .day-cell.selected {
          background-color: var(--selected-bg);
        }

        .day-cell.weekend {
          background-color: var(--weekend-bg);
        }

        .day-number {
          position: absolute;
          top: 2px;
          right: 5px;
          font-size: 0.8em;
          color: #555;
        }

        .outside-month {
          color: #ccc;
        }
      </style>
      <div class="year-planner"></div>
    `;

    // Reference to the grid container
    this.plannerGrid = this.shadowRoot.querySelector('.year-planner');

    // Add event listeners
    this.plannerGrid.addEventListener(
      'click',
      this._handleCellClick.bind(this),
    );
  }

  set year(value) {
    this.setAttribute('year', value);
  }

  get year() {
    return this._year;
  }

  _handleCellClick(event) {
    const cell = event.target.closest('.day-cell');
    if (!cell) return;

    // Clear previous selection
    if (this._selectedCell) {
      this._selectedCell.classList.remove('selected');
    }

    // Select new cell
    cell.classList.add('selected');
    this._selectedCell = cell;

    // Extract date information from cell's data attributes
    const year = this._year;
    const month = parseInt(cell.dataset.month, 10);
    const day = parseInt(cell.dataset.day, 10);

    // Dispatch custom event with selected date
    const detail = {
      date: new Date(year, month, day),
      year,
      month,
      day,
    };

    this.dispatchEvent(
      new CustomEvent('cell-selected', {
        detail,
        bubbles: true,
        composed: true,
      }),
    );
  }

  _render() {
    // Clear the grid
    this.plannerGrid.innerHTML = '';

    // Add year selector (top-left corner)
    const yearSelector = document.createElement('div');
    yearSelector.className = 'year-selector';
    yearSelector.textContent = this._year;
    this.plannerGrid.appendChild(yearSelector);

    // Add weekday headers (repeating for 5 weeks)
    const weekdays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    for (let week = 0; week < 5; week++) {
      for (let day = 0; day < 7; day++) {
        const headerCell = document.createElement('div');
        headerCell.className = 'weekday-header';
        headerCell.textContent = weekdays[day];
        headerCell.style.gridColumn = `${2 + week * 7 + day}`; // +2 because grid is 1-indexed and first column is month names
        headerCell.style.gridRow = '1';
        this.plannerGrid.appendChild(headerCell);
      }
    }

    // Add month rows with day cells
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

    for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
      // Add month header
      const monthHeader = document.createElement('div');
      monthHeader.className = 'month-header';
      monthHeader.textContent = months[monthIndex];
      monthHeader.style.gridRow = `${monthIndex + 2}`; // +2 because first row is headers
      this.plannerGrid.appendChild(monthHeader);

      // Calculate the first day of the month and how many days in the month
      const firstDay = new Date(this._year, monthIndex, 1);
      const lastDay = new Date(this._year, monthIndex + 1, 0);
      const daysInMonth = lastDay.getDate();

      // Calculate the day of week for the first day (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
      // Convert to Monday-based index (0 = Monday, ..., 6 = Sunday)
      let firstDayOfWeek = firstDay.getDay() - 1;
      if (firstDayOfWeek < 0) firstDayOfWeek = 6; // Convert Sunday from -1 to 6

      // Create all the day cells for this month
      for (let day = 1; day <= daysInMonth; day++) {
        const dayDate = new Date(this._year, monthIndex, day);
        const dayOfWeek = dayDate.getDay() - 1; // Convert to Monday-based
        const adjustedDayOfWeek = dayOfWeek < 0 ? 6 : dayOfWeek; // Convert Sunday from -1 to 6

        // Calculate which week of the month this day belongs to
        const weekOfMonth = Math.floor((day - 1 + firstDayOfWeek) / 7);

        // Create day cell
        const dayCell = document.createElement('div');
        dayCell.className = 'day-cell';

        // Add weekend class for Saturday and Sunday
        if (adjustedDayOfWeek >= 5) {
          dayCell.classList.add('weekend');
        }

        // Set position in grid
        dayCell.style.gridColumn = `${2 + weekOfMonth * 7 + adjustedDayOfWeek}`;
        dayCell.style.gridRow = `${monthIndex + 2}`; // +2 because first row is headers

        // Add day number
        const dayNumber = document.createElement('div');
        dayNumber.className = 'day-number';
        dayNumber.textContent = day;
        dayCell.appendChild(dayNumber);

        // Store date information in data attributes
        dayCell.dataset.year = this._year;
        dayCell.dataset.month = monthIndex;
        dayCell.dataset.day = day;

        this.plannerGrid.appendChild(dayCell);
      }
    }
  }
}

// Register the custom element
customElements.define('year-planner-grid', YearPlannerGrid);

export default YearPlannerGrid;
