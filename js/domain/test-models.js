/**
 * Test script for Year Planner domain models
 */

import { Event, YearPlanner } from './models.js';

/**
 * Run tests and log results
 */
function runTests() {
  console.log('=== Running Year Planner domain model tests ===');

  // Test Event class
  testEventCreation();
  testEventDuration();
  testEventOverlaps();
  testEventClone();

  // Test YearPlanner class
  testYearPlannerCreation();
  testAddEvent();
  testRemoveEvent();
  testGetEvent();
  testUpdateEvent();
  testGetEventsInRange();
  testGetEventsInMonth();

  console.log('=== All tests completed ===');
}

function testEventCreation() {
  console.log('Testing Event creation...');

  // Test basic event creation
  const startDate = new Date(2025, 0, 1); // Jan 1, 2025
  const endDate = new Date(2025, 0, 3); // Jan 3, 2025

  const event = new Event({
    title: 'Test Event',
    description: 'Event description',
    startDate,
    endDate,
  });

  console.assert(event.id, 'Event should have an ID');
  console.assert(event.title === 'Test Event', 'Event title should match');
  console.assert(
    event.description === 'Event description',
    'Event description should match',
  );
  console.assert(event.startDate === startDate, 'Event startDate should match');
  console.assert(event.endDate === endDate, 'Event endDate should match');
  console.assert(
    event.isRecurring === false,
    'Event isRecurring should default to false',
  );
  console.assert(
    event.startsPM === false,
    'Event startsPM should default to false',
  );
  console.assert(
    event.endsAM === false,
    'Event endsAM should default to false',
  );
  console.assert(
    event.isPublicHoliday === false,
    'Event isPublicHoliday should default to false',
  );

  // Test recurring event creation
  try {
    const recurringEvent = new Event({
      title: 'Recurring Event',
      startDate: new Date(2025, 0, 1),
      endDate: new Date(2025, 0, 1),
      isRecurring: true,
      recurrencePattern: { type: 'weekly' },
    });
    console.assert(
      recurringEvent.recurrencePattern.type === 'weekly',
      'Recurring event should have correct pattern',
    );
  } catch (e) {
    console.error('Failed to create recurring event:', e);
  }

  // Test validation
  try {
    new Event({
      title: 'Invalid Event',
      startDate: new Date(2025, 0, 3),
      endDate: new Date(2025, 0, 1), // End before start
    });
    console.error('Failed: Created event with end date before start date');
  } catch (e) {
    console.log('Correctly rejected event with end date before start date');
  }

  console.log('Event creation tests completed');
}

function testEventDuration() {
  console.log('Testing Event duration calculation...');

  // Single day event
  const singleDayEvent = new Event({
    title: 'Single Day',
    startDate: new Date(2025, 0, 1),
    endDate: new Date(2025, 0, 1),
  });
  console.assert(
    singleDayEvent.duration === 1,
    `Single day duration should be 1, got ${singleDayEvent.duration}`,
  );

  // Multi-day event
  const multiDayEvent = new Event({
    title: 'Three Days',
    startDate: new Date(2025, 0, 1),
    endDate: new Date(2025, 0, 3),
  });
  console.assert(
    multiDayEvent.duration === 3,
    `Three day duration should be 3, got ${multiDayEvent.duration}`,
  );

  console.log('Event duration tests completed');
}

