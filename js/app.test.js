/**
 * app.test.js - Tests for core application functions
 * 
 * This test suite covers the core application functions:
 * - Adding events
 * - Modifying events
 * - Deleting events
 */

import { YearPlannerApp } from './app.js';
import { Event } from './domain/models.js';

// Mock implementations for dependencies
class MockStorageAdapter {
  constructor() {
    this.events = {};
    this.currentYear = new Date().getFullYear();
  }

  checkStorageAvailability() {
    return true;
  }

  async loadEvents(year) {
    return this.events[year] || [];
  }

  async saveEvent(event) {
    const year = event.startDate.getFullYear();
    if (!this.events[year]) {
      this.events[year] = [];
    }
    
    // Find and replace if exists, otherwise add
    const index = this.events[year].findIndex(e => e.id === event.id);
    if (index >= 0) {
      this.events[year][index] = event;
    } else {
      this.events[year].push(event);
    }
    
    return true;
  }

  async deleteEvent(eventId) {
    let deleted = false;
    
    for (const year in this.events) {
      const initialLength = this.events[year].length;
      this.events[year] = this.events[year].filter(e => e.id !== eventId);
      
      if (this.events[year].length < initialLength) {
        deleted = true;
      }
    }
    
    return deleted;
  }

  getStoredYears() {
    return Object.keys(this.events).map(Number);
  }

  async exportData(year) {
    if (year) {
      return JSON.stringify({ [year]: this.events[year] || [] });
    }
    
    return JSON.stringify(this.events);
  }

  async importData(jsonData) {
    const data = JSON.parse(jsonData);
    
    for (const year in data) {
      this.events[year] = data[year].map(event => ({
        ...event,
        startDate: new Date(event.startDate),
        endDate: new Date(event.endDate)
      }));
    }
    
    return true;
  }
}

// Element mocks
class MockElement {
  constructor() {
    this.style = {};
    this.attributes = {};
    this.children = [];
    this.eventListeners = {};
  }
  
  setAttribute(name, value) {
    this.attributes[name] = value;
  }
  
  getAttribute(name) {
    return this.attributes[name];
  }
  
  appendChild(child) {
    this.children.push(child);
    child.parentNode = this;
  }
  
  addEventListener(event, callback) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }
  
  dispatchEvent(event) {
    const listeners = this.eventListeners[event.type] || [];
    listeners.forEach(listener => listener(event));
  }
}

class MockEventEditorModal extends MockElement {
  constructor() {
    super();
    this.isOpen = false;
    this.currentEvent = null;
  }
  
  open(event) {
    this.isOpen = true;
    this.currentEvent = event;
  }
  
  close() {
    this.isOpen = false;
    this.currentEvent = null;
  }
  
  triggerSave(event) {
    this.dispatchEvent(new CustomEvent('event-save', { detail: { event } }));
  }
  
  triggerDelete(eventId) {
    this.dispatchEvent(new CustomEvent('event-delete', { detail: { eventId } }));
  }
  
  triggerCancel() {
    this.dispatchEvent(new CustomEvent('event-cancel'));
  }
}

class MockYearPlannerGrid extends MockElement {
  constructor() {
    super();
    this._events = [];
    this._year = new Date().getFullYear();
  }
  
  get events() {
    return this._events;
  }
  
  set events(newEvents) {
    this._events = newEvents;
  }
  
  get year() {
    return this._year;
  }
  
  set year(newYear) {
    this._year = newYear;
  }
  
  triggerDayClick(date) {
    this.dispatchEvent(new CustomEvent('day-click', { detail: { date } }));
  }
  
  triggerEventClick(eventId) {
    this.dispatchEvent(new CustomEvent('event-click', { detail: { eventId } }));
  }
}

