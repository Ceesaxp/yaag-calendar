/**
 * app.js - Main application controller for Year Planner
 *
 * Handles application initialization, event management, and state coordination
 * between components defined in the Year Planner Design Document.
 */

import { StorageAdapter } from './services/StorageAdapter.js';
import { RecurrenceCalculator } from './services/RecurrenceCalculator.js';
import { EventPositionCalculator } from './services/EventPositionCalculator.js';
import { Event, YearPlanner } from './domain/models.js';
import EventEditorModal from './components/EventEditorModal.js';

/**
 * Main application controller that orchestrates the Year Planner application
 */
class YearPlannerApp {
  /**
   * Create a new Year Planner application instance
   */
  constructor() {
    this.currentYear = new Date().getFullYear();
    this.yearPlanner = new YearPlanner({ year: this.currentYear });
    this.storageAdapter = null;
    this.yearPlannerGrid = null;
    this.eventEditorModal = null;
    this.eventPositionCalculator = null;
    this.recurrenceCalculator = null;
    this.initialized = false;
    this.loading = false;
    this.notificationTimeout = null;
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
      this.recurrenceCalculator = new RecurrenceCalculator(this.currentYear);

      // Create and append the event editor modal to the DOM
      this.createEventEditorModal();

      // Create and append the year planner grid to the DOM
      this.createYearPlannerGrid();

      // Create notification area if it doesn't exist
      this.createNotificationArea();

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
   * Create the event editor modal and add it to the DOM
   */
  createEventEditorModal() {
    this.eventEditorModal = document.createElement('event-editor-modal');
    document.body.appendChild(this.eventEditorModal);

    // Set up event listeners for the modal
    this.eventEditorModal.addEventListener('event-save', (e) => {
      this.handleEventSave(e.detail.event);
    });

    this.eventEditorModal.addEventListener('event-delete', (e) => {
      this.handleEventDelete(e.detail.eventId);
    });

    this.eventEditorModal.addEventListener('event-cancel', () => {
      console.log('Event edit cancelled');
    });
  }

  /**
   * Create the year planner grid and add it to the DOM
   */
  createYearPlannerGrid() {
    // Check if container exists, create if not
    let container = document.getElementById('year-planner-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'year-planner-container';
      document.body.appendChild(container);
    }

    this.yearPlannerGrid = document.createElement('year-planner-grid');
    container.appendChild(this.yearPlannerGrid);

    // Set up event listeners for the grid
    this.yearPlannerGrid.addEventListener('day-click', (e) => {
      this.handleDayClick(e.detail.date);
    });

    this.yearPlannerGrid.addEventListener('event-click', (e) => {
      this.handleEventClick(e.detail.eventId);
    });
  }

  /**
   * Create notification area for displaying messages to the user
   */
  createNotificationArea() {
    let notification = document.getElementById('notification');
    if (!notification) {
      notification = document.createElement('div');
      notification.id = 'notification';
      notification.style.position = 'fixed';
      notification.style.top = '20px';
      notification.style.right = '20px';
      notification.style.padding = '10px 20px';
      notification.style.borderRadius = '4px';
      notification.style.zIndex = '1000';
      notification.style.display = 'none';
      document.body.appendChild(notification);
    }
  }

  /**
   * Set up application event listeners
   */
  setupEventListeners() {
    // Control elements
    this.createApplicationControls();

    // Year navigation
    const prevYearBtn = document.getElementById('prevYear');
    const nextYearBtn = document.getElementById('nextYear');
    const yearSelect = document.getElementById('currentYear');

    if (prevYearBtn) {
      prevYearBtn.addEventListener('click', () => this.navigateYear(-1));
    }

    if (nextYearBtn) {
      nextYearBtn.addEventListener('click', () => this.navigateYear(1));
    }

    if (yearSelect) {
      yearSelect.addEventListener('change', (e) => {
        this.loadYear(parseInt(e.target.value));
      });
    }

    // Import/Export
    const exportBtn = document.getElementById('exportData');
    const importBtn = document.getElementById('importData');
    const importFile = document.getElementById('importFile');

    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportData());
    }

    if (importBtn) {
      importBtn.addEventListener('click', () => this.showImportDialog());
    }

    if (importFile) {
      importFile.addEventListener('change', (e) => this.handleImportFile(e));
    }

    // New event button
    const newEventBtn = document.getElementById('newEvent');

    if (newEventBtn) {
      newEventBtn.addEventListener('click', () => {
        const today = new Date();
        if (today.getFullYear() !== this.currentYear) {
          today.setFullYear(this.currentYear);
          today.setMonth(0);
          today.setDate(1);
        }
        this.openEventEditor(null, today);
      });
    }

