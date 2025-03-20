/**
 * RecurrenceCalculator.test.js - Tests for recurring event expansion
 * 
 * This test suite covers the functionality of the RecurrenceCalculator,
 * focusing on different recurrence patterns and edge cases.
 */

import { RecurrenceCalculator } from './RecurrenceCalculator.js';
import { Event } from '../domain/models.js';

/**
 * Run tests and log results
 */
function runTests() {
  console.log('=== Running RecurrenceCalculator tests ===');

  // Test core functionality
  testExpandRecurringEvents();
  testWeeklyRecurrence();
  testMonthlyRecurrence();
  testAnnualRecurrence();
  testRecurrenceWithExclusions();
  testRecurrenceEdgeCases();

  console.log('=== All RecurrenceCalculator tests completed ===');
}

/**
 * Test the main expandRecurringEvents method
 */
function testExpandRecurringEvents() {
  console.log('Testing expandRecurringEvents method...');
  
  const year = 2025;
  const calculator = new RecurrenceCalculator(year);
  
  // Test with empty array
  const emptyResult = calculator.expandRecurringEvents([]);
  console.assert(Array.isArray(emptyResult), 'Result should be an array');
  console.assert(emptyResult.length === 0, 'Result should be empty for empty input');
  
  // Test with non-recurring events
  const nonRecurringEvent = new Event({
    id: 'nonRecurring',
    title: 'Non-Recurring Event',
    startDate: new Date(2025, 0, 15),
    endDate: new Date(2025, 0, 15),
    isRecurring: false
  });
  
  const nonRecurringResult = calculator.expandRecurringEvents([nonRecurringEvent]);
  console.assert(nonRecurringResult.length === 1, 'Non-recurring events should pass through unchanged');
  console.assert(nonRecurringResult[0].id === 'nonRecurring', 'Event ID should be unchanged');
  
  // Test with a recurring event
  const recurringEvent = new Event({
    id: 'recurring',
    title: 'Weekly Meeting',
    startDate: new Date(2025, 0, 6), // Monday, Jan 6, 2025
    endDate: new Date(2025, 0, 6),
    isRecurring: true,
    recurrencePattern: { type: 'weekly' }
  });
  
  const recurringResult = calculator.expandRecurringEvents([recurringEvent]);
  console.assert(recurringResult.length > 1, 'Recurring event should be expanded to multiple events');
  
  // Verify all expanded events have the correct properties
  for (const event of recurringResult) {
    if (event.id === 'recurring') {
      // The original event
      console.assert(event.isRecurring === true, 'Original event should be marked as recurring');
    } else {
      // Generated recurrence instances
      console.assert(event.isRecurrenceInstance === true, 'Generated events should be marked as instances');
      console.assert(event.originalEventId === 'recurring', 'Instance should reference original event');
      console.assert(event.title === 'Weekly Meeting', 'Title should be preserved');
    }
  }
  
  console.log('expandRecurringEvents tests completed');
}

/**
 * Test weekly recurrence pattern
 */
function testWeeklyRecurrence() {
  console.log('Testing weekly recurrence pattern...');
  
  const year = 2025;
  const calculator = new RecurrenceCalculator(year);
  
  // Create a weekly recurring event (every Monday)
  const weeklyEvent = new Event({
    id: 'weekly',
    title: 'Weekly Meeting',
    startDate: new Date(2025, 0, 6), // Monday, Jan 6, 2025
    endDate: new Date(2025, 0, 6),
    isRecurring: true,
    recurrencePattern: { 
      type: 'weekly',
      interval: 1
    }
  });
  
  const result = calculator.expandRecurringEvents([weeklyEvent]);
  
  // Check number of instances - should be around 52 for weekly (full year)
  console.assert(result.length >= 52, 'Should generate at least 52 instances for weekly recurrence');
  
  // Verify all instances fall on Monday
  for (const event of result) {
    if (event.isRecurrenceInstance) {
      const dayOfWeek = event.startDate.getDay();
      console.assert(dayOfWeek === 1, `All instances should fall on Monday (day 1), got day ${dayOfWeek}`);
    }
  }
  
  // Test bi-weekly recurrence
  const biWeeklyEvent = new Event({
    id: 'biweekly',
    title: 'Bi-Weekly Meeting',
    startDate: new Date(2025, 0, 7), // Tuesday, Jan 7, 2025
    endDate: new Date(2025, 0, 7),
    isRecurring: true,
    recurrencePattern: { 
      type: 'weekly',
      interval: 2
    }
  });
  
  const biWeeklyResult = calculator.expandRecurringEvents([biWeeklyEvent]);
  
  // Should be approximately 26 instances for bi-weekly
  console.assert(biWeeklyResult.length >= 26, 'Should generate about 26 instances for bi-weekly recurrence');
  
  // Verify correct interval between instances
  const instances = biWeeklyResult.filter(e => e.isRecurrenceInstance).sort((a, b) => a.startDate - b.startDate);
  
  for (let i = 1; i < instances.length; i++) {
    const prevDate = instances[i-1].startDate;
    const currentDate = instances[i].startDate;
    const daysDiff = (currentDate - prevDate) / (1000 * 60 * 60 * 24);
    
    console.assert(
      Math.abs(daysDiff - 14) < 1, 
      `Difference between instances should be 14 days, got ${daysDiff}`
    );
  }
  
  console.log('Weekly recurrence tests completed');
}