// Setup DOM mocks
global.document = {
  getElementById: (id) => null,
  createElement: (tagName) => {
    if (tagName === 'event-editor-modal') {
      return new MockEventEditorModal();
    } else if (tagName === 'year-planner-grid') {
      return new MockYearPlannerGrid();
    } else {
      return new MockElement();
    }
  },
  body: new MockElement()
};

global.CustomEvent = class CustomEvent {
  constructor(type, options = {}) {
    this.type = type;
    this.detail = options.detail || {};
  }
};

/**
 * Run tests and log results
 */
async function runTests() {
  console.log('=== Running Year Planner core application function tests ===');

  // Test Event adding, modifying, and deleting
  await testAddEvent();
  await testModifyEvent();
  await testDeleteEvent();
  
  // Test event operations via UI components
  await testAddEventViaModal();
  await testModifyEventViaModal();
  await testDeleteEventViaModal();
  
  // Test day and event click handlers
  await testDayClick();
  await testEventClick();

  console.log('=== All application tests completed ===');
}

/**
 * Test adding a new event programmatically
 */
async function testAddEvent() {
  console.log('Testing adding a new event...');
  
  // Create app with mocked dependencies
  const app = new YearPlannerApp();
  app.storageAdapter = new MockStorageAdapter();
  app.createEventEditorModal();
  app.createYearPlannerGrid();
  app.yearPlanner.year = 2025;
  app.currentYear = 2025;
  
  // Create test event
  const startDate = new Date(2025, 5, 15); // June 15, 2025
  const endDate = new Date(2025, 5, 17);   // June 17, 2025
  
  const newEvent = new Event({
    title: 'Test Conference',
    description: 'Annual test conference',
    startDate,
    endDate,
    isRecurring: false
  });
  
  // Save the event
  await app.handleEventSave(newEvent);
  
  // Verify it was added correctly
  const events = await app.storageAdapter.loadEvents(2025);
  console.assert(events.length === 1, `Expected 1 event, got ${events.length}`);
  console.assert(events[0].title === 'Test Conference', `Expected title 'Test Conference', got '${events[0].title}'`);
  console.assert(events[0].startDate.getTime() === startDate.getTime(), 'Start date should match');
  console.assert(events[0].endDate.getTime() === endDate.getTime(), 'End date should match');
  
  console.log('Add event test completed');
}

/**
 * Test modifying an existing event programmatically
 */
async function testModifyEvent() {
  console.log('Testing modifying an event...');
  
  // Create app with mocked dependencies
  const app = new YearPlannerApp();
  app.storageAdapter = new MockStorageAdapter();
  app.createEventEditorModal();
  app.createYearPlannerGrid();
  app.yearPlanner.year = 2025;
  app.currentYear = 2025;
  
  // Create and save initial event
  const startDate = new Date(2025, 5, 15); // June 15, 2025
  const endDate = new Date(2025, 5, 17);   // June 17, 2025
  
  const initialEvent = new Event({
    title: 'Initial Title',
    description: 'Initial Description',
    startDate,
    endDate,
    isRecurring: false
  });
  
  // Save the event
  await app.handleEventSave(initialEvent);
  
  // Now modify the event
  const modifiedEvent = {
    ...initialEvent,
    title: 'Modified Title',
    description: 'Modified Description',
    startDate: new Date(2025, 6, 15), // July 15, 2025
    endDate: new Date(2025, 6, 17)    // July 17, 2025
  };
  
  // Save the modified event
  await app.handleEventSave(modifiedEvent);
  
  // Verify it was modified correctly
  const events = await app.storageAdapter.loadEvents(2025);
  console.assert(events.length === 1, `Expected 1 event, got ${events.length}`);
  console.assert(events[0].title === 'Modified Title', `Expected title 'Modified Title', got '${events[0].title}'`);
  console.assert(events[0].description === 'Modified Description', `Expected description 'Modified Description', got '${events[0].description}'`);
  console.assert(
    events[0].startDate.getMonth() === 6,
    `Expected start date month 6 (July), got ${events[0].startDate.getMonth()}`
  );
  
  console.log('Modify event test completed');
}

