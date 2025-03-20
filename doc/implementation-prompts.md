# Implementation Phases as LLM Prompts

Here's a breakdown of implementation phases into specific, atomic steps that you can use as prompts for a coding assistant. Each prompt includes clear goals, implementation details, and validation steps.

## Phase 1: Base Grid Structure

### Prompt 1.1: Create Core Domain Models
```
Create JavaScript classes implementing the core domain models for a Year Planner application.
Include these models:

1. Event class with these properties:
   - id (string, UUID)
   - title (string)
   - description (string)
   - startDate (Date)
   - endDate (Date)
   - isRecurring (boolean)
   - recurrencePattern (object with type property)
   - startsPM (boolean)
   - endsAM (boolean)
   - isPublicHoliday (boolean)
   - Add a getter for duration that calculates days between dates

2. YearPlanner class with:
   - year (integer)
   - events (array of Event objects)
   - Methods for adding, removing, and retrieving events

Save this as domain/models.js. The code should be vanilla JavaScript with no framework dependencies.

Validation: Create a simple test script that instantiates these classes and verifies their properties and methods work correctly.
```

### Prompt 1.2: Implement Basic Storage Adapter
```
Create a StorageAdapter class that handles persistence for the Year Planner application using localStorage. Reference the domain models from the previous implementation. The adapter should:

1. Save and load YearPlanner objects with their events
2. Handle proper serialization/deserialization of dates
3. Include export and import functionality for data backup
4. Use a namespaced key format like "yearPlanner_2023" for storage

Save this as infrastructure/StorageAdapter.js.

Validation: Write test code that creates a YearPlanner with sample events, saves it, then loads it back and verifies all properties including correct date conversions.
```

### Prompt 1.3: Create Basic Grid Structure as Web Component
```
Create a Web Component for displaying a yearly grid calendar. Use the previous domain models and implement:

1. A custom element called "year-planner-grid" that:
   - Displays 12 months in rows
   - Shows weekdays across 5 weeks in columns
   - Has month names in the first column
   - Creates a CSS grid layout matching the 36-column structure (1 for months + 35 for days)
   - Does not yet handle events

2. Include these features:
   - Year display in the top-left cell
   - Day numbers in each cell
   - Basic mouse event handling for cells

Save this as components/YearPlannerGrid.js.

Validation: Create an HTML file that uses this component and verify it displays a full year grid with correct month/day alignment.
```

## Phase 2: Event Management and Layout

### Prompt 2.1: Implement Event Position Calculator
```
Create an EventPositionCalculator class implementing the layout engine described in the Year Planner design document. Reference previously built domain models and implement:

1. EventPosition class with:
   - rowStart (month index)
   - colStart (day of week index)
   - rowSpan (number of months)
   - colSpan (number of days)
   - swimLane (vertical position)

2. EventLayout class extending Event with position property

3. EventPositionCalculator with:
   - An occupancy grid tracking cell usage (12x7x5 for months × days × swimlanes)
   - Algorithm to calculate optimal positions for events, prioritizing longer events
   - Handling of single-day and multi-day events

Save this as services/EventPositionCalculator.js.

Validation: Test the calculator with various event scenarios (single-day, multi-day within month, spanning months) and verify correct positioning.
```

### Prompt 2.2: Enhance Grid Component with Event Rendering
```
Enhance the year-planner-grid Web Component to support event rendering. Reference the position calculator and domain models from previous implementations. Add these features:

1. Ability to set events property that calculates layout using EventPositionCalculator
2. Event rendering in the grid with:
   - Positioning based on calculated swimLanes
   - Visual differentiation for holidays
   - Event title display
   - Click handling for events

3. Custom events:
   - 'day-click' event when empty cell is clicked
   - 'event-click' event when an existing event is clicked

Update components/YearPlannerGrid.js with these enhancements.

Validation: Test with sample events of varying durations and verify they display correctly in the grid with proper positioning.
```

### Prompt 2.3: Create Event Editor Modal
```
Implement an event editor modal component for creating and editing events. Create a new Web Component called 'event-editor-modal' that:

1. Shows/hides as needed
2. Provides form fields for all Event properties:
   - Title and description
   - Start and end dates with date pickers
   - Checkboxes for boolean properties (isRecurring, startsPM, etc.)
   - Recurrence pattern selector (when isRecurring is true)

3. Handles save and cancel operations
4. Dispatches custom events for:
   - 'event-save' with updated/new event data
   - 'event-cancel' when editing is cancelled
   - 'event-delete' when an event is deleted

Save this as components/EventEditorModal.js.

Validation: Test the modal's display, form validation, and event dispatching with different event types.
```

## Phase 3: Application Integration

