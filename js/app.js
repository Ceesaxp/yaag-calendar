/**
 * app.js - Main application controller for Year Planner
 *
 * Handles application initialization, event management, and state coordination
 * between components defined in the Year Planner Design Document.
 */

// Use the services version of StorageAdapter
import { StorageAdapter } from './services/StorageAdapter.js';
import { RecurrenceCalculator } from './services/RecurrenceCalculator.js';
import { EventPositionCalculator } from './services/EventPositionCalculator.js';
import { Event, YearPlanner } from './domain/models.js';
import EventEditorModal from './components/EventEditorModal.js';
import { YearPlannerGrid } from './components/YearPlannerGrid.js';
import {
  normalizeDateToUTC,
  createDateOnly,
  compareDates,
  getDaysBetween,
} from './utils/DateUtils.js';
import {
  exportToPdf,
  exportToPdfUsingPrintStylesheet,
} from './utils/PdfExporter.js';
import UserManualModal from './components/UserManualModal.js';

// Log imports to help with debugging
console.log('Modules imported successfully');

/**
 * Main application controller that orchestrates the Year Planner application
 */
export class YearPlannerApp {
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
      console.log('Initializing Year Planner application...');

      // Initialize dependencies
      this.storageAdapter = new StorageAdapter();
      this.eventPositionCalculator = new EventPositionCalculator();
      this.recurrenceCalculator = new RecurrenceCalculator(this.currentYear);

      // Create notification area if it doesn't exist
      this.createNotificationArea();

      // Create application controls if they don't exist in the HTML
      this.createApplicationControls();

      // Set up event listeners for controls
      this.setupEventListeners();

      // Populate the year dropdown
      this.populateYearDropdown();

      // Create and append the event editor modal to the DOM
      this.createEventEditorModal();

      // Create and append the user manual modal to the DOM
      this.createUserManualModal();

      // Create and append the year planner grid to the DOM
      this.createYearPlannerGrid();

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
   * Populate the year dropdown with a range of years
   */
  populateYearDropdown() {
    const yearSelect = document.getElementById('currentYear');
    if (!yearSelect) return;

    // Clear existing options
    yearSelect.innerHTML = '';

    // Add options for a reasonable range of years
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 10;
    const endYear = currentYear + 10;

    for (let year = startYear; year <= endYear; year++) {
      const option = document.createElement('option');
      option.value = year;
      option.textContent = year;
      if (year === this.currentYear) {
        option.selected = true;
      }
      yearSelect.appendChild(option);
    }
  }

  /**
   * Create the event editor modal and add it to the DOM
   */
  createEventEditorModal() {
    // Ensure the EventEditorModal custom element is defined
    if (!customElements.get('event-editor-modal')) {
      customElements.define('event-editor-modal', EventEditorModal);
      console.log('Registered EventEditorModal custom element');
    }

    this.eventEditorModal = document.createElement('event-editor-modal');
    document.body.appendChild(this.eventEditorModal);
    console.log(
      'EventEditorModal element created and appended to document body',
    );

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
   * Create the user manual modal and add it to the DOM
   */
  createUserManualModal() {
    // Ensure the UserManualModal custom element is defined
    if (!customElements.get('user-manual-modal')) {
      customElements.define('user-manual-modal', UserManualModal);
      console.log('Registered UserManualModal custom element');
    }

    this.userManualModal = document.createElement('user-manual-modal');
    document.body.appendChild(this.userManualModal);
    console.log(
      'UserManualModal element created and appended to document body',
    );
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

    // Clear any existing grid to prevent duplicates
    if (this.yearPlannerGrid) {
      try {
        container.removeChild(this.yearPlannerGrid);
      } catch (e) {
        console.log('No existing grid to remove');
      }
    }

    // Ensure the YearPlannerGrid custom element is defined
    if (!customElements.get('year-planner-grid')) {
      customElements.define('year-planner-grid', YearPlannerGrid);
      console.log('Registered YearPlannerGrid custom element');
    }

    this.yearPlannerGrid = document.createElement('year-planner-grid');

    // Set explicit configuration for the grid
    this.yearPlannerGrid.setAttribute('show-year-in-header', 'true');
    this.yearPlannerGrid.setAttribute('first-column-width', 'narrow');

    container.appendChild(this.yearPlannerGrid);
    console.log('YearPlannerGrid element created and appended to container');

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
    // Year navigation
    const prevYearBtn = document.getElementById('prevYear');
    const nextYearBtn = document.getElementById('nextYear');
    const yearSelect = document.getElementById('currentYear');

    // Remove any existing event listeners to prevent duplicates
    if (prevYearBtn) {
      const newPrevBtn = prevYearBtn.cloneNode(true);
      prevYearBtn.parentNode.replaceChild(newPrevBtn, prevYearBtn);
      newPrevBtn.addEventListener('click', () => this.navigateYear(-1));
    }

    if (nextYearBtn) {
      const newNextBtn = nextYearBtn.cloneNode(true);
      nextYearBtn.parentNode.replaceChild(newNextBtn, nextYearBtn);
      newNextBtn.addEventListener('click', () => this.navigateYear(1));
    }

    if (yearSelect) {
      const newYearSelect = yearSelect.cloneNode(true);
      yearSelect.parentNode.replaceChild(newYearSelect, yearSelect);
      newYearSelect.addEventListener('change', (e) => {
        this.loadYear(parseInt(e.target.value));
      });
    }

    // Import/Export
    const exportBtn = document.getElementById('exportData');
    const importBtn = document.getElementById('importData');
    const exportPdfBtn = document.getElementById('exportPdf');
    const importFile = document.getElementById('importFile');
    const resetBtn = document.getElementById('resetCalendar');

    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportData());
    }

