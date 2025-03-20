/**
 * EventPositionCalculator.test.js - Tests for event positioning logic
 * 
 * This test suite covers the core functionality of the EventPositionCalculator,
 * with particular focus on boundary calculations, week segmentation, and
 * event positioning algorithms.
 */

import { EventPositionCalculator } from './EventPositionCalculator.js';
import { Event } from '../domain/models.js';

/**
 * Run tests and log results
 */
function runTests() {
  console.log('=== Running EventPositionCalculator tests ===');

  // Test core functionality
  testCalculatePositions();
  testCalculateWeekBoundaries();
  testSegmentMultiWeekEvent();
  testFindAvailableSwimLane();
  testCacheInvalidation();
  testPositioningEdgeCases();

  console.log('=== All EventPositionCalculator tests completed ===');
}

/**
 * Test the top-level calculatePositions method
 */
function testCalculatePositions() {
  console.log('Testing calculatePositions method...');
  
  const calculator = new EventPositionCalculator();
  const year = 2025;
  
  // Test with empty array
  const emptyResult = calculator.calculatePositions([], year);
  console.assert(Array.isArray(emptyResult), 'Result should be an array');
  console.assert(emptyResult.length === 0, 'Result should be empty for empty input');
  
  // Test with a single event
  const singleDayEvent = new Event({
    id: 'event1',
    title: 'Single Day Event',
    startDate: new Date(2025, 0, 15),
    endDate: new Date(2025, 0, 15),
  });
  
  const singleResult = calculator.calculatePositions([singleDayEvent], year);
  console.assert(singleResult.length === 1, 'Result should contain one event');
  console.assert(singleResult[0].id === 'event1', 'Result should contain the original event');
  console.assert(singleResult[0].segments && singleResult[0].segments.length > 0, 'Event should have segments');
  
  // Test with multiple events including a multi-day event
  const multiDayEvent = new Event({
    id: 'event2',
    title: 'Multi-Day Event',
    startDate: new Date(2025, 0, 20),
    endDate: new Date(2025, 0, 25),
  });
  
  const multiResult = calculator.calculatePositions([singleDayEvent, multiDayEvent], year);
  console.assert(multiResult.length === 2, 'Result should contain two events');
  
  const multiDayResult = multiResult.find(e => e.id === 'event2');
  console.assert(multiDayResult.segments.length > 1, 'Multi-day event should have multiple segments');
  
  console.log('calculatePositions tests completed');
}

/**
 * Test the week boundary calculation method (where the bug was fixed)
 */
function testCalculateWeekBoundaries() {
  console.log('Testing _calculateWeekBoundaries method...');
  
  const calculator = new EventPositionCalculator();
  
  // Test single day event (same day)
  const singleDay = {
    startDate: new Date(2025, 0, 15), // Wednesday, Jan 15, 2025
    endDate: new Date(2025, 0, 15),
  };
  
  const singleDayBoundaries = calculator._calculateWeekBoundaries(singleDay);
  console.assert(singleDayBoundaries.length === 1, 'Single day event should have one boundary');
  console.assert(singleDayBoundaries[0].start.getDate() === 15, 'Start day should be 15');
  console.assert(singleDayBoundaries[0].end.getDate() === 15, 'End day should be 15');
  
  // Test event spanning one week
  const oneWeekEvent = {
    startDate: new Date(2025, 0, 13), // Monday, Jan 13, 2025
    endDate: new Date(2025, 0, 19),   // Sunday, Jan 19, 2025
  };
  
  const oneWeekBoundaries = calculator._calculateWeekBoundaries(oneWeekEvent);
  console.assert(oneWeekBoundaries.length === 1, 'Event within one week should have one boundary');
  console.assert(oneWeekBoundaries[0].start.getDate() === 13, 'Start day should be 13');
  console.assert(oneWeekBoundaries[0].end.getDate() === 19, 'End day should be 19');
  
  // Test event spanning multiple weeks
  const multiWeekEvent = {
    startDate: new Date(2025, 0, 15), // Wednesday, Jan 15, 2025
    endDate: new Date(2025, 0, 25),   // Saturday, Jan 25, 2025
  };
  
  const multiWeekBoundaries = calculator._calculateWeekBoundaries(multiWeekEvent);
  console.assert(multiWeekBoundaries.length === 2, 'Event spanning 2 weeks should have 2 boundaries');
  console.assert(multiWeekBoundaries[0].start.getDate() === 15, 'First segment start should be 15');
  console.assert(multiWeekBoundaries[0].end.getDate() === 19, 'First segment end should be 19 (Sunday)');
  console.assert(multiWeekBoundaries[1].start.getDate() === 20, 'Second segment start should be 20 (Monday)');
  console.assert(multiWeekBoundaries[1].end.getDate() === 25, 'Second segment end should be 25');
  
  // Test event spanning a month boundary
  const monthBoundaryEvent = {
    startDate: new Date(2025, 0, 27), // Monday, Jan 27, 2025
    endDate: new Date(2025, 1, 5),    // Wednesday, Feb 5, 2025
  };
  
  const monthBoundaryBoundaries = calculator._calculateWeekBoundaries(monthBoundaryEvent);
  console.assert(monthBoundaryBoundaries.length > 1, 'Event spanning month boundary should have multiple boundaries');
  console.assert(monthBoundaryBoundaries[0].start.getMonth() === 0, 'First segment should be in January');
  console.assert(monthBoundaryBoundaries[monthBoundaryBoundaries.length - 1].end.getMonth() === 1, 'Last segment should be in February');
  
  // Test edge case: event spanning exactly one week, starting on Monday
  const exactWeekEvent = {
    startDate: new Date(2025, 1, 3),  // Monday, Feb 3, 2025
    endDate: new Date(2025, 1, 9),    // Sunday, Feb 9, 2025
  };
  
  const exactWeekBoundaries = calculator._calculateWeekBoundaries(exactWeekEvent);
  console.assert(exactWeekBoundaries.length === 1, 'Event spanning exactly one week should have one boundary');
  console.assert(exactWeekBoundaries[0].start.getDate() === 3, 'Start day should be 3');
  console.assert(exactWeekBoundaries[0].end.getDate() === 9, 'End day should be 9');
  
  // Test edge case: event spanning multiple months
  const multiMonthEvent = {
    startDate: new Date(2025, 0, 15),  // Jan 15, 2025
    endDate: new Date(2025, 2, 15),    // Mar 15, 2025
  };
  
  const multiMonthBoundaries = calculator._calculateWeekBoundaries(multiMonthEvent);
  console.assert(multiMonthBoundaries.length > 4, 'Event spanning multiple months should have many boundaries');
  console.assert(multiMonthBoundaries[0].start.getMonth() === 0, 'First segment should be in January');
  console.assert(multiMonthBoundaries[multiMonthBoundaries.length - 1].end.getMonth() === 2, 'Last segment should be in March');
  
  console.log('_calculateWeekBoundaries tests completed');
}