function testEventOverlaps() {
  console.log('Testing Event overlaps method...');

  const event = new Event({
    title: 'Test Event',
    startDate: new Date(2025, 0, 5),
    endDate: new Date(2025, 0, 10),
  });

  // Test cases for overlap
  console.assert(
    event.overlaps(new Date(2025, 0, 4), new Date(2025, 0, 6)) === true,
    'Should overlap with range starting before and ending during',
  );
  console.assert(
    event.overlaps(new Date(2025, 0, 6), new Date(2025, 0, 12)) === true,
    'Should overlap with range starting during and ending after',
  );
  console.assert(
    event.overlaps(new Date(2025, 0, 6), new Date(2025, 0, 8)) === true,
    'Should overlap with range completely inside event',
  );
  console.assert(
    event.overlaps(new Date(2025, 0, 4), new Date(2025, 0, 12)) === true,
    'Should overlap with range containing event',
  );

  // Test cases for non-overlap
  console.assert(
    event.overlaps(new Date(2025, 0, 1), new Date(2025, 0, 4)) === false,
    'Should not overlap with range ending before event starts',
  );
  console.assert(
    event.overlaps(new Date(2025, 0, 11), new Date(2025, 0, 15)) === false,
    'Should not overlap with range starting after event ends',
  );

  console.log('Event overlaps tests completed');
}

function testEventClone() {
  console.log('Testing Event clone method...');

  const original = new Event({
    title: 'Original Event',
    description: 'Test description',
    startDate: new Date(2025, 0, 1),
    endDate: new Date(2025, 0, 3),
    isRecurring: true,
    recurrencePattern: { type: 'weekly' },
    startsPM: true,
    endsAM: false,
    isPublicHoliday: false,
  });

  const clone = original.clone();

  // ID should be different
  console.assert(
    clone.id !== original.id,
    'Cloned event should have a different ID',
  );

  // Other properties should match
  console.assert(clone.title === original.title, 'Title should match');
  console.assert(
    clone.description === original.description,
    'Description should match',
  );
  console.assert(
    clone.startDate.getTime() === original.startDate.getTime(),
    'Start date should match',
  );
  console.assert(
    clone.endDate.getTime() === original.endDate.getTime(),
    'End date should match',
  );
  console.assert(
    clone.isRecurring === original.isRecurring,
    'isRecurring should match',
  );
  console.assert(
    clone.recurrencePattern.type === original.recurrencePattern.type,
    'Recurrence pattern should match',
  );
  console.assert(clone.startsPM === original.startsPM, 'startsPM should match');
  console.assert(clone.endsAM === original.endsAM, 'endsAM should match');
  console.assert(
    clone.isPublicHoliday === original.isPublicHoliday,
    'isPublicHoliday should match',
  );

  console.log('Event clone tests completed');
}

function testYearPlannerCreation() {
  console.log('Testing YearPlanner creation...');

  // Default constructor (current year)
  const defaultPlanner = new YearPlanner();
  console.assert(
    defaultPlanner.year === new Date().getFullYear(),
    'Default planner should use current year',
  );
  console.assert(
    Array.isArray(defaultPlanner.events),
    'Events should be an array',
  );
  console.assert(
    defaultPlanner.events.length === 0,
    'Default planner should have no events',
  );

  // Constructor with custom year
  const customYearPlanner = new YearPlanner({ year: 2025 });
  console.assert(
    customYearPlanner.year === 2025,
    'Custom year planner should use specified year',
  );

  // Constructor with initial events
  const event1 = new Event({
    title: 'Event 1',
    startDate: new Date(2025, 0, 1),
    endDate: new Date(2025, 0, 1),
  });

  const event2 = new Event({
    title: 'Event 2',
    startDate: new Date(2025, 0, 2),
    endDate: new Date(2025, 0, 2),
  });

  const plannerWithEvents = new YearPlanner({
    year: 2025,
    events: [event1, event2],
  });

  console.assert(
    plannerWithEvents.events.length === 2,
    'Planner should have 2 events',
  );

  console.log('YearPlanner creation tests completed');
}