    if (importBtn) {
      importBtn.addEventListener('click', () => this.showImportDialog());
    }

    if (exportPdfBtn) {
      exportPdfBtn.addEventListener('click', () => this.exportToPdf());
    }

    if (importFile) {
      importFile.addEventListener('change', (e) => this.handleImportFile(e));
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.handleResetCalendar());
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

    // User manual button
    const userManualBtn = document.getElementById('userManual');

    if (userManualBtn) {
      userManualBtn.addEventListener('click', () => {
        this.openUserManual();
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
    yearNav.id = 'year-navigation';

    const prevYearBtn = document.createElement('button');
    prevYearBtn.id = 'prevYear';
    prevYearBtn.textContent = '◀ Previous';
    prevYearBtn.style.padding = '5px 10px';

    const yearSelect = document.createElement('select');
    yearSelect.id = 'currentYear';
    yearSelect.style.padding = '5px';
    // We'll populate the select in the initialize method

    const nextYearBtn = document.createElement('button');
    nextYearBtn.id = 'nextYear';
    nextYearBtn.textContent = 'Next ▶';
    nextYearBtn.style.padding = '5px 10px';

    yearNav.appendChild(prevYearBtn);
    yearNav.appendChild(yearSelect);
    yearNav.appendChild(nextYearBtn);

    // Event and data management
    const actionButtons = document.createElement('div');
    actionButtons.style.display = 'flex';
    actionButtons.style.gap = '10px';
    actionButtons.style.alignItems = 'center';

    // User Manual button
    const userManualBtn = document.createElement('button');
    userManualBtn.id = 'userManual';
    userManualBtn.textContent = 'Help';
    userManualBtn.style.padding = '5px 10px';
    userManualBtn.style.backgroundColor = '#f8f9fa';
    userManualBtn.style.color = '#212529';
    userManualBtn.style.borderRadius = '4px';
    userManualBtn.style.border = '1px solid #ced4da';
    userManualBtn.style.cursor = 'pointer';

    // Separator after User Manual
    const separator1 = document.createElement('div');
    separator1.style.width = '1px';
    separator1.style.height = '20px';
    separator1.style.backgroundColor = '#ced4da';
    separator1.style.margin = '0 16px';

    const newEventBtn = document.createElement('button');
    newEventBtn.id = 'newEvent';
    newEventBtn.textContent = '+ New Event';
    newEventBtn.style.padding = '5px 10px';
    newEventBtn.style.backgroundColor = '#4682B4';
    newEventBtn.style.color = 'white';
    newEventBtn.style.border = 'none';
    newEventBtn.style.borderRadius = '4px';
    newEventBtn.style.cursor = 'pointer';

    // Import/Export group
    const importExportGroup = document.createElement('div');
    importExportGroup.style.display = 'flex';
    importExportGroup.style.gap = '10px';
    importExportGroup.style.alignItems = 'center';

    const exportBtn = document.createElement('button');
    exportBtn.id = 'exportData';
    exportBtn.textContent = 'Export Data';
    exportBtn.style.padding = '5px 10px';
    exportBtn.style.borderRadius = '4px';
    exportBtn.style.border = '1px solid #ced4da';
    exportBtn.style.cursor = 'pointer';

    const importBtn = document.createElement('button');
    importBtn.id = 'importData';
    importBtn.textContent = 'Import Data';
    importBtn.style.padding = '5px 10px';
    importBtn.style.borderRadius = '4px';
    importBtn.style.border = '1px solid #ced4da';
    importBtn.style.cursor = 'pointer';

    const exportPdfBtn = document.createElement('button');
    exportPdfBtn.id = 'exportPdf';
    exportPdfBtn.textContent = 'Export to PDF';
    exportPdfBtn.style.padding = '5px 10px';
    exportPdfBtn.style.borderRadius = '4px';
    exportPdfBtn.style.border = '1px solid #ced4da';
    exportPdfBtn.style.cursor = 'pointer';

    // Separator before Reset button
    const separator2 = document.createElement('div');
    separator2.style.width = '1px';
    separator2.style.height = '20px';
    separator2.style.backgroundColor = '#ced4da';
    separator2.style.margin = '0 16px';

    const resetBtn = document.createElement('button');
    resetBtn.id = 'resetCalendar';
    resetBtn.textContent = 'Reset';
    resetBtn.style.padding = '5px 10px';
    resetBtn.style.backgroundColor = '#f44336';
    resetBtn.style.color = 'white';
    resetBtn.style.border = 'none';
    resetBtn.style.borderRadius = '4px';
    resetBtn.style.cursor = 'pointer';

    const importFile = document.createElement('input');
    importFile.id = 'importFile';
    importFile.type = 'file';
    importFile.accept = '.json';
    importFile.style.display = 'none';

    // Add buttons to the action buttons container
    actionButtons.appendChild(userManualBtn);
    actionButtons.appendChild(separator1);
    actionButtons.appendChild(newEventBtn);
    actionButtons.appendChild(importExportGroup);

    // Add buttons to import/export group
    importExportGroup.appendChild(exportBtn);
    importExportGroup.appendChild(importBtn);
    importExportGroup.appendChild(exportPdfBtn);
    importExportGroup.appendChild(separator2);
    importExportGroup.appendChild(resetBtn);
    importExportGroup.appendChild(importFile);

    // Append everything to controls container
    controlsContainer.appendChild(yearNav);
    controlsContainer.appendChild(actionButtons);

    // Add to DOM before the year planner container
    const container =
      document.getElementById('year-planner-container') || document.body;
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

      // Update the year dropdown to reflect the current year
      const yearSelect = document.getElementById('currentYear');
      if (yearSelect) {
        // Check if the year exists in the dropdown
        let yearOption = Array.from(yearSelect.options).find(
          (option) => parseInt(option.value) === year,
        );

        // If the year doesn't exist in the dropdown, add it
        if (!yearOption) {
          yearOption = document.createElement('option');
          yearOption.value = year;
          yearOption.textContent = year;
          yearSelect.appendChild(yearOption);

          // Sort the options
          const options = Array.from(yearSelect.options);
          options.sort((a, b) => parseInt(a.value) - parseInt(b.value));
          yearSelect.innerHTML = '';
          options.forEach((option) => yearSelect.appendChild(option));
        }

        // Set the selected value
        yearSelect.value = year;
      }

      // Set the year as a data attribute on body for print stylesheet
      document.body.dataset.year = year;

      // Update recurrence calculator for new year
      this.recurrenceCalculator = new RecurrenceCalculator(year);

      // Create a new YearPlanner for this year
      this.yearPlanner = new YearPlanner({ year });

      // Load saved events from storage
      const savedEvents = await this.storageAdapter.loadEvents(year);
      console.log(
        'App: Loaded events from storage',
        savedEvents ? savedEvents.length : 0,
        savedEvents,
      );

      // Add events to the year planner
      if (savedEvents && savedEvents.length > 0) {
        try {
          // Convert plain objects to Event instances
          const eventInstances = savedEvents.map((eventData) => {
            return new Event({
              id: eventData.id,
              title: eventData.title,
              description: eventData.description,
              startDate: normalizeDateToUTC(eventData.startDate),
              endDate: normalizeDateToUTC(eventData.endDate),
              isRecurring: eventData.isRecurring,
              recurrencePattern: eventData.recurrencePattern,
              startsPM: eventData.startsPM,
              endsAM: eventData.endsAM,
              isPublicHoliday: eventData.isPublicHoliday,
            });
          });

          // Add events to the year planner
          eventInstances.forEach((event) => {
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
        this.yearPlanner.events,
      );

      // Calculate positions for the events
      const positionedEvents = this.eventPositionCalculator.calculatePositions(
        expandedEvents,
        year,
      );

      console.log(
        'App: Calculated event positions',
        positionedEvents.length,
        positionedEvents,
      );

      // Update the year planner grid using batch method to prevent double render/flicker
      this.yearPlannerGrid.setYearAndEvents(year, positionedEvents);

      console.log(`Loaded ${positionedEvents.length} events for year ${year}`);
    } catch (error) {
      console.error(`Failed to load year ${year}:`, error);
      this.displayErrorMessage(
        `Failed to load events for year ${year}: ${error.message}`,
      );
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
    const event = this.yearPlannerGrid.events.find((e) => e.id === eventId);

    if (event) {
      // For recurrence instances, find the original event
      if (event.isRecurrenceInstance && event.originalEventId) {
        const originalEvent = this.yearPlanner.events.find(
          (e) => e.id === event.originalEventId,
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
      // Normalize default date to midnight UTC and ensure it's in the current year
      defaultDate = normalizeDateToUTC(defaultDate);
      if (defaultDate.getFullYear() !== this.currentYear) {
        defaultDate = createDateOnly(this.currentYear, 0, 1);
      }

      // If creating a new event
      if (!event) {
        this.eventEditorModal.open(null, defaultDate);
      } else {
        // Clone the event to avoid modifying the original directly
        const eventCopy = { ...event };

        // Ensure dates are proper Date objects and normalized to midnight UTC
        eventCopy.startDate = normalizeDateToUTC(eventCopy.startDate);
        eventCopy.endDate = normalizeDateToUTC(eventCopy.endDate);

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

      // Normalize dates to midnight UTC
      let startDate = normalizeDateToUTC(eventData.startDate);
      let endDate = normalizeDateToUTC(eventData.endDate);

      // Log dates for debugging
      console.log('Start date before validation:', startDate);
      console.log('End date before validation:', endDate);

      // Ensure end date is not before start date
      if (endDate < startDate) {
        // If end date is before start date, swap them
        console.log('Swapping dates because end date is before start date');
        const temp = endDate;
        endDate = startDate;
        startDate = temp;
      }

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
        isPublicHoliday: eventData.isPublicHoliday || false,
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
        isNewEvent
          ? 'Event created successfully'
          : 'Event updated successfully',
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
      console.log(`Attempting to delete event: ${eventId}`);

      // First check if this is an expanded recurrence instance
      const event = this.yearPlannerGrid.events.find((e) => e.id === eventId);
      let originalEventId = eventId;

      if (event && event.isRecurrenceInstance && event.originalEventId) {
        // If it's a recurrence instance, use the original event ID
        console.log(
          `Found recurrence instance, original ID: ${event.originalEventId}`,
        );
        originalEventId = event.originalEventId;
      }

      // Check if the original event actually exists in the year planner
      const originalEventExists = this.yearPlanner.events.some(
        (e) => e.id === originalEventId,
      );

      if (!originalEventExists) {
        console.warn(
          `Original event ${originalEventId} not found in year planner`,
        );
        // Try fallback to ID without date suffix
        const baseId = originalEventId.split('_').slice(0, -1).join('_');
        console.log(`Trying base ID: ${baseId}`);

        if (this.yearPlanner.events.some((e) => e.id === baseId)) {
          originalEventId = baseId;
        }
      }

      // Remove from the year planner
      const removed = this.yearPlanner.removeEvent(originalEventId);

      if (!removed) {
        console.warn(`Event ${originalEventId} not found in year planner`);
      }

      // Delete from storage
      await this.storageAdapter.deleteEvent(originalEventId);

      // Clear the recurrence calculator cache
      this.recurrenceCalculator.clearCache();

      // Reload the year to reflect changes
      await this.loadYear(this.currentYear);

      this.displaySuccessMessage('Event deleted successfully');
    } catch (error) {
      console.error('Error deleting event:', error);
      this.displayErrorMessage(`Failed to delete event: ${error.message}`);
    }
  }

  /**
   * Handle resetting the calendar
   */
  async handleResetCalendar() {
    try {
      // Show confirmation dialog
      const confirmed = confirm(
        'Are you sure you want to reset the calendar? This will delete all events.',
      );
      if (!confirmed) return;

      // Show second confirmation dialog
      const secondConfirmation = prompt(
        'This action cannot be undone. Type "Yes, I understand" to confirm.',
      );
      if (secondConfirmation !== 'Yes, I understand') return;

      // Clear all data
      await this.storageAdapter.clearAllData();

      // Reload the year to reflect changes
      await this.loadYear(this.currentYear);

      this.displaySuccessMessage('Calendar reset successfully');
    } catch (error) {
      console.error('Error resetting calendar:', error);
      this.displayErrorMessage(`Failed to reset calendar: ${error.message}`);
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
   * Export the current year planner to PDF
   */
  async exportToPdf() {
    try {
      this.displayNotification('Preparing PDF export...', 'info');

      // Ensure all events are rendered before exporting
      await this.refreshGrid();

      // Try the print stylesheet method first
      try {
        const pdfBlob = await exportToPdfUsingPrintStylesheet({
          year: this.currentYear,
        });

        // Create a download link for the PDF
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `year-planner-${this.currentYear}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.displaySuccessMessage('PDF exported successfully');
        return;
      } catch (printError) {
        console.warn(
          'Print stylesheet method failed, falling back to direct rendering:',
          printError,
        );
      }

      // Fallback to direct rendering method
      // Get the grid element and legend element
      const gridElement = this.yearPlannerGrid;
      const legendElement = document.querySelector('.event-legend');

      if (!gridElement) {
        throw new Error('Year planner grid not found');
      }

      // Generate the PDF
      const pdfBlob = await exportToPdf({
        year: this.currentYear,
        gridElement,
        legendElement,
      });

      // Create a download link for the PDF
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `year-planner-${this.currentYear}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.displaySuccessMessage('PDF exported successfully');
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      this.displayErrorMessage(`Failed to export PDF: ${error.message}`);
    }
  }

  /**
   * Handle window resize events
   */
  handleResize() {
    if (this.initialized && this.yearPlannerGrid) {
      // Force grid to recalculate layout
      this.refreshGrid();
    }
  }

  /**
   * Refresh the grid to ensure all events are properly rendered
   * @returns {Promise<void>}
   */
  async refreshGrid() {
    if (this.initialized && this.yearPlannerGrid) {
      // Force grid to recalculate layout
      const currentEvents = this.yearPlannerGrid.events;
      const currentYear = this.yearPlannerGrid.year;

      this.yearPlannerGrid.events = [];

      // Wait a moment for the DOM to update
      await new Promise((resolve) => setTimeout(resolve, 50));

      this.yearPlannerGrid.events = currentEvents;

      // Wait for events to be rendered
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  /**
   * Open the user manual modal
   */
  openUserManual() {
    if (this.userManualModal) {
      this.userManualModal.open();
    } else {
      console.error('User manual modal not initialized');
      this.displayErrorMessage('Could not open user manual');
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
    this.notificationTimeout = setTimeout(
      () => {
        notification.style.display = 'none';
      },
      type === 'error' ? 5000 : 3000,
    );
  }
}

/**
 * Initialize the application when the DOM is fully loaded
 */
document.addEventListener('DOMContentLoaded', () => {
  // Check for debug parameter in URL
  const urlParams = new URLSearchParams(window.location.search);
  const debugEnabled = urlParams.get('debugEnabled') === 'true';

  // Set up debug mode based on URL parameter
  if (!debugEnabled) {
    // Hide debug tools if not enabled
    const debugTools = document.getElementById('debug-tools');
    if (debugTools) {
      debugTools.style.display = 'none';
    }

    // Override console.log to suppress debug messages
    const originalConsoleLog = console.log;
    console.log = function (...args) {
      // Allow error and warn to pass through
      if (
        (typeof args[0] === 'string' && args[0].includes('Error')) ||
        args[0].includes('Failed')
      ) {
        originalConsoleLog.apply(console, args);
      }
      // Otherwise suppress debug logs
    };
  }

  const app = new YearPlannerApp();
  app.initialize().catch((error) => {
    console.error('Failed to initialize application:', error);
    alert('Failed to initialize application. Please refresh and try again.');
  });

  // Make app available globally for debugging
  window.yearPlannerApp = app;
});