/**
 * Test monthly recurrence pattern
 */
function testMonthlyRecurrence() {
  console.log('Testing monthly recurrence pattern...');
  
  const year = 2025;
  const calculator = new RecurrenceCalculator(year);
  
  // Create a monthly recurring event (15th of each month)
  const monthlyEvent = new Event({
    id: 'monthly',
    title: 'Monthly Report',
    startDate: new Date(2025, 0, 15), // Jan 15, 2025
    endDate: new Date(2025, 0, 15),
    isRecurring: true,
    recurrencePattern: { 
      type: 'monthly',
      interval: 1
    }
  });
  
  const result = calculator.expandRecurringEvents([monthlyEvent]);
  
  // Check number of instances - should be 12 for monthly (full year)
  console.assert(result.length >= 12, 'Should generate 12 instances for monthly recurrence');
  
  // Verify all instances fall on the 15th
  for (const event of result) {
    if (event.isRecurrenceInstance) {
      const dayOfMonth = event.startDate.getDate();
      console.assert(dayOfMonth === 15, `All instances should fall on the 15th, got ${dayOfMonth}`);
    }
  }
  
  // Test bi-monthly recurrence
  const biMonthlyEvent = new Event({
    id: 'bimonthly',
    title: 'Bi-Monthly Meeting',
    startDate: new Date(2025, 0, 20), // Jan 20, 2025
    endDate: new Date(2025, 0, 20),
    isRecurring: true,
    recurrencePattern: { 
      type: 'monthly',
      interval: 2
    }
  });
  
  const biMonthlyResult = calculator.expandRecurringEvents([biMonthlyEvent]);
  
  // Should be approximately 6 instances for bi-monthly
  console.assert(biMonthlyResult.length >= 6, 'Should generate 6 instances for bi-monthly recurrence');
  
  // Test edge case: recurrence on 31st (should skip months without 31st)
  const endOfMonthEvent = new Event({
    id: 'endOfMonth',
    title: 'End of Month',
    startDate: new Date(2025, 0, 31), // Jan 31, 2025
    endDate: new Date(2025, 0, 31),
    isRecurring: true,
    recurrencePattern: { 
      type: 'monthly',
      interval: 1
    }
  });
  
  const endOfMonthResult = calculator.expandRecurringEvents([endOfMonthEvent]);
  
  // There are 7 months with 31 days
  console.assert(endOfMonthResult.length >= 7, 'Should generate instances only for months with 31 days');
  
  // Verify none of the instances fall in months without 31 days
  const monthsWithout31 = [1, 3, 5, 8, 10]; // Feb (1), Apr (3), Jun (5), Sep (8), Nov (10) - zero-indexed
  
  for (const event of endOfMonthResult) {
    if (event.isRecurrenceInstance) {
      const month = event.startDate.getMonth();
      console.assert(!monthsWithout31.includes(month), `Instance should not fall in month ${month}`);
    }
  }
  
  console.log('Monthly recurrence tests completed');
}

/**
 * Test annual recurrence pattern
 */
function testAnnualRecurrence() {
  console.log('Testing annual recurrence pattern...');
  
  const year = 2025;
  const calculator = new RecurrenceCalculator(year);
  
  // Create an annual recurring event (birthday)
  const annualEvent = new Event({
    id: 'annual',
    title: 'Birthday',
    startDate: new Date(2000, 5, 15), // June 15, 2000 (birth year)
    endDate: new Date(2000, 5, 15),
    isRecurring: true,
    recurrencePattern: { 
      type: 'annual',
      interval: 1
    }
  });
  
  const result = calculator.expandRecurringEvents([annualEvent]);
  
  // Should generate 1 instance for the year
  console.assert(result.length >= 1, 'Should generate 1 instance for annual recurrence');
  
  // Find the instance
  const instance = result.find(e => e.isRecurrenceInstance);
  
  if (instance) {
    console.assert(instance.startDate.getFullYear() === 2025, 'Instance should be in 2025');
    console.assert(instance.startDate.getMonth() === 5, 'Instance should be in June');
    console.assert(instance.startDate.getDate() === 15, 'Instance should be on the 15th');
  } else {
    console.error('No instance found for annual event');
  }
  
  // Test bi-annual recurrence
  const biAnnualEvent = new Event({
    id: 'biannual',
    title: 'Every Two Years',
    startDate: new Date(2023, 3, 10), // Apr 10, 2023
    endDate: new Date(2023, 3, 10),
    isRecurring: true,
    recurrencePattern: { 
      type: 'annual',
      interval: 2
    }
  });
  
  // 2023, 2025, 2027...
  const biAnnualResult = calculator.expandRecurringEvents([biAnnualEvent]);
  
  // Should generate 1 instance for 2025 since it's every 2 years from 2023
  console.assert(biAnnualResult.length >= 1, 'Should generate 1 instance for bi-annual recurrence');
  
  console.log('Annual recurrence tests completed');
}