function testAddEvent() {
  console.log('Testing YearPlanner addEvent method...');

  const planner = new YearPlanner({ year: 2025 });

  // Add valid event
  const event = new Event({
    title: 'Test Event',
    startDate: new Date(2025, 0, 1),
    endDate: new Date(2025, 0, 3),
  });

  const eventId = planner.addEvent(event);
  console.assert(eventId === event.id, 'addEvent should return the event ID');
  console.assert(planner.events.length === 1, 'Planner should have 1 event');

  // Try to add invalid event (outside year)
  const invalidEvent = new Event({
    title: 'Invalid Event',
    startDate: new Date(2026, 0, 1),
    endDate: new Date(2026, 0, 3),
  });

  try {
    planner.addEvent(invalidEvent);
    console.error('Failed: Added event outside planner year');
  } catch (e) {
    console.log('Correctly rejected event outside planner year');
  }

  console.log('YearPlanner addEvent tests completed');
}

function testRemoveEvent() {
  console.log('Testing YearPlanner removeEvent method...');

  const planner = new YearPlanner({ year: 2025 });

  const event1 = new Event({
    title: 'Event 1',
    startDate: new Date(2025, 0, 1),
    endDate: new Date(2025, 0, 1),
  });

  const event2 = new Event({
    title: 'Event 2',
    startDate: new Date(2025, 0, 2),
    endDate: new Date(2025, 0, 2),
  });

  planner.addEvent(event1);
  planner.addEvent(event2);

  console.assert(planner.events.length === 2, 'Planner should have 2 events');

  // Remove existing event
  const removed = planner.removeEvent(event1.id);
  console.assert(
    removed === true,
    'removeEvent should return true for existing event',
  );
  console.assert(
    planner.events.length === 1,
    'Planner should have 1 event after removal',
  );

  // Try to remove non-existent event
  const nonExistentRemoved = planner.removeEvent('non-existent-id');
  console.assert(
    nonExistentRemoved === false,
    'removeEvent should return false for non-existent event',
  );

  console.log('YearPlanner removeEvent tests completed');
}

function testGetEvent() {
  console.log('Testing YearPlanner getEvent method...');

  const planner = new YearPlanner({ year: 2025 });

  const event = new Event({
    title: 'Test Event',
    startDate: new Date(2025, 0, 1),
    endDate: new Date(2025, 0, 3),
  });

  planner.addEvent(event);

  // Get existing event
  const retrievedEvent = planner.getEvent(event.id);
  console.assert(retrievedEvent !== null, 'Should retrieve existing event');
  console.assert(
    retrievedEvent.id === event.id,
    'Retrieved event should have correct ID',
  );
  console.assert(
    retrievedEvent.title === event.title,
    'Retrieved event should have correct title',
  );

  // Try to get non-existent event
  const nonExistentEvent = planner.getEvent('non-existent-id');
  console.assert(
    nonExistentEvent === null,
    'Should return null for non-existent event',
  );

  console.log('YearPlanner getEvent tests completed');
}

function testUpdateEvent() {
  console.log('Testing YearPlanner updateEvent method...');

  const planner = new YearPlanner({ year: 2025 });

  const event = new Event({
    title: 'Original Title',
    description: 'Original Description',
    startDate: new Date(2025, 0, 1),
    endDate: new Date(2025, 0, 3),
  });

  planner.addEvent(event);

  // Update existing event
  const updated = planner.updateEvent(event.id, {
    title: 'Updated Title',
    description: 'Updated Description',
  });

  console.assert(
    updated === true,
    'updateEvent should return true for successful update',
  );

  const updatedEvent = planner.getEvent(event.id);
  console.assert(
    updatedEvent.title === 'Updated Title',
    'Title should be updated',
  );
  console.assert(
    updatedEvent.description === 'Updated Description',
    'Description should be updated',
  );
  console.assert(
    updatedEvent.startDate.getTime() === event.startDate.getTime(),
    'Start date should remain unchanged',
  );

  // Try to update non-existent event
  const nonExistentUpdated = planner.updateEvent('non-existent-id', {
    title: 'New Title',
  });
  console.assert(
    nonExistentUpdated === false,
    'updateEvent should return false for non-existent event',
  );

  // Try to update event to be outside the year
  try {
    planner.updateEvent(event.id, {
      startDate: new Date(2026, 0, 1),
      endDate: new Date(2026, 0, 3),
    });
    console.error('Failed: Updated event to be outside planner year');
  } catch (e) {
    console.log(
      'Correctly rejected update that would place event outside planner year',
    );
  }

  console.log('YearPlanner updateEvent tests completed');
}

