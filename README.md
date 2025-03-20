# Year-At-A-Glance (YAAG) Calendar

The Year Planner is a high-level visual planning tool that provides a comprehensive annual view of events, holidays, and recurring commitments in a single interface. Unlike traditional calendar applications that focus on detailed day or week views, the Year Planner emphasizes the macro-level time organization across an entire year.

## Design

See the [Year Planner Design Document](doc/design.md) for detailed design information.

## Implementation

### Architecture
- **Component-Based:** Uses Custom Elements (Web Components) with Shadow DOM for encapsulation
- **Service-Oriented:** Core services manage data persistence, event positioning, and recurrence calculation
- **Event-Driven:** Components communicate via custom events
- **Domain-Driven:** Clear separation between domain models, services, and presentation

### Core Components
- `YearPlannerGrid`: Main calendar grid component (36×13 grid for entire year)
- `EventEditorModal`: Modal dialog for creating and editing events

### Key Services
- `EventPositionCalculator`: Calculates optimal event positions using swim lanes
- `RecurrenceCalculator`: Handles generation of recurring event instances
- `StorageAdapter`: Manages persistence to localStorage

### Domain Models
- `Event`: Represents calendar events with properties for dates, recurrence, and styling
- `YearPlanner`: Container for the entire calendar's events and configuration

### Technical Features
- Events spanning multiple days/weeks/months with visual continuity
- Swim lane algorithm to prevent event display overlaps
- Forward-only recurring events (weekly, monthly, annual)
- Public holiday special positioning (always in top lane)
- Visual indicators for special event types (recurring, PM starts, AM ends)
- Local storage persistence with export/import capability
