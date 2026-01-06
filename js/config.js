/**
 * config.js - Centralized configuration constants for Year Planner
 *
 * This module contains all magic numbers and configuration values
 * used throughout the application.
 */

/**
 * Calendar grid configuration
 */
export const CALENDAR = {
  /** Number of months in a year */
  MONTHS_PER_YEAR: 12,

  /** Number of days in a week */
  DAYS_PER_WEEK: 7,

  /** Maximum number of weeks that can appear in a month view (5 full weeks + partial) */
  MAX_WEEKS_IN_MONTH: 6,

  /** Total day columns in the grid (5 weeks * 7 days + 2 extra for months starting on weekends) */
  GRID_DAY_COLUMNS: 37,

  /** Total columns including month name column */
  GRID_TOTAL_COLUMNS: 38,

  /** Row height for month rows in pixels */
  MONTH_ROW_HEIGHT: 80,

  /** Header row height in pixels */
  HEADER_ROW_HEIGHT: 40,
};

/**
 * Event display configuration
 */
export const EVENT_DISPLAY = {
  /** Maximum number of swim lanes per day cell */
  MAX_SWIM_LANES: 5,

  /** Swim lane reserved for public holidays (top position) */
  HOLIDAY_LANE: 0,

  /** Height of each event element in pixels */
  EVENT_HEIGHT: 16,

  /** Top offset for events to avoid overlapping day numbers */
  EVENT_TOP_OFFSET: 20,

  /** Maximum title length for truncated display */
  MAX_TITLE_LENGTH: 12,

  /** Truncation suffix */
  TRUNCATION_SUFFIX: '...',
};

/**
 * Year navigation configuration
 */
export const YEAR_NAVIGATION = {
  /** Number of years to show before current year in dropdown */
  YEARS_BEFORE: 10,

  /** Number of years to show after current year in dropdown */
  YEARS_AFTER: 10,
};

/**
 * UI timing configuration (in milliseconds)
 */
export const TIMING = {
  /** Duration to show notification messages */
  NOTIFICATION_DURATION: 5000,

  /** Delay for hover effects to reduce flickering */
  HOVER_DELAY: 50,

  /** Debounce delay for resize events */
  RESIZE_DEBOUNCE: 150,

  /** Transition duration for CSS animations */
  TRANSITION_DURATION: 150,
};

/**
 * Storage configuration
 */
export const STORAGE = {
  /** Prefix for localStorage keys */
  KEY_PREFIX: 'yearPlanner_',

  /** Key suffix for events */
  EVENTS_KEY_SUFFIX: 'events_',
};

/**
 * Recurrence pattern types
 */
export const RECURRENCE_TYPES = {
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  ANNUAL: 'annual',
};

/**
 * Day of week constants (Monday = 0, Sunday = 6)
 * Note: JavaScript Date.getDay() returns 0 for Sunday, 6 for Saturday
 * This application uses Monday as 0 for calendar display
 */
export const DAYS = {
  MONDAY: 0,
  TUESDAY: 1,
  WEDNESDAY: 2,
  THURSDAY: 3,
  FRIDAY: 4,
  SATURDAY: 5,
  SUNDAY: 6,
};

/**
 * Month constants (0-indexed)
 */
export const MONTHS = {
  JANUARY: 0,
  FEBRUARY: 1,
  MARCH: 2,
  APRIL: 3,
  MAY: 4,
  JUNE: 5,
  JULY: 6,
  AUGUST: 7,
  SEPTEMBER: 8,
  OCTOBER: 9,
  NOVEMBER: 10,
  DECEMBER: 11,
};

/**
 * Month names for display
 */
export const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Day names for display (Monday-first week)
 */
export const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * Time constants
 */
export const TIME = {
  /** Milliseconds in a day */
  MS_PER_DAY: 24 * 60 * 60 * 1000,

  /** Milliseconds in an hour */
  MS_PER_HOUR: 60 * 60 * 1000,

  /** Milliseconds in a minute */
  MS_PER_MINUTE: 60 * 1000,
};

/**
 * Convert JavaScript day (0=Sunday) to application day (0=Monday)
 * @param {number} jsDay - JavaScript Date.getDay() value (0-6, Sunday=0)
 * @returns {number} Application day value (0-6, Monday=0)
 */
export function jsToAppDay(jsDay) {
  return jsDay === 0 ? 6 : jsDay - 1;
}

/**
 * Convert application day (0=Monday) to JavaScript day (0=Sunday)
 * @param {number} appDay - Application day value (0-6, Monday=0)
 * @returns {number} JavaScript Date.getDay() value (0-6, Sunday=0)
 */
export function appToJsDay(appDay) {
  return appDay === 6 ? 0 : appDay + 1;
}