    // Handle window resize events
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  /**
   * Create application control elements if they don't exist
   */
  createApplicationControls() {
    // Check if controls already exist
    if (document.getElementById('app-controls')) {
      return;
    }

    // Create control container
    const controlsContainer = document.createElement('div');
    controlsContainer.id = 'app-controls';
    controlsContainer.style.display = 'flex';
    controlsContainer.style.justifyContent = 'space-between';
    controlsContainer.style.alignItems = 'center';
    controlsContainer.style.padding = '10px';
    controlsContainer.style.marginBottom = '10px';
    controlsContainer.style.backgroundColor = '#f5f5f5';
    controlsContainer.style.borderRadius = '4px';

    // Year navigation
    const yearNav = document.createElement('div');
    yearNav.style.display = 'flex';
    yearNav.style.alignItems = 'center';
    yearNav.style.gap = '10px';

    const prevYearBtn = document.createElement('button');
    prevYearBtn.id = 'prevYear';
    prevYearBtn.textContent = '◀ Previous Year';
    prevYearBtn.style.padding = '5px 10px';

    const yearSelect = document.createElement('select');
    yearSelect.id = 'currentYear';
    // Populate select with reasonable year range
    const currentYear = new Date().getFullYear();
    for (let year = currentYear - 5; year <= currentYear + 5; year++) {
      const option = document.createElement('option');
      option.value = year;
      option.textContent = year;
      if (year === currentYear) {
        option.selected = true;
      }
      yearSelect.appendChild(option);
    }
    yearSelect.style.padding = '5px';

    const nextYearBtn = document.createElement('button');
    nextYearBtn.id = 'nextYear';
    nextYearBtn.textContent = 'Next Year ▶';
    nextYearBtn.style.padding = '5px 10px';

    yearNav.appendChild(prevYearBtn);
    yearNav.appendChild(yearSelect);
    yearNav.appendChild(nextYearBtn);

    // Event and data management
    const actionButtons = document.createElement('div');
    actionButtons.style.display = 'flex';
    actionButtons.style.gap = '10px';

    const newEventBtn = document.createElement('button');
    newEventBtn.id = 'newEvent';
    newEventBtn.textContent = '+ New Event';
    newEventBtn.style.padding = '5px 10px';
    newEventBtn.style.backgroundColor = '#4682B4';
    newEventBtn.style.color = 'white';
    newEventBtn.style.border = 'none';
    newEventBtn.style.borderRadius = '4px';
    newEventBtn.style.cursor = 'pointer';

    const exportBtn = document.createElement('button');
    exportBtn.id = 'exportData';
    exportBtn.textContent = 'Export Data';
    exportBtn.style.padding = '5px 10px';

    const importBtn = document.createElement('button');
    importBtn.id = 'importData';
    importBtn.textContent = 'Import Data';
    importBtn.style.padding = '5px 10px';

    const importFile = document.createElement('input');
    importFile.id = 'importFile';
    importFile.type = 'file';
    importFile.accept = '.json';
    importFile.style.display = 'none';

    actionButtons.appendChild(newEventBtn);
    actionButtons.appendChild(exportBtn);
    actionButtons.appendChild(importBtn);
    actionButtons.appendChild(importFile);

    // Append everything to controls container
    controlsContainer.appendChild(yearNav);
    controlsContainer.appendChild(actionButtons);

    // Add to DOM before the year planner container
    const container = document.getElementById('year-planner-container') || document.body;
    container.parentNode.insertBefore(controlsContainer, container);
  }