/**
 * Test segmentation of multi-week events
 */
function testSegmentMultiWeekEvent() {
  console.log('Testing event segmentation...');
  
  const calculator = new EventPositionCalculator();
  const year = 2025;
  
  // Test multi-week event
  const multiWeekEvent = new Event({
    id: 'multiWeek',
    title: 'Multi-Week Event',
    startDate: new Date(2025, 0, 15), // Wednesday
    endDate: new Date(2025, 0, 25),   // Saturday of next week
  });
  
  const result = calculator.calculatePositions([multiWeekEvent], year);
  console.assert(result.length === 1, 'Result should contain one event');
  
  const processedEvent = result[0];
  console.assert(processedEvent.segments.length > 1, 'Multi-week event should have multiple segments');
  
  // Check segment properties
  const firstSegment = processedEvent.segments[0];
  const lastSegment = processedEvent.segments[processedEvent.segments.length - 1];
  
  console.assert(firstSegment.isStart, 'First segment should be marked as start');
  console.assert(!firstSegment.isEnd, 'First segment should not be marked as end');
  console.assert(lastSegment.isEnd, 'Last segment should be marked as end');
  console.assert(!lastSegment.isStart, 'Last segment should not be marked as start');
  
  // Check week numbers and day positions
  console.assert(typeof firstSegment.weekOfYear === 'number', 'Segment should have week number');
  console.assert(typeof firstSegment.dayOfWeek === 'number', 'Segment should have day of week');
  console.assert(firstSegment.dayOfWeek >= 0 && firstSegment.dayOfWeek <= 6, 'Day of week should be 0-6');
  
  console.log('Event segmentation tests completed');
}

/**
 * Test swim lane allocation for event segments
 */
function testFindAvailableSwimLane() {
  console.log('Testing swim lane allocation...');
  
  const calculator = new EventPositionCalculator();
  const year = 2025;
  
  // Create events that overlap in the same week
  const event1 = new Event({
    id: 'event1',
    title: 'Event 1',
    startDate: new Date(2025, 1, 3),  // Monday, Feb 3
    endDate: new Date(2025, 1, 5),    // Wednesday, Feb 5
  });
  
  const event2 = new Event({
    id: 'event2',
    title: 'Event 2',
    startDate: new Date(2025, 1, 4),  // Tuesday, Feb 4
    endDate: new Date(2025, 1, 6),    // Thursday, Feb 6
  });
  
  const event3 = new Event({
    id: 'event3',
    title: 'Event 3',
    startDate: new Date(2025, 1, 7),  // Friday, Feb 7
    endDate: new Date(2025, 1, 9),    // Sunday, Feb 9
  });
  
  const result = calculator.calculatePositions([event1, event2, event3], year);
  console.assert(result.length === 3, 'Result should contain three events');
  
  // Check that overlapping events have different swim lanes
  const event1Result = result.find(e => e.id === 'event1');
  const event2Result = result.find(e => e.id === 'event2');
  const event3Result = result.find(e => e.id === 'event3');
  
  console.assert(event1Result.segments[0].swimLane !== event2Result.segments[0].swimLane, 
    'Overlapping events should have different swim lanes');
  
  // Events that don't overlap can have the same swim lane
  console.assert(event1Result.segments[0].swimLane === event3Result.segments[0].swimLane || 
                event2Result.segments[0].swimLane === event3Result.segments[0].swimLane,
    'Non-overlapping events can have the same swim lane');
  
  console.log('Swim lane allocation tests completed');
}

