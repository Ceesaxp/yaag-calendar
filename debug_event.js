// Run this in your browser console to create a test event
const today = new Date();
const tomorrow = new Date();
tomorrow.setDate(today.getDate() + 1);

const testEvent = {
  id: 'test-event-' + Date.now(),
  title: 'Test Event',
  description: 'This is a test event created for debugging',
  startDate: today,
  endDate: tomorrow
};

// Access the app instance from the global variable
const app = window.yearPlannerApp;

// Log event details
console.log('Creating test event:', testEvent);

// Save the event using the app
app.handleEventSave(testEvent).then(() => {
  console.log('Test event saved successfully');
  
  // Print localStorage content for yearPlanner_events
  const yearKey = app.storageAdapter.getYearKey(today.getFullYear());
  console.log('Storage content:', localStorage.getItem(yearKey));
  
  // Check if the event appears in the app events list
  console.log('App events:', app.yearPlanner.events);
  
  // Check if the event appears in the grid events list
  console.log('Grid events:', app.yearPlannerGrid.events);
});