  /**
   * Load events for the specified year
   * @param {number} year - Year to load
   * @returns {Promise<void>}
   */
  async loadYear(year) {
    if (this.loading) return;
    
    this.loading = true;
    try {
      this.currentYear = year;
      const yearSelect = document.getElementById('currentYear');
      if (yearSelect) {
        yearSelect.value = year;
      }

      // Update recurrence calculator for new year
      this.recurrenceCalculator = new RecurrenceCalculator(year);
      
      // Create a new YearPlanner for this year
      this.yearPlanner = new YearPlanner({ year });

      // Load saved events from storage
      const savedEvents = await this.storageAdapter.loadEvents(year);
      
      // Add events to the year planner
      if (savedEvents && savedEvents.length > 0) {
        try {
          // Convert plain objects to Event instances
          const eventInstances = savedEvents.map(eventData => {
            return new Event({
              id: eventData.id,
              title: eventData.title,
              description: eventData.description,
              startDate: new Date(eventData.startDate),
              endDate: new Date(eventData.endDate),
              isRecurring: eventData.isRecurring,
              recurrencePattern: eventData.recurrencePattern,
              startsPM: eventData.startsPM,
              endsAM: eventData.endsAM,
              isPublicHoliday: eventData.isPublicHoliday
            });
          });

          // Add events to the year planner
          eventInstances.forEach(event => {
            try {
              this.yearPlanner.addEvent(event);
            } catch (error) {
              console.warn(`Skipping invalid event: ${error.message}`, event);
            }
          });
        } catch (error) {
          console.error('Error processing saved events:', error);
        }
      }
      
      // Process recurring events
      const expandedEvents = this.recurrenceCalculator.expandRecurringEvents(
        this.yearPlanner.events
      );
      
      // Calculate positions for the events
      const positionedEvents = this.eventPositionCalculator.calculatePositions(
        expandedEvents,
        year
      );
      
      // Update the year planner grid
      this.yearPlannerGrid.year = year;
      this.yearPlannerGrid.events = positionedEvents;
      
      console.log(`Loaded ${positionedEvents.length} events for year ${year}`);
    } catch (error) {
      console.error(`Failed to load year ${year}:`, error);
      this.displayErrorMessage(`Failed to load events for year ${year}: ${error.message}`);
    } finally {
      this.loading = false;
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
    // Find the event in the expanded events list
    const event = this.yearPlannerGrid.events.find(e => e.id === eventId);
    
    if (event) {
      // For recurrence instances, find the original event
      if (event.isRecurrenceInstance && event.originalEventId) {
        const originalEvent = this.yearPlanner.events.find(
          e => e.id === event.originalEventId
        );
        if (originalEvent) {
          this.openEventEditor(originalEvent);
          return;
        }
      }
      
      // Otherwise, open the event directly
      this.openEventEditor(event);
    } else {
      console.error(`Event with ID ${eventId} not found`);
      this.displayErrorMessage('Event not found. It may have been deleted.');
    }
  }

  /**
   * Open the event editor modal
   * @param {Event|null} event - Event to edit, or null for new event
   * @param {Date} [defaultDate] - Default date for new events
   */
  openEventEditor(event, defaultDate = new Date()) {
    try {
      // Ensure default date is in the current year
      if (defaultDate.getFullYear() !== this.currentYear) {
        defaultDate = new Date(this.currentYear, 0, 1);
      }
      
      // If creating a new event
      if (!event) {
        this.eventEditorModal.open();
      } else {
        // Clone the event to avoid modifying the original directly
        const eventCopy = { ...event };
        
        // Ensure dates are proper Date objects
        if (!(eventCopy.startDate instanceof Date)) {
          eventCopy.startDate = new Date(eventCopy.startDate);
        }
        
        if (!(eventCopy.endDate instanceof Date)) {
          eventCopy.endDate = new Date(eventCopy.endDate);
        }
        
        this.eventEditorModal.open(eventCopy);
      }
    } catch (error) {
      console.error('Error opening event editor:', error);
      this.displayErrorMessage(`Failed to open event editor: ${error.message}`);
    }
  }

  /**
   * Handle saving an event from the editor
   * @param {Object} eventData - The event data to save
   */
  async handleEventSave(eventData) {
    try {
      const isNewEvent = !this.yearPlanner.getEvent(eventData.id);
      
      // Validate event dates
      if (!eventData.startDate || !eventData.endDate) {
        throw new Error('Start and end dates are required');
      }
      
      // Ensure dates are Date objects
      const startDate = eventData.startDate instanceof Date 
        ? eventData.startDate 
        : new Date(eventData.startDate);
      
      const endDate = eventData.endDate instanceof Date 
        ? eventData.endDate 
        : new Date(eventData.endDate);
      
      // Validate event dates are within the current year
      const startYear = startDate.getFullYear();
      const endYear = endDate.getFullYear();
      
      if (startYear !== this.currentYear || endYear !== this.currentYear) {
        throw new Error('Event dates must be within the current year.');
      }
      
      // Create a proper Event instance
      const event = new Event({
        id: eventData.id,
        title: eventData.title,
        description: eventData.description || '',
        startDate: startDate,
        endDate: endDate,
        isRecurring: eventData.isRecurring || false,
        recurrencePattern: eventData.recurrencePattern,
        startsPM: eventData.startsPM || false,
        endsAM: eventData.endsAM || false,
        isPublicHoliday: eventData.isPublicHoliday || false
      });
      
      // Add or update the event in the year planner
      if (isNewEvent) {
        this.yearPlanner.addEvent(event);
      } else {
        this.yearPlanner.updateEvent(eventData.id, event);
      }
      
      // Save to storage
      await this.storageAdapter.saveEvent(event);
      
      // Reload the year to reflect changes
      await this.loadYear(this.currentYear);
      
      this.displaySuccessMessage(
        isNewEvent ? 'Event created successfully' : 'Event updated successfully'
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
      // First check if this is an expanded recurrence instance
      const event = this.yearPlannerGrid.events.find(e => e.id === eventId);
      
      if (event && event.isRecurrenceInstance && event.originalEventId) {
        // If it's a recurrence instance, delete the original recurring event
        eventId = event.originalEventId;
      }
      
      // Remove from the year planner
      const removed = this.yearPlanner.removeEvent(eventId);
      
      if (!removed) {
        console.warn(`Event ${eventId} not found in year planner`);
      }
      
      // Delete from storage
      await this.storageAdapter.deleteEvent(eventId);
      
      // Reload the year to reflect changes
      await this.loadYear(this.currentYear);
      
      this.displaySuccessMessage('Event deleted successfully');
    } catch (error) {
      console.error('Error deleting event:', error);
      this.displayErrorMessage(`Failed to delete event: ${error.message}`);
    }
  }

  /**
   * Export planner data to a JSON file
   */
  async exportData() {
    try {
      const jsonData = await this.storageAdapter.exportData(this.currentYear);
      
      // Create a download link for the JSON data
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `year-planner-${this.currentYear}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      this.displaySuccessMessage('Data exported successfully');
    } catch (error) {
      console.error('Error exporting data:', error);
      this.displayErrorMessage(`Failed to export data: ${error.message}`);
    }
  }

  /**
   * Show the import dialog
   */
  showImportDialog() {
    const importFile = document.getElementById('importFile');
    if (importFile) {
      importFile.click();
    } else {
      this.displayErrorMessage('Import file input not found');
    }
  }

  /**
   * Handle import file selection
   * @param {Event} event - File input change event
   */
  async handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
      const jsonData = await this.readFileAsText(file);
      
      // Import the data
      await this.storageAdapter.importData(jsonData);
      
      // Reload the current year to reflect changes
      await this.loadYear(this.currentYear);
      
      this.displaySuccessMessage('Data imported successfully');
    } catch (error) {
      console.error('Error importing data:', error);
      this.displayErrorMessage(`Failed to import data: ${error.message}`);
    } finally {
      // Reset the file input
      event.target.value = '';
    }
  }

  /**
   * Read a file as text
   * @param {File} file - The file to read
   * @returns {Promise<string>} The file contents as text
   */
  readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      
      reader.readAsText(file);
    });
  }

  /**
   * Handle window resize events
   */
  handleResize() {
    if (this.initialized && this.yearPlannerGrid) {
      // Force grid to recalculate layout
      const currentEvents = this.yearPlannerGrid.events;
      const currentYear = this.yearPlannerGrid.year;
      
      this.yearPlannerGrid.events = [];
      this.yearPlannerGrid.events = currentEvents;
    }
  }

  /**
   * Display an error message to the user
   * @param {string} message - Error message to display
   */
  displayErrorMessage(message) {
    this.displayNotification(message, 'error');
  }

  /**
   * Display a success message to the user
   * @param {string} message - Success message to display
   */
  displaySuccessMessage(message) {
    this.displayNotification(message, 'success');
  }

  /**
   * Display a notification message to the user
   * @param {string} message - Message to display
   * @param {string} type - Notification type ('error' or 'success')
   */
  displayNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    if (!notification) return;
    
    // Clear any existing timeout
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
    }
    
    // Set notification content and style
    notification.textContent = message;
    notification.style.display = 'block';
    
    if (type === 'error') {
      notification.style.backgroundColor = '#f44336';
      notification.style.color = 'white';
    } else if (type === 'success') {
      notification.style.backgroundColor = '#4CAF50';
      notification.style.color = 'white';
    } else {
      notification.style.backgroundColor = '#2196F3';
      notification.style.color = 'white';
    }
    
    // Auto-hide after delay
    this.notificationTimeout = setTimeout(() => {
      notification.style.display = 'none';
    }, type === 'error' ? 5000 : 3000);
  }
}

/**
 * Initialize the application when the DOM is fully loaded
 */
document.addEventListener('DOMContentLoaded', () => {
  const app = new YearPlannerApp();
  app.initialize().catch(error => {
    console.error('Failed to initialize application:', error);
    alert('Failed to initialize application. Please refresh and try again.');
  });

  // Make app available globally for debugging
  window.yearPlannerApp = app;
});
