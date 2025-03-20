/**
 * run-tests.js - Node.js test runner for Year Planner
 * 
 * This script runs all tests for the Year Planner application.
 * It's designed to be run with Node.js, for example:
 * 
 * node run-tests.js
 */

// Polyfill for browser APIs that may be used in the tests
global.window = {};
global.localStorage = new (class {
  constructor() {
    this.store = {};
    this.length = 0;
  }

  key(index) {
    return Object.keys(this.store)[index];
  }

  getItem(key) {
    return this.store[key] || null;
  }

  setItem(key, value) {
    this.store[key] = String(value);
    this.length = Object.keys(this.store).length;
  }

  removeItem(key) {
    delete this.store[key];
    this.length = Object.keys(this.store).length;
  }

  clear() {
    this.store = {};
    this.length = 0;
  }
})();

global.document = {
  createElement() {
    return {
      style: {},
      attributes: {},
      children: [],
      eventListeners: {},
      setAttribute(name, value) {
        this.attributes[name] = value;
      },
      getAttribute(name) {
        return this.attributes[name];
      },
      appendChild(child) {
        this.children.push(child);
        child.parentNode = this;
      },
      addEventListener(event, callback) {
        if (!this.eventListeners[event]) {
          this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
      },
      dispatchEvent(event) {
        const listeners = this.eventListeners[event.type] || [];
        listeners.forEach(listener => listener(event));
      }
    };
  },
  body: {
    appendChild() {}
  },
  getElementById() {
    return null;
  }
};

global.CustomEvent = class CustomEvent {
  constructor(type, options = {}) {
    this.type = type;
    this.detail = options.detail || {};
  }
};

global.crypto = {
  randomUUID: () => Math.random().toString(36).substring(2, 15)
};

// Import test modules (using require since this is Node.js)
(async () => {
  try {
    console.log('=== Running Year Planner Tests ===\n');

    // Run domain model tests
    console.log('\n=== Domain Model Tests ===');
    const { runTests: runDomainTests } = await import('./domain/test-models.js');
    runDomainTests();

    // Run app tests
    console.log('\n=== Application Tests ===');
    const { runTests: runAppTests } = await import('./app.test.js');
    await runAppTests();

    // Run position calculator tests
    console.log('\n=== Position Calculator Tests ===');
    const { runTests: runPositionTests } = await import('./services/EventPositionCalculator.test.js');
    runPositionTests();

    // Run recurrence calculator tests
    console.log('\n=== Recurrence Calculator Tests ===');
    const { runTests: runRecurrenceTests } = await import('./services/RecurrenceCalculator.test.js');
    runRecurrenceTests();

    // Run storage adapter tests
    console.log('\n=== Storage Adapter Tests ===');
    const { testStorageAdapter } = await import('./infrastructure/StorageAdapter.test.js');
    testStorageAdapter();

    console.log('\n=== All Tests Completed ===');
  } catch (error) {
    console.error('Error running tests:', error);
    process.exit(1);
  }
})();