/**
 * Test cache invalidation logic
 */
function testCacheInvalidation() {
  console.log('Testing cache invalidation...');
  
  const calculator = new EventPositionCalculator();
  const year = 2025;
  
  // Create an initial event
  const event = new Event({
    id: 'event1',
    title: 'Original Event',
    startDate: new Date(2025, 0, 15),
    endDate: new Date(2025, 0, 15),
  });
  
  // Calculate positions first time (should populate cache)
  calculator.calculatePositions([event], year);
  
  // Modify the event
  const modifiedEvent = new Event({
    id: 'event1', // Same ID
    title: 'Modified Event',
    startDate: new Date(2025, 0, 16), // Changed date
    endDate: new Date(2025, 0, 16),
  });
  
  // Calculate positions again
  const result = calculator.calculatePositions([modifiedEvent], year);
  
  // Check that the modified event was processed correctly
  console.assert(result[0].title === 'Modified Event', 'Title should be updated');
  console.assert(result[0].segments[0].startDate.getDate() === 16, 'Date should be updated');
  
  // Test a different scenario - deleting an event
  calculator.calculatePositions([event, modifiedEvent], year);
  const reducedResult = calculator.calculatePositions([event], year);
  
  console.assert(reducedResult.length === 1, 'Result should contain only one event after deletion');
  console.assert(reducedResult[0].id === 'event1', 'Remaining event should be the original one');
  
  console.log('Cache invalidation tests completed');
}

/**
 * Test edge cases for event positioning
 */
function testPositioningEdgeCases() {
  console.log('Testing positioning edge cases...');
  
  const calculator = new EventPositionCalculator();
  const year = 2025;
  
  // Test case: Event spanning exactly one week
  const exactWeekEvent = new Event({
    id: 'exactWeek',
    title: 'Exact Week Event',
    startDate: new Date(2025, 1, 3),  // Monday, Feb 3
    endDate: new Date(2025, 1, 9),    // Sunday, Feb 9
  });
  
  const exactWeekResult = calculator.calculatePositions([exactWeekEvent], year);
  console.assert(exactWeekResult[0].segments.length === 1, 'Event spanning exactly one week should have one segment');
  
  // Test case: Single day event on week boundary
  const sundayEvent = new Event({
    id: 'sundayEvent',
    title: 'Sunday Event',
    startDate: new Date(2025, 1, 9),  // Sunday, Feb 9
    endDate: new Date(2025, 1, 9),
  });
  
  const mondayEvent = new Event({
    id: 'mondayEvent',
    title: 'Monday Event',
    startDate: new Date(2025, 1, 10), // Monday, Feb 10
    endDate: new Date(2025, 1, 10),
  });
  
  const boundaryResult = calculator.calculatePositions([sundayEvent, mondayEvent], year);
  console.assert(boundaryResult.length === 2, 'Result should contain both boundary events');
  
  const sundayResult = boundaryResult.find(e => e.id === 'sundayEvent');
  const mondayResult = boundaryResult.find(e => e.id === 'mondayEvent');
  
  console.assert(sundayResult.segments[0].weekOfYear !== mondayResult.segments[0].weekOfYear, 
    'Sunday and Monday events should be in different weeks');
  
  // Test case: Event spanning year boundary (should be truncated to current year)
  const yearBoundaryEvent = new Event({
    id: 'yearBoundary',
    title: 'Year Boundary Event',
    startDate: new Date(2024, 11, 25), // Dec 25, 2024
    endDate: new Date(2025, 0, 5),     // Jan 5, 2025
  });
  
  const yearBoundaryResult = calculator.calculatePositions([yearBoundaryEvent], 2025);
  
  // Should only include parts in 2025
  console.assert(yearBoundaryResult.length === 1, 'Result should contain the year boundary event');
  console.assert(yearBoundaryResult[0].segments[0].startDate.getFullYear() === 2025, 
    'Segments should be truncated to current year');
  
  console.log('Positioning edge cases tests completed');
}

// Run all tests
runTests();

// Export for browser environment
if (typeof window !== 'undefined') {
  window.runEventPositionCalculatorTests = runTests;
}

export { runTests };