/**
 * Test recurrence with exclusions
 */
function testRecurrenceWithExclusions() {
  console.log('Testing recurrence with exclusions...');
  
  const year = 2025;
  const calculator = new RecurrenceCalculator(year);
  
  // Create a weekly recurring event with exclusions
  const weeklyEvent = new Event({
    id: 'weeklyExclusions',
    title: 'Weekly Meeting with Holidays',
    startDate: new Date(2025, 0, 6), // Monday, Jan 6, 2025
    endDate: new Date(2025, 0, 6),
    isRecurring: true,
    recurrencePattern: { 
      type: 'weekly',
      interval: 1,
      exclusions: [
        new Date(2025, 0, 20).toISOString(), // Skip Jan 20
        new Date(2025, 1, 17).toISOString()  // Skip Feb 17
      ]
    }
  });
  
  const result = calculator.expandRecurringEvents([weeklyEvent]);
  
  // Verify exclusions are respected
  const excludedDates = [
    new Date(2025, 0, 20).toDateString(),
    new Date(2025, 1, 17).toDateString()
  ];
  
  for (const event of result) {
    if (event.isRecurrenceInstance) {
      const dateString = event.startDate.toDateString();
      console.assert(
        !excludedDates.includes(dateString), 
        `Instance should not fall on excluded date ${dateString}`
      );
    }
  }
  
  console.log('Recurrence with exclusions tests completed');
}

/**
 * Test edge cases for recurrence
 */
function testRecurrenceEdgeCases() {
  console.log('Testing recurrence edge cases...');
  
  const year = 2025;
  const calculator = new RecurrenceCalculator(year);
  
  // Test case: Recurrence starting in previous year
  const previousYearEvent = new Event({
    id: 'previousYear',
    title: 'Started Last Year',
    startDate: new Date(2024, 11, 1), // Dec 1, 2024
    endDate: new Date(2024, 11, 1),
    isRecurring: true,
    recurrencePattern: { 
      type: 'monthly',
      interval: 1
    }
  });
  
  const previousYearResult = calculator.expandRecurringEvents([previousYearEvent]);
  
  // Should generate instances only for 2025
  console.assert(previousYearResult.length > 1, 'Should generate instances for 2025');
  
  for (const event of previousYearResult) {
    if (event.isRecurrenceInstance) {
      console.assert(
        event.startDate.getFullYear() === 2025, 
        `Instance should be in 2025, got ${event.startDate.getFullYear()}`
      );
    }
  }
  
  // Test case: Leap year handling (2024 is a leap year, 2025 is not)
  const leapYearEvent = new Event({
    id: 'leapYear',
    title: 'Leap Day Event',
    startDate: new Date(2024, 1, 29), // Feb 29, 2024 (leap day)
    endDate: new Date(2024, 1, 29),
    isRecurring: true,
    recurrencePattern: { 
      type: 'annual',
      interval: 1
    }
  });
  
  const leapYearResult = calculator.expandRecurringEvents([leapYearEvent]);
  
  // Should handle non-leap year appropriately (typically Feb 28 or Mar 1)
  const instance = leapYearResult.find(e => e.isRecurrenceInstance);
  
  if (instance) {
    const month = instance.startDate.getMonth();
    const day = instance.startDate.getDate();
    
    console.assert(
      (month === 1 && day === 28) || (month === 2 && day === 1), 
      `Leap year recurrence should fall on Feb 28 or Mar 1, got ${month+1}/${day}`
    );
  }
  
  // Test case: Recurrence limited by end date
  const limitedEvent = new Event({
    id: 'limited',
    title: 'Limited Recurrence',
    startDate: new Date(2025, 0, 1), // Jan 1, 2025
    endDate: new Date(2025, 0, 1),
    isRecurring: true,
    recurrencePattern: { 
      type: 'weekly',
      interval: 1,
      endDate: new Date(2025, 2, 31) // Ends March 31, 2025
    }
  });
  
  const limitedResult = calculator.expandRecurringEvents([limitedEvent]);
  
  // Should generate instances only until end date
  for (const event of limitedResult) {
    if (event.isRecurrenceInstance) {
      console.assert(
        event.startDate <= new Date(2025, 2, 31), 
        `Instance should not be after end date, got ${event.startDate.toDateString()}`
      );
    }
  }
  
  console.log('Recurrence edge cases tests completed');
}

// Run all tests
runTests();

// Export for browser environment
if (typeof window !== 'undefined') {
  window.runRecurrenceCalculatorTests = runTests;
}

export { runTests };