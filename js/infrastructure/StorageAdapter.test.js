/**
 * StorageAdapter.test.js
 * Test functionality of the StorageAdapter
 */

import {
  StorageAdapter,
  YearPlanner,
  Event,
  RecurrencePattern,
} from './StorageAdapter.js';

// Mock localStorage for testing in Node environment
class LocalStorageMock {
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
}

// Only set up mock if running in Node environment
if (typeof localStorage === 'undefined') {
  global.localStorage = new LocalStorageMock();
  global.crypto = {
    randomUUID: () => Math.random().toString(36).substring(2, 15),
  };
}

// Test function to validate the StorageAdapter
function testStorageAdapter() {
  console.log('Running StorageAdapter tests...');

  // Clear localStorage before tests
  localStorage.clear();

  // Create a test adapter
  const adapter = new StorageAdapter('test_yearPlanner');

  // Create a sample YearPlanner with events
  const currentYear = 2023;
  const planner = new YearPlanner(currentYear, [
    new Event({
      title: 'Annual Conference',
      description: 'Company annual conference',
      startDate: new Date(2023, 5, 15), // June 15, 2023
      endDate: new Date(2023, 5, 17), // June 17, 2023
      isRecurring: true,
      recurrencePattern: new RecurrencePattern('annual'),
      startsPM: false,
      endsAM: false,
      isPublicHoliday: false,
    }),
    new Event({
      title: 'Christmas Holiday',
      description: 'Christmas public holiday',
      startDate: new Date(2023, 11, 25), // December 25, 2023
      isPublicHoliday: true,
    }),
    new Event({
      title: 'Team Workshop',
      description: 'Quarterly planning workshop',
      startDate: new Date(2023, 3, 10, 13, 0), // April 10, 2023, 1:00 PM
      endDate: new Date(2023, 3, 11, 11, 0), // April 11, 2023, 11:00 AM
      startsPM: true,
      endsAM: true,
    }),
  ]);

  // Test 1: Save YearPlanner
  console.log('Test 1: Saving YearPlanner...');
  const saveResult = adapter.save(planner);
  console.assert(saveResult === true, 'Save operation should return true');

  // Test 2: List available years
  console.log('Test 2: Listing available years...');
  const years = adapter.listAvailableYears();
  console.assert(years.length === 1, `Expected 1 year, got ${years.length}`);
  console.assert(
    years[0] === currentYear,
    `Expected year ${currentYear}, got ${years[0]}`,
  );

  // Test 3: Load YearPlanner
  console.log('Test 3: Loading YearPlanner...');
  const loadedPlanner = adapter.load(currentYear);
  console.assert(loadedPlanner !== null, 'Loaded planner should not be null');
  console.assert(
    loadedPlanner.year === currentYear,
    `Expected year ${currentYear}, got ${loadedPlanner.year}`,
  );
  console.assert(
    loadedPlanner.events.length === planner.events.length,
    `Expected ${planner.events.length} events, got ${loadedPlanner.events.length}`,
  );

  // Test 4: Verify event properties, especially dates
  console.log('Test 4: Verifying event properties...');
  const originalEvent = planner.events[0];
  const loadedEvent = loadedPlanner.events[0];

  console.assert(
    loadedEvent.title === originalEvent.title,
    `Expected title "${originalEvent.title}", got "${loadedEvent.title}"`,
  );
  console.assert(
    loadedEvent.startDate instanceof Date,
    'startDate should be a Date object',
  );
  console.assert(
    loadedEvent.startDate.getTime() === originalEvent.startDate.getTime(),
    `Expected startDate ${originalEvent.startDate}, got ${loadedEvent.startDate}`,
  );
  console.assert(
    loadedEvent.isRecurring === originalEvent.isRecurring,
    `Expected isRecurring ${originalEvent.isRecurring}, got ${loadedEvent.isRecurring}`,
  );
  console.assert(
    loadedEvent.recurrencePattern.type === originalEvent.recurrencePattern.type,
    `Expected recurrence type ${originalEvent.recurrencePattern.type}, got ${loadedEvent.recurrencePattern.type}`,
  );

  // Verify PM/AM flags (Test event 3)
  const originalPmAmEvent = planner.events[2];
  const loadedPmAmEvent = loadedPlanner.events[2];
  console.assert(
    loadedPmAmEvent.startsPM === originalPmAmEvent.startsPM,
    `Expected startsPM ${originalPmAmEvent.startsPM}, got ${loadedPmAmEvent.startsPM}`,
  );
  console.assert(
    loadedPmAmEvent.endsAM === originalPmAmEvent.endsAM,
    `Expected endsAM ${originalPmAmEvent.endsAM}, got ${loadedPmAmEvent.endsAM}`,
  );

  // Test 5: Export functionality
  console.log('Test 5: Testing export functionality...');
  const exportedData = adapter.export(currentYear);
  console.assert(
    typeof exportedData === 'string',
    'Exported data should be a string',
  );

  // Test 6: Delete and verify
  console.log('Test 6: Testing delete functionality...');
  adapter.delete(currentYear);
  const yearAfterDelete = adapter.listAvailableYears();
  console.assert(
    yearAfterDelete.length === 0,
    `Expected 0 years after delete, got ${yearAfterDelete.length}`,
  );

  // Test 7: Import functionality
  console.log('Test 7: Testing import functionality...');
  const importResult = adapter.import(exportedData);
  console.assert(importResult === true, 'Import operation should return true');

  const yearsAfterImport = adapter.listAvailableYears();
  console.assert(
    yearsAfterImport.length === 1,
    `Expected 1 year after import, got ${yearsAfterImport.length}`,
  );

  // Test 8: Multi-year export/import
  console.log('Test 8: Testing multi-year export/import...');

  // Create a second planner for a different year
  const nextYear = 2024;
  const planner2 = new YearPlanner(nextYear, [
    new Event({
      title: 'New Year Party',
      description: 'Company new year celebration',
      startDate: new Date(2024, 0, 1), // January 1, 2024
    }),
  ]);

  adapter.save(planner2);
  const yearsWithBoth = adapter.listAvailableYears();
  console.assert(
    yearsWithBoth.length === 2,
    `Expected 2 years, got ${yearsWithBoth.length}`,
  );

  // Export all years
  const allExported = adapter.exportAll();

  // Clear and verify empty
  adapter.clearAll();
  const yearsAfterClear = adapter.listAvailableYears();
  console.assert(
    yearsAfterClear.length === 0,
    `Expected 0 years after clear, got ${yearsAfterClear.length}`,
  );

  // Import all and verify
  adapter.importAll(allExported);
  const yearsAfterFullImport = adapter.listAvailableYears();
  console.assert(
    yearsAfterFullImport.length === 2,
    `Expected 2 years after full import, got ${yearsAfterFullImport.length}`,
  );

  console.log('All tests completed successfully!');
  return true;
}

// Run tests
testStorageAdapter();

// For browser environment, expose to window
if (typeof window !== 'undefined') {
  window.testStorageAdapter = testStorageAdapter;
}

export { testStorageAdapter };