### Prompt 3.1: Create Main Application Controller
```
Implement the main application controller that integrates all previously built components. Create an app.js file that:

1. Handles initialization of:
   - StorageAdapter for persistence
   - YearPlannerGrid for display
   - EventEditorModal for editing

2. Implements event handlers for:
   - Year navigation (previous/next)
   - New event creation
   - Event editing
   - Export/import functionality

3. Manages the overall application state and flow

Add proper error handling throughout the implementation.

Validation: Test the complete flow from loading saved data to creating, editing, and deleting events, ensuring proper state persistence.
```

### Prompt 3.2: Implement HTML Shell and Styling
```
Create the HTML and CSS for the Year Planner application. Implement:

1. Main HTML file with:
   - Controls for year navigation
   - Buttons for adding events, import/export
   - Container for the year-planner-grid
   - Placeholders for modals

2. CSS styling for:
   - Responsive layout that works on desktop and tablets
   - Consistent typography and spacing
   - Subtle color coding for different event types
   - Visual feedback for interactions

3. JavaScript imports that properly load all modules

Save this as index.html with associated CSS.

Validation: Test the application in different browsers and screen sizes to ensure responsive behavior.
```

## Phase 4: Advanced Features

### Prompt 4.1: Implement Recurring Events Expansion
```
Create a RecurrenceCalculator service that handles recurring events. Reference domain models and implement:

1. Logic to expand recurring events based on patterns:
   - Weekly recurrence
   - Monthly recurrence
   - Annual recurrence

2. Integration with YearPlanner to:
   - Generate concrete instances of recurring events within the current year
   - Apply appropriate visual indicators
   - Maintain parent-child relationships between recurring instances

3. Memory optimization to prevent excessive object creation

Save this as services/RecurrenceCalculator.js.

Validation: Test with various recurrence patterns and verify correct expansion within year boundaries.
```

### Prompt 4.2: Enhance Multi-Day Event Handling
```
Improve the EventPositionCalculator to better handle multi-day events, especially those spanning weeks and months. Enhance the previous implementation with:

1. More sophisticated algorithm for handling:
   - Events spanning full weeks (to maintain consistent visual width)
   - Events crossing month boundaries
   - Multiple overlapping multi-day events

2. Visual enhancements to show:
   - Event continuation indicators
   - Clear start and end boundaries
   - Date range within the event display

Update services/EventPositionCalculator.js with these improvements.

Validation: Test with complex scenarios of overlapping multi-day events and verify correct visual representation.
```

### Prompt 4.3: Implement Drag-and-Drop Rescheduling
```
Add drag-and-drop functionality to the year-planner-grid for rescheduling events. Enhance the previous implementation with:

1. Event dragging behavior:
   - Mouse/touch event handling
   - Visual feedback during drag
   - Date calculation based on target cell

2. Integration with the event editing flow:
   - Update event dates based on drop position
   - Handle recurrence rule updates when applicable
   - Update storage after successful drag operation

3. Accessibility considerations for keyboard users

Update components/YearPlannerGrid.js with these capabilities.

Validation: Test dragging various event types and verify correct date recalculation and visual updates.
```

## Phase 5: Data Management and Export

### Prompt 5.1: Enhance StorageAdapter with IndexedDB Support
```
Upgrade the StorageAdapter to use IndexedDB instead of localStorage for better performance with large datasets. Maintain the same interface but implement:

1. IndexedDB schema with:
   - YearPlanner store indexed by year
   - Events store indexed by id with year as secondary index

2. Asynchronous operations for:
   - Creating/updating planners and events
   - Retrieving planners by year
   - Bulk operations for import/export

3. Fallback to localStorage if IndexedDB is unavailable

Update infrastructure/StorageAdapter.js with these improvements.

Validation: Test with large datasets (100+ events) and verify performance improvements.
```

### Prompt 5.2: Implement Advanced Import/Export
```
Enhance the import/export functionality to support different formats and selective export. Implement:

1. Export options for:
   - Full year data (JSON)
   - Selected events only
   - iCalendar (.ics) format for calendar integration
   - CSV format for spreadsheet compatibility

2. Import capabilities for:
   - Merging with existing data (with conflict resolution)
   - iCalendar format detection and parsing
   - CSV import with field mapping

Create a new services/ImportExportService.js.

Validation: Test importing and exporting in all supported formats and verify data integrity.
```

## Validation and Continuity Guidance

When providing these prompts to a coding assistant, include these additional instructions for maintaining continuity:

```
Important execution guidelines:

1. Reference previously generated files by name when building on them
2. Maintain consistent naming conventions across all files
3. For each implementation, generate complete file content, not just snippets
4. Include any necessary import statements to connect with other modules
5. When updating an existing file, provide the complete updated content
6. Generate code that follows the vanilla JS approach without framework dependencies
7. Include brief comments explaining complex logic
8. Each implementation should be standalone and executable in a standard browser

After each implementation, test and validate using the specific validation criteria provided.
```

These prompts are designed to build on each other while preserving the overall architecture. Each prompt creates a complete, valid piece of the application that integrates with the others, following a domain-first approach aligned with your preferences.