function testGetEventsInRange() {
  console.log('Testing YearPlanner getEventsInRange method...');

  const planner = new YearPlanner({ year: 2025 });

  // Add events spanning different ranges
  const event1 = new Event({
    title: 'Early January',
    startDate: new Date(2025, 0, 1),
    endDate: new Date(2025, 0, 5),
  });

  const event2 = new Event({
    title: 'Mid January',
    startDate: new Date(2025, 0, 10),
    endDate: new Date(2025, 0, 15),
  });

  const event3 = new Event({
    title: 'Late January',
    startDate: new Date(2025, 0, 20),
    endDate: new Date(2025, 0, 25),
  });

  planner.addEvent(event1);
  planner.addEvent(event2);
  planner.addEvent(event3);

  // Test different ranges
  const earlyEvents = planner.getEventsInRange(
    new Date(2025, 0, 1),
    new Date(2025, 0, 7),
  );
  console.assert(
    earlyEvents.length === 1,
    'Should find one event in early January',
  );
  console.assert(
    earlyEvents[0].title === 'Early January',
    'Should find correct event',
  );

  const midEvents = planner.getEventsInRange(
    new Date(2025, 0, 8),
    new Date(2025, 0, 17),
  );
  console.assert(
    midEvents.length === 1,
    'Should find one event in mid January',
  );
  console.assert(
    midEvents[0].title === 'Mid January',
    'Should find correct event',
  );

  const allJanuaryEvents = planner.getEventsInRange(
    new Date(2025, 0, 1),
    new Date(2025, 0, 31),
  );
  console.assert(
    allJanuaryEvents.length === 3,
    'Should find all three events in January',
  );

  const noEvents = planner.getEventsInRange(
    new Date(2025, 1, 1),
    new Date(2025, 1, 5),
  );
  console.assert(noEvents.length === 0, 'Should find no events in February');

  console.log('YearPlanner getEventsInRange tests completed');
}

function testGetEventsInMonth() {
  console.log('Testing YearPlanner getEventsInMonth method...');

  const planner = new YearPlanner({ year: 2025 });

  // Add events in different months
  const januaryEvent = new Event({
    title: 'January Event',
    startDate: new Date(2025, 0, 15),
    endDate: new Date(2025, 0, 20),
  });

  const februaryEvent = new Event({
    title: 'February Event',
    startDate: new Date(2025, 1, 15),
    endDate: new Date(2025, 1, 20),
  });

  const crossMonthEvent = new Event({
    title: 'Cross Month Event',
    startDate: new Date(2025, 0, 25),
    endDate: new Date(2025, 1, 5),
  });

  planner.addEvent(januaryEvent);
  planner.addEvent(februaryEvent);
  planner.addEvent(crossMonthEvent);

  // Get events for specific months
  const januaryEvents = planner.getEventsInMonth(0);
  console.assert(
    januaryEvents.length === 2,
    'Should find two events in January',
  );

  const februaryEvents = planner.getEventsInMonth(1);
  console.assert(
    februaryEvents.length === 2,
    'Should find two events in February',
  );

  const marchEvents = planner.getEventsInMonth(2);
  console.assert(marchEvents.length === 0, 'Should find no events in March');

  // Test invalid month
  try {
    planner.getEventsInMonth(12);
    console.error('Failed: Used invalid month index');
  } catch (e) {
    console.log('Correctly rejected invalid month index');
  }

  console.log('YearPlanner getEventsInMonth tests completed');
}

// Run all tests
runTests();
