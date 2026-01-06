# YAAG Calendar Development Guide

## Build/Test Commands
- Run individual domain test: `node js/domain/test-models.js`
- Run UI tests: Open `js/components/test-event-rendering.html` in browser
- Serve locally: Use a simple HTTP server, e.g. `npx http-server` or `npx live-server`

## Code Style Guidelines
- ES6 modules with `import`/`export` syntax
- Class-based architecture with proper JSDoc comments
- Defensive coding with thorough parameter validation
- Exception-based error handling with descriptive messages
- Use camelCase for variables/methods, PascalCase for classes
- Prefer destructuring for parameter objects
- Default parameters for optional values
- Keep domain logic separate from UI rendering
- Immutable data patterns (return copies, not references)
- Use getters for derived properties
- Follow clear separation of concerns (domain/infrastructure/services)

## Date Handling (CRITICAL)

Events must display on the same calendar date regardless of the user's timezone.
An event on "January 12" must always appear on January 12, whether created in
Tokyo and viewed in San Francisco.

### Storage Pattern
All dates are normalized to **UTC midnight** for storage:
```javascript
// Use normalizeDateToUTC() from js/utils/DateUtils.js
const stored = new Date(Date.UTC(
  localDate.getFullYear(),
  localDate.getMonth(),
  localDate.getDate()
));
// "January 12 local" → "2025-01-12T00:00:00Z"
```

### Reading Dates
When reading date components, always use **UTC methods**:
```javascript
// CORRECT - use UTC methods for stored dates
date.getUTCFullYear()
date.getUTCMonth()
date.getUTCDate()
date.getUTCDay()  // For day-of-week

// WRONG - local methods will shift dates in some timezones
date.getFullYear()
date.getMonth()
date.getDate()
date.getDay()
```

### Helper Functions
Use the helpers in `js/utils/DateUtils.js`:
- `normalizeDateToUTC(date)` - Convert any date to UTC midnight
- `createDateOnly(year, month, day)` - Create a UTC midnight date
- `getDayOfWeekUTC(date)` - Get day of week (Monday=0) from UTC date
- `getDayOfWeekLocal(date)` - Get day of week from local date (for grid cells)

### Why This Matters
Without UTC normalization, a date stored as "2025-01-12T00:00:00Z" would appear as:
- January 12 in UTC+0 through UTC+12 timezones (correct)
- **January 11** in UTC-1 through UTC-12 timezones (wrong!)

The `getDay()` bug caused events to appear in the wrong grid column for users
in negative UTC offset timezones (Americas).
