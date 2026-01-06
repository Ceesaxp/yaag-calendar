# YAAG Calendar Code Review

This document provides a comprehensive code review of the Year-At-A-Glance (YAAG) Calendar application, identifying areas for improvement and providing specific recommendations.

## Executive Summary

The YAAG Calendar is a well-architected **domain-driven** application with clear separation of concerns. The codebase demonstrates good practices like:
- Proper JSDoc documentation
- Defensive coding with parameter validation
- Web Components with Shadow DOM encapsulation
- Immutable data patterns in domain models

However, there are several areas that require attention, ranging from critical issues (duplicate files) to code quality improvements.

---

## Critical Issues

### 1. Duplicate StorageAdapter Implementations

**Severity: HIGH**

There are two different `StorageAdapter` implementations:
- `/js/services/StorageAdapter.js` - Used by the application (async/Promise-based)
- `/js/infrastructure/StorageAdapter.js` - Unused (synchronous, different API)

**Impact:**
- Confusion about which implementation to use
- Potential bugs if wrong version is imported
- Maintenance overhead of two files

**Recommendation:** Delete `/js/infrastructure/StorageAdapter.js` and keep only the services version, or consolidate the best features of both into a single implementation.

### 2. Hardcoded Date Workaround (May 12, 2025)

**Severity: HIGH**

The `EventPositionCalculator.js` contains hardcoded fixes for a specific date (May 12, 2025) in multiple locations:

```javascript
// Lines 488, 583, 679
if (month === 4 && startDate === 12 && this.year === 2025) {
  console.log("Detected May 12, 2025...");
  startDay = 0; // Monday
}
```

**Impact:**
- Not a general solution - other dates may have the same issue
- Technical debt that will cause confusion
- Symptoms of a deeper bug in day-of-week calculation

**Recommendation:** Fix the root cause in `_getDayOfWeek()` method. The issue likely stems from timezone handling when creating Date objects.

---

## Medium Priority Issues

### 3. Magic Numbers Throughout Codebase

**Locations:** `EventPositionCalculator.js`, `YearPlannerGrid.js`, `app.js`

```javascript
// Examples of magic numbers
this.maxSwimLanes = options.maxSwimLanes || 5;  // What is 5?
Array(12)  // 12 months - could be a constant
Array(7)   // 7 days - could be a constant
const startYear = currentYear - 10;  // Why 10?
```

**Recommendation:** Create a configuration module:

```javascript
// js/config.js
export const CALENDAR_CONFIG = {
  MONTHS_PER_YEAR: 12,
  DAYS_PER_WEEK: 7,
  MAX_SWIM_LANES: 5,
  HOLIDAY_LANE: 0,
  YEAR_RANGE: 10,
  GRID_COLUMNS: 38,
  NOTIFICATION_DURATION: 5000,
};
```

### 4. Large Monolithic Classes

**Affected Files:**
- `app.js` - 1000+ lines, handles everything from routing to modals to storage
- `EventPositionCalculator.js` - 1000+ lines of dense algorithm code

**Recommendation:** Split `app.js` into smaller modules:

```
js/
├── app/
│   ├── AppController.js      # Main orchestrator
│   ├── EventManager.js       # Event CRUD operations
│   ├── ModalManager.js       # Modal lifecycle
│   ├── NotificationService.js # User notifications
│   └── ImportExportService.js # Data import/export
```

### 5. Inconsistent Async/Await Usage

**Location:** `app.js`, `StorageAdapter.js`

```javascript
// Sometimes awaited
await this.loadEvents(year);

// Sometimes not awaited (fire-and-forget)
this.storageAdapter.saveEvent(event);
```

**Impact:** Potential race conditions, errors may be silently swallowed.

**Recommendation:** Always await async operations or explicitly handle the Promise with `.catch()`.

### 6. Cache Management Issues

**Location:** `RecurrenceCalculator.js`, `EventPositionCalculator.js`

Both services use caching but require manual cache clearing:

```javascript
this.recurrenceCalculator.clearCache();
this.eventPositionCalculator.clearCache();
```

**Recommendation:** Implement automatic cache invalidation using event IDs and timestamps:

```javascript
class CacheManager {
  constructor() {
    this.cache = new Map();
    this.eventVersions = new Map();
  }

  get(eventId) {
    const version = this.eventVersions.get(eventId);
    const cached = this.cache.get(`${eventId}_${version}`);
    return cached;
  }

  invalidate(eventId) {
    const version = (this.eventVersions.get(eventId) || 0) + 1;
    this.eventVersions.set(eventId, version);
  }
}
```

### 7. Excessive Console Logging

**Location:** Throughout the codebase

```javascript
console.log('EventPositionCalculator: Calculating positions for', events.length, 'events');
console.log(`Creating segment: month=${month}, startDate=${segmentStartDate.getDate()}...`);
```

**Impact:** Console noise in production, performance overhead.

**Recommendation:** Implement a proper logging utility:

```javascript
// js/utils/Logger.js
const LOG_LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };

class Logger {
  constructor(level = LOG_LEVELS.WARN) {
    this.level = level;
  }

  debug(...args) {
    if (this.level <= LOG_LEVELS.DEBUG) console.log('[DEBUG]', ...args);
  }

  info(...args) {
    if (this.level <= LOG_LEVELS.INFO) console.info('[INFO]', ...args);
  }
}

export const logger = new Logger(
  window.location.search.includes('debug') ? LOG_LEVELS.DEBUG : LOG_LEVELS.WARN
);
```

---

## Low Priority / Code Quality

### 8. Event Listener Memory Leaks

**Location:** `app.js:140-150`

Event listeners are added but not always properly removed:

```javascript
this.eventEditorModal.addEventListener('event-save', (e) => {
  this.handleEventSave(e.detail.event);
});
```

**Recommendation:** Store bound references for cleanup:

```javascript
constructor() {
  this._boundHandlers = {
    onEventSave: this.handleEventSave.bind(this),
    onEventDelete: this.handleEventDelete.bind(this),
  };
}

destroy() {
  this.eventEditorModal.removeEventListener('event-save', this._boundHandlers.onEventSave);
  this.eventEditorModal.removeEventListener('event-delete', this._boundHandlers.onEventDelete);
}
```

### 9. Missing TypeScript or JSDoc Types

While JSDoc is used, there are inconsistencies and missing type definitions:

```javascript
// Missing return type
_calculateEventSegments(startMonth, startDate, startDay, endMonth, endDate, endDay) {
```

**Recommendation:** Add comprehensive JSDoc or consider migrating to TypeScript for better type safety.

### 10. Duplicate Date Normalization Logic

**Locations:**
- `js/utils/DateUtils.js` - `normalizeDateToUTC()`
- `js/infrastructure/StorageAdapter.js` - Event constructor with inline normalization
- `js/domain/models.js` - Date handling in Event constructor

**Recommendation:** Consolidate all date normalization through `DateUtils.js`:

```javascript
// Always use DateUtils for date operations
import { normalizeDateToUTC } from '../utils/DateUtils.js';

// In Event constructor
this.startDate = normalizeDateToUTC(startDate);
this.endDate = normalizeDateToUTC(endDate);
```

### 11. Missing Error Boundaries

**Location:** `app.js`

User actions that fail don't always provide helpful feedback:

```javascript
async handleEventSave(eventData) {
  try {
    // ... save logic
  } catch (error) {
    console.error('Error saving event:', error);
    // Generic error message
    this.displayErrorMessage('Failed to save event. Please try again.');
  }
}
```

**Recommendation:** Provide more specific error messages based on error type:

```javascript
async handleEventSave(eventData) {
  try {
    // ... save logic
  } catch (error) {
    if (error.message.includes('storage')) {
      this.displayErrorMessage('Storage full. Please delete some events and try again.');
    } else if (error.message.includes('date')) {
      this.displayErrorMessage('Invalid date range. End date must be after start date.');
    } else {
      this.displayErrorMessage(`Failed to save event: ${error.message}`);
    }
  }
}
```

### 12. Missing Input Sanitization

**Location:** `EventEditorModal.js`

Event titles and descriptions are used directly without sanitization:

```javascript
eventData.title = this.shadowRoot.querySelector('#event-title').value;
```

**Recommendation:** Sanitize user inputs before storage and display:

```javascript
function sanitizeInput(input) {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML
    .substring(0, 500);    // Limit length
}
```

---

## Performance Considerations

### 13. DOM Element Proliferation

**Location:** `YearPlannerGrid.js`

Multi-segment events create multiple DOM elements:

```javascript
// A 30-day event spanning 5 weeks creates 5 DOM elements
segments.forEach(segment => {
  const element = document.createElement('div');
  // ...
});
```

**Impact:** 100 events with segments could mean 500+ DOM elements.

**Recommendation:** Consider virtual rendering or canvas-based rendering for large datasets.

### 14. Redundant Calculations

**Location:** `EventPositionCalculator.js`

Week boundaries are recalculated on every position calculation:

```javascript
calculatePositions(events, year) {
  // ...
  this._calculateWeekBoundaries();  // Called every time
}
```

**Recommendation:** Cache week boundaries per year:

```javascript
_calculateWeekBoundaries() {
  const cacheKey = `boundaries_${this.year}`;
  if (this._boundaryCache?.key === cacheKey) {
    this.weekBoundaries = this._boundaryCache.value;
    return;
  }
  // Calculate boundaries...
  this._boundaryCache = { key: cacheKey, value: this.weekBoundaries };
}
```

---

## Testing Gaps

### 15. Limited Test Coverage

**Current state:**
- Domain models have tests (`test-models.js`)
- Services have basic tests
- No integration tests
- No UI component tests

**Recommendation:**
1. Add integration tests for data flow (Storage -> Domain -> UI)
2. Add accessibility tests
3. Add performance tests for large event datasets
4. Consider using a testing framework (Vitest, Jest)

---

## Architectural Recommendations

### Short-term (Quick Wins)

1. **Delete duplicate StorageAdapter** - Remove `/js/infrastructure/StorageAdapter.js`
2. **Extract configuration constants** - Create `js/config.js`
3. **Add proper logging utility** - Replace console.log statements
4. **Fix May 12, 2025 hardcoding** - Investigate and fix root cause

### Medium-term

1. **Split app.js** into smaller modules
2. **Implement automatic cache invalidation**
3. **Add comprehensive error handling**
4. **Standardize async/await usage**

### Long-term

1. **Consider TypeScript migration** for better type safety
2. **Implement virtual rendering** for performance
3. **Add comprehensive test suite**
4. **Consider state management library** if complexity grows

---

## Summary Table

| Issue | Severity | Effort | Impact |
|-------|----------|--------|--------|
| Duplicate StorageAdapter | High | Low | High |
| Hardcoded date fix | High | Medium | High |
| Magic numbers | Medium | Low | Medium |
| Large classes | Medium | High | High |
| Async/await inconsistency | Medium | Medium | Medium |
| Cache management | Medium | Medium | Medium |
| Console logging | Low | Low | Low |
| Memory leaks | Low | Medium | Medium |
| Missing tests | Low | High | High |

---

*Code Review conducted on: 2026-01-06*