/**
 * Test deleting an event programmatically
 */
async function testDeleteEvent() {
  console.log('Testing deleting an event...');
  
  // Create app with mocked dependencies
  const app = new YearPlannerApp();
  app.storageAdapter = new MockStorageAdapter();
  app.createEventEditorModal();
  app.createYearPlannerGrid();
  app.yearPlanner.year = 2025;
  app.currentYear = 2025;
  
  // Create and save an event
  const event = new Event({
    title: 'Event to Delete',
    description: 'This event will be deleted',
    startDate: new Date(2025, 5, 15),
    endDate: new Date(2025, 5, 17),
    isRecurring: false
  });
  
  // Save the event
  await app.handleEventSave(event);
  
  // Verify it was saved
  let events = await app.storageAdapter.loadEvents(2025);
  console.assert(events.length === 1, `Expected 1 event, got ${events.length}`);
  
  // Delete the event
  await app.handleEventDelete(event.id);
  
  // Verify it was deleted
  events = await app.storageAdapter.loadEvents(2025);
  console.assert(events.length === 0, `Expected 0 events after deletion, got ${events.length}`);
  
  console.log('Delete event test completed');
}

/**
 * Test adding a new event via modal interaction
 */
async function testAddEventViaModal() {
  console.log('Testing adding a new event via modal...');
  
  // Create app with mocked dependencies
  const app = new YearPlannerApp();
  app.storageAdapter = new MockStorageAdapter();
  app.createEventEditorModal();
  app.createYearPlannerGrid();
  app.yearPlanner.year = 2025;
  app.currentYear = 2025;
  
  // Open event editor for new event
  const date = new Date(2025, 3, 15); // April 15, 2025
  app.openEventEditor(null, date);
  
  // Verify modal was opened without an event
  console.assert(app.eventEditorModal.isOpen, 'Modal should be open');
  console.assert(app.eventEditorModal.currentEvent === undefined, 'Modal should not have an event');
  
  // Create a new event through the modal
  const newEvent = new Event({
    title: 'Modal Created Event',
    description: 'Event created through modal',
    startDate: date,
    endDate: new Date(2025, 3, 16),
    isRecurring: false
  });
  
  // Trigger save event
  app.eventEditorModal.triggerSave(newEvent);
  
  // Verify it was added
  const events = await app.storageAdapter.loadEvents(2025);
  console.assert(events.length === 1, `Expected 1 event, got ${events.length}`);
  console.assert(events[0].title === 'Modal Created Event', `Expected title 'Modal Created Event', got '${events[0].title}'`);
  
  console.log('Add event via modal test completed');
}

/**
 * Test modifying an event via modal interaction
 */
async function testModifyEventViaModal() {
  console.log('Testing modifying an event via modal...');
  
  // Create app with mocked dependencies
  const app = new YearPlannerApp();
  app.storageAdapter = new MockStorageAdapter();
  app.createEventEditorModal();
  app.createYearPlannerGrid();
  app.yearPlanner.year = 2025;
  app.currentYear = 2025;
  
  // Create and save initial event
  const initialEvent = new Event({
    title: 'Initial Modal Event',
    description: 'Initial Description',
    startDate: new Date(2025, 5, 15),
    endDate: new Date(2025, 5, 17),
    isRecurring: false
  });
  
  // Save the event
  await app.handleEventSave(initialEvent);
  
  // Open event editor for the existing event
  app.openEventEditor(initialEvent);
  
  // Verify modal was opened with the event
  console.assert(app.eventEditorModal.isOpen, 'Modal should be open');
  console.assert(app.eventEditorModal.currentEvent.id === initialEvent.id, 'Modal should have the correct event');
  
  // Modify the event through the modal
  const modifiedEvent = {
    ...initialEvent,
    title: 'Modified Modal Event',
    description: 'Modified through modal'
  };
  
  // Trigger save event
  app.eventEditorModal.triggerSave(modifiedEvent);
  
  // Verify it was modified
  const events = await app.storageAdapter.loadEvents(2025);
  console.assert(events.length === 1, `Expected 1 event, got ${events.length}`);
  console.assert(events[0].title === 'Modified Modal Event', `Expected title 'Modified Modal Event', got '${events[0].title}'`);
  console.assert(events[0].description === 'Modified through modal', `Expected updated description`);
  
  console.log('Modify event via modal test completed');
}

