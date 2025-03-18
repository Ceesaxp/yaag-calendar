// test-event-rendering.js
document.addEventListener('DOMContentLoaded', () => {
  // Get the year planner grid
  const plannerGrid = document.getElementById('planner-grid');
  const eventDetails = document.getElementById('event-details');
  const newEventForm = document.getElementById('new-event-form');

  // Sample events data with various types and durations
  const events = [
    {
      id: '1',
      title: 'New Year Holiday',
      description: 'Public holiday',
      startDate: new Date(2025, 0, 1),
      endDate: new Date(2025, 0, 1),
      isRecurring: false,
      startsPM: false,
      endsAM: false,
      isPublicHoliday: true,
    },
    {
      id: '2',
      title: 'Q1 Planning',
      description: 'Quarterly planning session',
      startDate: new Date(2025, 0, 15),
      endDate: new Date(2025, 0, 17),
      isRecurring: false,
      startsPM: false,
      endsAM: false,
      isPublicHoliday: false,
    },
    {
      id: '3',
      title: 'Product Launch',
      description: 'Major product launch',
      startDate: new Date(2025, 2, 10),
      endDate: new Date(2025, 2, 10),
      isRecurring: false,
      startsPM: true,
      endsAM: false,
      isPublicHoliday: false,
    },
    {
      id: '4',
      title: 'Summer Conference',
      description: 'Annual industry conference',
      startDate: new Date(2025, 6, 15),
      endDate: new Date(2025, 6, 19),
      isRecurring: true,
      recurrencePattern: { type: 'annual' },
      startsPM: false,
      endsAM: false,
      isPublicHoliday: false,
    },
    {
      id: '5',
      title: 'Cross-Month Project',
      description: 'Project spanning multiple months',
      startDate: new Date(2025, 3, 25),
      endDate: new Date(2025, 4, 10),
      isRecurring: false,
      startsPM: false,
      endsAM: false,
      isPublicHoliday: false,
    },
    {
      id: '6',
      title: 'Long Sprint',
      description: 'Development sprint',
      startDate: new Date(2025, 7, 1),
      endDate: new Date(2025, 7, 14),
      isRecurring: false,
      startsPM: false,
      endsAM: false,
      isPublicHoliday: false,
    },
    {
      id: '7',
      title: 'Weekly Status',
      description: 'Recurring status meeting',
      startDate: new Date(2025, 1, 5),
      endDate: new Date(2025, 1, 5),
      isRecurring: true,
      recurrencePattern: { type: 'weekly' },
      startsPM: true,
      endsAM: false,
      isPublicHoliday: false,
    },
    {
      id: '8',
      title: 'Christmas',
      description: 'Public holiday',
      startDate: new Date(2025, 11, 25),
      endDate: new Date(2025, 11, 25),
      isRecurring: false,
      startsPM: false,
      endsAM: false,
      isPublicHoliday: true,
    },
    {
      id: '9',
      title: 'Year Review',
      description: 'Annual review meeting',
      startDate: new Date(2025, 11, 15),
      endDate: new Date(2025, 11, 16),
      isRecurring: false,
      startsPM: false,
      endsAM: false,
      isPublicHoliday: false,
    },
    {
      id: '10',
      title: 'Overnight Deployment',
      description: 'System maintenance',
      startDate: new Date(2025, 5, 10),
      endDate: new Date(2025, 5, 11),
      isRecurring: false,
      startsPM: true,
      endsAM: true,
      isPublicHoliday: false,
    },
  ];

  // Set events on the planner
  plannerGrid.events = events;

  // Handle day click events
  plannerGrid.addEventListener('day-click', (e) => {
    const { date, month, day } = e.detail;
    console.log('Day clicked:', date);

    // Show new event form
    eventDetails.textContent = '';
    newEventForm.style.display = 'block';
    document.getElementById('new-event-date').textContent =
      `${date.getFullYear()}-${month + 1}-${day}`;
  });

  // Handle event click events
  plannerGrid.addEventListener('event-click', (e) => {
    const { eventId, event } = e.detail;
    console.log('Event clicked:', event);

    // Show event details
    newEventForm.style.display = 'none';

    const formattedStart = formatDate(event.startDate);
    const formattedEnd = formatDate(event.endDate);

    eventDetails.innerHTML = `
      <h3>${event.title}</h3>
      <p>${event.description}</p>
      <p>From: ${formattedStart} To: ${formattedEnd}</p>
      <p>
        ${event.isRecurring ? `Recurring: ${event.recurrencePattern.type}<br>` : ''}
        ${event.isPublicHoliday ? 'Public Holiday<br>' : ''}
        ${event.startsPM ? 'Starts in afternoon<br>' : ''}
        ${event.endsAM ? 'Ends in morning<br>' : ''}
      </p>
      <button id="edit-event">Edit</button>
      <button id="delete-event">Delete</button>
    `;
  });

  // Helper function to format dates
  function formatDate(date) {
    return `${date.getFullYear()}-${(date.getMonth() + 1)
      .toString()
      .padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
  }
});
