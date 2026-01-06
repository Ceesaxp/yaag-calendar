# Year Planner Design Document

## Application Concept

The Year Planner is a high-level visual planning tool that provides a comprehensive annual view of events, holidays, and recurring commitments in a single interface. Unlike traditional calendar applications that focus on detailed day or week views, the Year Planner emphasizes the macro-level time organization across an entire year.

### Purpose

The Year Planner addresses several key planning needs:

1. **Annual Perspective**: Visualize the entire year's events in one view, enabling better long-term planning and pattern recognition
2. **Resource Allocation**: Identify busy periods and available time blocks at a glance
3. **Project Timeline Management**: Track multi-day events spanning weeks or months
4. **Holiday and Recurring Event Management**: Maintain awareness of fixed annual commitments
5. **Strategic Planning**: Support high-level decision making around time allocation

### Target Use Cases

- **Project Management**: Track project phases, deadlines and milestones
- **Academic Planning**: Visualize semester schedules, exam periods, and breaks
- **Personal Planning**: Manage vacations, family events, and recurring commitments
- **Business Operations**: Schedule product releases, marketing campaigns, and fiscal periods
- **Event Planning**: Coordinate conferences, workshops, and multi-day events

### Key Differentiators

- **Whole-Year Perspective**: Single-screen overview of the entire year
- **Day-of-Week Alignment**: Events align vertically by weekday across months for pattern recognition
- **Simplified Visualization**: Focus on high-level time blocks rather than hour-by-hour details
- **Lightweight Implementation**: Browser-based with local storage for portability
- **Multi-Day Event Tracking**: Specialized handling of events that span across days, weeks or months

## Core Domain Models

### YearPlanner
```
YearPlanner {
  year: Integer
  events: [Event]
}
```

### Event
```
Event {
  id: String
  title: String
  description: String
  startDate: Date
  endDate: Date
  isRecurring: Boolean
  recurrencePattern?: RecurrencePattern
  startsPM: Boolean  // Event starts in afternoon
  endsAM: Boolean    // Event ends in morning
  isPublicHoliday: Boolean
}

RecurrencePattern {
  type: Enum('weekly', 'monthly', 'annual')
}
```

### EventPosition (for layout calculation)
```
EventPosition {
  rowStart: Integer  // Month index
  colStart: Integer  // Day of week index
  rowSpan: Integer   // Number of months
  colSpan: Integer   // Number of days within week
  swimLane: Integer  // Vertical position within day cell (0-4)
}

EventLayout extends Event {
  position: EventPosition
}
```

## Date Handling Strategy

### Design Principle: Timezone-Independent Calendar Dates

Events are stored as **calendar dates**, not moments in time. An event on "January 12"
must always appear on January 12, regardless of which timezone it was created in or
viewed from.

### UTC Midnight Storage Pattern

All dates are normalized to UTC midnight for consistent storage and retrieval:

```
User Input (Tokyo)     Storage                  Display (San Francisco)
"January 12, 2025" --> "2025-01-12T00:00:00Z" --> "January 12, 2025"
```

### Implementation Rules

1. **Storing dates**: Extract local calendar components, create UTC midnight
   ```javascript
   Date.UTC(localDate.getFullYear(), localDate.getMonth(), localDate.getDate())
   ```

2. **Reading dates**: Always use UTC methods for stored dates
   ```javascript
   date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCDay()
   ```

3. **Day-of-week calculation**: Use `getUTCDay()` to determine grid column placement

### Rationale

Without this pattern, a date stored as "2025-01-12T00:00:00Z" would be interpreted as
January 11 in negative UTC offset timezones (e.g., Americas), causing events to shift
by one day when viewed across different timezones.

### Helper Functions (js/utils/DateUtils.js)

- `normalizeDateToUTC(date)` - Convert any date to UTC midnight
- `createDateOnly(year, month, day)` - Create a UTC midnight date
- `getDayOfWeekUTC(date)` - Day of week (Monday=0) from UTC date
- `getDayOfWeekLocal(date)` - Day of week from local date

## Layout Engine

### Grid Structure
- 38-column grid: 1 month column + 37 weekday columns (5 weeks + 2 days)
- 13 rows (week day names + months)
- Each row starts with a month name in the first column
- Weekday headers repeating every 7 columns
- Year selector in top-left cell
- The expanded 37-day grid ensures all months fit properly (even 31-day months starting on Sunday)

### Event Positioning Algorithm

1. **EventPositionCalculator**
   - Sorts events by duration (longest first) then by start date
   - Processes each event to determine optimal position
   - Maintains "occupancy grid" to track filled positions
   - Assigns "swim lanes" to maintain event position consistency
   - Returns enriched events with position data

2. **SwimLaneAssigner**
   - Ensures events maintain vertical alignment across days
   - Maximum 5 regular events per day
   - Public holidays get special positioning
   - Handles multi-month spanning events

## User Interaction Model

### EventOperations
- Create: Click on empty day cell
- View: Click on existing event
- Edit: Modify existing event properties
- Delete: Remove event from planner

### EventValidation
- Validate date range within year
- Check public holiday constraints
- Verify event limit per day
- Ensure proper recurrence settings

## Data Management

### StorageAdapter
- Provides persistence abstraction
- Supports local client storage
- Enables import/export capabilities
- Handles data serialization

### RecurrenceCalculator
- Expands recurring events within year boundaries
- Generates concrete instances based on pattern
- Optimizes memory usage and computation

## Visual Elements

### Cell Renderer
- Day number display (top-right)
- Event display with indicators:
  - "↻" for recurring events
  - "◑" for events starting PM
  - "◐" for events ending AM
  - "★" for public holidays
- Handles overflow indication

### ViewportManager
- Responsive grid management
- Horizontal scrolling on smaller devices
- Maintains consistent cell sizing

## Implementation Considerations

### Technical Requirements
- Framework-agnostic domain model
- Clear separation of layout logic from rendering
- Responsive design accommodations
- Efficient data structures for event processing

### Performance Strategy
- Lazy calculation of event positions
- Swimlane optimization to minimize layout thrashing
- Batched updates for event modifications
- Efficient recurring event expansion

## Deployment Model

1. Client-side application
2. Local storage as primary data source
3. Export/import for data backup
4. No external service dependencies

## Extension Points

1. Remote storage integration
2. Calendar synchronization
3. Advanced search/filtering
4. Custom event categories
5. Drag-and-drop rescheduling
