/**
 * app.js - Main application controller for Year Planner
 *
 * Handles application initialization, event management, and state coordination
 * between components defined in the Year Planner Design Document.
 */

class YearPlannerApp {
  constructor() {
    this.currentYear = new Date().getFullYear();
    this.events = [];
    this.storageAdapter = null;
    this.yearPlannerGrid = null;
    this.eventEditorModal = null;
    this.eventPositionCalculator = null;
    this.initialized = false;
  }

  /**
   * Initialize the application and all required components
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      // Initialize dependencies
      this.storageAdapter = new StorageAdapter();
      this.eventPositionCalculator = new EventPositionCalculator();

      // Initialize UI components
      this.yearPlannerGrid = new YearPlannerGrid({
        onDayClick: this.handleDayClick.bind(this),
        onEventClick: this.handleEventClick.bind(this),
      });

      this.eventEditorModal = new EventEditorModal({
        onSave: this.handleEventSave.bind(this),
        onDelete: this.handleEventDelete.bind(this),
        onValidationError: this.handleValidationError.bind(this),
      });

      // Set up event listeners
      this.setupEventListeners();

      // Load initial data
      await this.loadYear(this.currentYear);

      this.initialized = true;
      console.log('Year Planner initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Year Planner:', error);
      this.displayErrorMessage(
        'Failed to initialize application. Please refresh and try again.',
      );
    }
  }

  /**
   * Set up application event listeners
   */
  setupEventListeners() {
    // Year navigation
    document
      .getElementById('prevYear')
      .addEventListener('click', () => this.navigateYear(-1));
    document
      .getElementById('nextYear')
      .addEventListener('click', () => this.navigateYear(1));
    document
      .getElementById('currentYear')
      .addEventListener('change', (e) =>
        this.loadYear(parseInt(e.target.value)),
      );

    // Import/Export
    document
      .getElementById('exportData')
      .addEventListener('click', () => this.exportData());
    document
      .getElementById('importData')
      .addEventListener('click', () => this.showImportDialog());
    document
      .getElementById('importFile')
      .addEventListener('change', (e) => this.handleImportFile(e));

    // New event button
    document.getElementById('newEvent').addEventListener('click', () => {
      const today = new Date();
      if (today.getFullYear() !== this.currentYear) {
        today.setFullYear(this.currentYear);
        today.setMonth(0);
        today.setDate(1);
      }
      this.openEventEditor(null, today);
    });

    // Handle window resize events
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  /**
   * Load events for the specified year
   * @param {number} year - Year to load
   * @returns {Promise<void>}
   */
  async loadYear(year) {
    try {
      this.currentYear = year;
      document.getElementById('currentYear').value = year;

      // Clear existing events
      this.events = [];

      // Load events from storage
      const savedEvents = await this.storageAdapter.loadEvents(year);

      // Process recurring events
      const recurrenceCalculator = new RecurrenceCalculator(year);
      this.events = recurrenceCalculator.expandRecurringEvents(savedEvents);

      // Position events on the grid
      this.positionEvents();

      // Render the planner grid
      this.yearPlannerGrid.render(year, this.events);

      console.log(`Loaded ${this.events.length} events for year ${year}`);
    } catch (error) {
      console.error(`Failed to load year ${year}:`, error);
      this.displayErrorMessage(`Failed to load events for year ${year}.`);
    }
  }

  /**
   * Navigate to previous or next year
   * @param {number} offset - Year offset (-1 for previous, 1 for next)
   */
  navigateYear(offset) {
    this.loadYear(this.currentYear + offset);
  }

  /**
   * Position events using the EventPositionCalculator
   */
  positionEvents() {
    try {
      const positionedEvents = this.eventPositionCalculator.calculatePositions(
        this.events,
      );
      this.events = positionedEvents;
    } catch (error) {
      console.error('Error positioning events:', error);
      this.displayErrorMessage('Error calculating event positions.');
    }
  }

  /**
   * Handle click on a day cell
   * @param {Date} date - The date that was clicked
   */
  handleDayClick(date) {
    this.openEventEditor(null, date);
  }

  /**
   * Handle click on an existing event
   * @param {string} eventId - ID of the clicked event
   */
  handleEventClick(eventId) {
    const event = this.events.find((e) => e.id === eventId);
    if (event) {
      this.openEventEditor(event);
    } else {
      console.error(`Event with ID ${eventId} not found`);
    }
  }

  /**
   * Open the event editor modal
   * @param {Event|null} event - Event to edit, or null for new event
   * @param {Date} [defaultDate] - Default date for new events
   */
  openEventEditor(event, defaultDate) {
    try {
      const isNewEvent = !event;
      const dateToUse = defaultDate || new Date();

      if (isNewEvent) {
        // Create a new event with default values
        event = {
          id: this.generateUniqueId(),
          title: '',
          description: '',
          startDate: dateToUse,
          endDate: dateToUse,
          isRecurring: false,
          startsPM: false,
          endsAM: false,
          isPublicHoliday: false,
        };
      }

      this.eventEditorModal.open(event, isNewEvent);
    } catch (error) {
      console.error('Error opening event editor:', error);
      this.displayErrorMessage('Failed to open event editor.');
    }
  }

  /**
   * Handle saving an event from the editor
   * @param {Event} event - The event to save
   * @param {boolean} isNewEvent - Whether this is a new event
   */
  async handleEventSave(event, isNewEvent) {
    try {
      // Validate event dates are within the current year
      const startYear = event.startDate.getFullYear();
      const endYear = event.endDate.getFullYear();

      if (startYear !== this.currentYear || endYear !== this.currentYear) {
        throw new Error('Event dates must be within the current year.');
      }

      // Save event to storage
      await this.storageAdapter.saveEvent(event);

      // Refresh the events for the current year
      await this.loadYear(this.currentYear);

      this.displaySuccessMessage(
        isNewEvent
          ? 'Event created successfully.'
          : 'Event updated successfully.',
      );
    } catch (error) {
      console.error('Error saving event:', error);
      this.displayErrorMessage(`Failed to save event: ${error.message}`);
    }
  }

  /**
   * Handle deleting an event
   * @param {string} eventId - ID of the event to delete
   */
  async handleEventDelete(eventId) {
    try {
      await this.storageAdapter.deleteEvent(eventId);
      await this.loadYear(this.currentYear);
      this.displaySuccessMessage('Event deleted successfully.');
    } catch (error) {
      console.error('Error deleting event:', error);
      this.displayErrorMessage('Failed to delete event.');
    }
  }

  /**
   * Handle validation errors from the event editor
   * @param {string} errorMessage - Validation error message
   */
  handleValidationError(errorMessage) {
    this.displayErrorMessage(errorMessage);
  }

  /**
   * Export planner data to a JSON file
   */
  exportData() {
    try {
      this.storageAdapter
        .exportData(this.currentYear)
        .then((jsonData) => {
          const blob = new Blob([jsonData], { type: 'application/json' });
          const url = URL.createObjectURL(blob);

          const a = document.createElement('a');
          a.href = url;
          a.download = `year-planner-${this.currentYear}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          this.displaySuccessMessage('Data exported successfully.');
        })
        .catch((error) => {
          throw error;
        });
    } catch (error) {
      console.error('Error exporting data:', error);
      this.displayErrorMessage('Failed to export data.');
    }
  }

  /**
   * Show the import dialog
   */
  showImportDialog() {
    document.getElementById('importFile').click();
  }

  /**
   * Handle import file selection
   * @param {Event} event - File input change event
   */
  handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const jsonData = e.target.result;
        await this.storageAdapter.importData(jsonData);
        await this.loadYear(this.currentYear);
        this.displaySuccessMessage('Data imported successfully.');
      } catch (error) {
        console.error('Error importing data:', error);
        this.displayErrorMessage(
          'Failed to import data. The file may be invalid.',
        );
      }
    };

    reader.readAsText(file);
    event.target.value = ''; // Reset file input
  }

  /**
   * Handle window resize events
   */
  handleResize() {
    if (this.initialized) {
      this.yearPlannerGrid.updateLayout();
    }
  }

  /**
   * Generate a unique ID for new events
   * @returns {string} Unique ID
   */
  generateUniqueId() {
    return (
      'event_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    );
  }

  /**
   * Display an error message to the user
   * @param {string} message - Error message to display
   */
  displayErrorMessage(message) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = 'error';
    notification.style.display = 'block';

    setTimeout(() => {
      notification.style.display = 'none';
    }, 5000);
  }

  /**
   * Display a success message to the user
   * @param {string} message - Success message to display
   */
  displaySuccessMessage(message) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = 'success';
    notification.style.display = 'block';

    setTimeout(() => {
      notification.style.display = 'none';
    }, 3000);
  }
}

/**
 * Initialize the application when the DOM is fully loaded
 */
document.addEventListener('DOMContentLoaded', () => {
  const app = new YearPlannerApp();
  app.initialize();

  // Make app available globally for debugging
  window.yearPlannerApp = app;
});
