# 📅 Year-At-A-Glance (YAAG) Calendar

The Year Planner is a high-level visual planning tool that provides a comprehensive annual view of events, holidays, and recurring commitments in a single interface. Unlike traditional calendar applications that focus on detailed day or week views, the Year Planner emphasizes the macro-level time organization across an entire year.

## 💠 Design

See the [Year Planner Design Document](doc/design.md) for detailed design information.

## 🗜️ Implementation

### ✏️ Architecture
- **Component-Based:** Uses Custom Elements (Web Components) with Shadow DOM for encapsulation
- **Service-Oriented:** Core services manage data persistence, event positioning, and recurrence calculation
- **Event-Driven:** Components communicate via custom events
- **Domain-Driven:** Clear separation between domain models, services, and presentation

### ⚙️ Core Components
- `YearPlannerGrid`: Main calendar grid component (38×13 grid for entire year, accommodating all month layouts)
- `EventEditorModal`: Modal dialog for creating and editing events

### 🔬 Key Services
- `EventPositionCalculator`: Calculates optimal event positions using swim lanes
- `RecurrenceCalculator`: Handles generation of recurring event instances
- `StorageAdapter`: Manages persistence to localStorage

### 🧩 Domain Models
- `Event`: Represents calendar events with properties for dates, recurrence, and styling
- `YearPlanner`: Container for the entire calendar's events and configuration

### 🫛 Technical Features
- Events spanning multiple days/weeks/months with visual continuity
- Swim lane algorithm to prevent event display overlaps
- Forward-only recurring events (weekly, monthly, annual)
- Public holiday special positioning (always in top lane)
- Visual indicators for special event types (recurring, PM starts, AM ends)
- Local storage persistence with export/import capability

## 🧘 Motivation

The Year Planner was created to address the need for a high-level planning tool that provides a comprehensive annual view of events, holidays, and recurring commitments. It is designed to be a lightweight, standalone application that can be used alongside traditional calendar applications to provide a macro-level perspective on time organization.

## 🤦‍♂️ Usage

### ➕ Adding Events

1. Click on a cell in the grid to create a new event
2. Fill in the event details in the modal dialog
3. Click "Save" to add the event to the calendar

### 📝 Editing Events

1. Click on an existing event to open the edit dialog
2. Modify the event details as needed
3. Click "Save" to update the event

### ➖ Deleting Events

1. Click on an existing event to open the edit dialog
2. Click "Delete" to remove the event from the calendar

### ♻️ Exporting/Importing Data

1. Click on the "Export" button to download a JSON file of the current calendar data
2. To import data, click on the "Import" button and select the JSON file to load

### 🖨️ PDF Export

There are two ways of exporting the calendar to a PDF file:

1. Click on the "Export PDF" button to generate a PDF file of the current calendar view
2. Use File > Print in the browser and select "Save as PDF" as the destination (a custom CSS print stylesheet is used for optimal layout)