/**
 * Test deleting an event via modal interaction
 */
async function testDeleteEventViaModal() {
  console.log('Testing deleting an event via modal...');
  
  // Create app with mocked dependencies
  const app = new YearPlannerApp();
  app.storageAdapter = new MockStorageAdapter();
  app.createEventEditorModal();
  app.createYearPlannerGrid();
  app.yearPlanner.year = 2025;
  app.currentYear = 2025;
  
  // Create and save an event
  const event = new Event({
    title: 'Modal Event to Delete',
    description: 'This event will be deleted via modal',
    startDate: new Date(2025, 5, 15),
    endDate: new Date(2025, 5, 17),
    isRecurring: false
  });
  
  // Save the event
  await app.handleEventSave(event);
  
  // Open event editor for the event
  app.openEventEditor(event);
  
  // Verify modal was opened with the event
  console.assert(app.eventEditorModal.isOpen, 'Modal should be open');
  
  // Trigger delete event
  app.eventEditorModal.triggerDelete(event.id);
  
  // Verify it was deleted
  const events = await app.storageAdapter.loadEvents(2025);
  console.assert(events.length === 0, `Expected 0 events after deletion, got ${events.length}`);
  
  console.log('Delete event via modal test completed');
}

/**
 * Test day click handler
 */
async function testDayClick() {
  console.log('Testing day click handler...');
  
  // Create app with mocked dependencies
  const app = new YearPlannerApp();
  app.storageAdapter = new MockStorageAdapter();
  app.createEventEditorModal();
  app.createYearPlannerGrid();
  app.yearPlanner.year = 2025;
  app.currentYear = 2025;
  
  // Simulate day click
  const clickDate = new Date(2025, 7, 10); // August 10, 2025
  app.yearPlannerGrid.triggerDayClick(clickDate);
  
  // Verify modal was opened for new event with the clicked date
  console.assert(app.eventEditorModal.isOpen, 'Modal should be open after day click');
  console.assert(app.eventEditorModal.currentEvent === undefined, 'No event should be set for new event creation');
  
  console.log('Day click handler test completed');
}

/**
 * Test event click handler
 */
async function testEventClick() {
  console.log('Testing event click handler...');
  
  // Create app with mocked dependencies
  const app = new YearPlannerApp();
  app.storageAdapter = new MockStorageAdapter();
  app.createEventEditorModal();
  app.createYearPlannerGrid();
  app.yearPlanner.year = 2025;
  app.currentYear = 2025;
  
  // Create and save an event
  const event = new Event({
    title: 'Clickable Event',
    description: 'Event to be clicked',
    startDate: new Date(2025, 5, 15),
    endDate: new Date(2025, 5, 17),
    isRecurring: false
  });
  
  // Add event to app's data structures
  await app.handleEventSave(event);
  
  // Add the event to the grid's event list
  app.yearPlannerGrid.events = [event];
  
  // Simulate event click
  app.yearPlannerGrid.triggerEventClick(event.id);
  
  // Verify modal was opened with the clicked event
  console.assert(app.eventEditorModal.isOpen, 'Modal should be open after event click');
  
  console.log('Event click handler test completed');
}

// Run all tests
runTests().catch(error => {
  console.error('Error running tests:', error);
});

// Export for browser environment
if (typeof window !== 'undefined') {
  window.runYearPlannerAppTests = runTests;
}

export { runTests };