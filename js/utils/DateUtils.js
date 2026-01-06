/**
 * DateUtils.js
 * Utility functions for handling dates consistently across time zones
 */

/**
 * Normalize a date to midnight UTC on the same calendar date
 * This ensures consistent date handling regardless of time zone
 *
 * @param {Date|string} date - Date to normalize
 * @returns {Date} Normalized date at midnight UTC
 */
export function normalizeDateToUTC(date) {
  if (!date) return null;

  // Convert to Date object if it's a string
  const dateObj = date instanceof Date ? date : new Date(date);

  // Create new date with just the year, month, and day components
  // This will be at midnight in local time
  const normalized = new Date(
    Date.UTC(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()),
  );

  return normalized;
}

/**
 * Create a date object for a specific calendar date (without time)
 *
 * @param {number} year - Year
 * @param {number} month - Month (0-11)
 * @param {number} day - Day of month
 * @returns {Date} Date object at midnight UTC
 */
export function createDateOnly(year, month, day) {
  return new Date(Date.UTC(year, month, day));
}

/**
 * Compare two dates by calendar date only (ignoring time)
 *
 * @param {Date} date1 - First date
 * @param {Date} date2 - Second date
 * @returns {number} -1 if date1 < date2, 0 if equal, 1 if date1 > date2
 */
export function compareDates(date1, date2) {
  const d1 = normalizeDateToUTC(date1);
  const d2 = normalizeDateToUTC(date2);

  return d1.getTime() - d2.getTime();
}

/**
 * Check if two dates represent the same calendar date
 *
 * @param {Date} date1 - First date
 * @param {Date} date2 - Second date
 * @returns {boolean} True if dates represent the same calendar date
 */
export function isSameDate(date1, date2) {
  return compareDates(date1, date2) === 0;
}

/**
 * Format a date as YYYY-MM-DD
 *
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
export function formatDateOnly(date) {
  const d = normalizeDateToUTC(date);
  return d.toISOString().split('T')[0];
}

/**
 * Get the number of days between two dates
 *
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {number} Number of days between dates (inclusive)
 */
export function getDaysBetween(startDate, endDate) {
  const start = normalizeDateToUTC(startDate);
  const end = normalizeDateToUTC(endDate);

  // Add 1 to include both start and end dates
  return Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Get day of week for a UTC date using Monday=0, Sunday=6 format
 *
 * IMPORTANT: This function uses getUTCDay() to avoid timezone issues.
 * When dates are stored as UTC midnight, using getDay() in negative UTC
 * offset timezones would return the previous day's day-of-week.
 *
 * @param {Date} date - Date object (should be normalized to UTC midnight)
 * @returns {number} Day of week (0=Monday, 1=Tuesday, ..., 6=Sunday)
 */
export function getDayOfWeekUTC(date) {
  // JavaScript getUTCDay() returns 0 for Sunday, 1 for Monday, ..., 6 for Saturday
  // We need to convert to: 0=Monday, 1=Tuesday, ..., 6=Sunday
  const utcDay = date.getUTCDay();
  return utcDay === 0 ? 6 : utcDay - 1;
}

/**
 * Get day of week from a local date using Monday=0, Sunday=6 format
 *
 * Use this for dates created with new Date(year, month, day) which are in local time.
 *
 * @param {Date} date - Date object in local time
 * @returns {number} Day of week (0=Monday, 1=Tuesday, ..., 6=Sunday)
 */
export function getDayOfWeekLocal(date) {
  // JavaScript getDay() returns 0 for Sunday, 1 for Monday, ..., 6 for Saturday
  // We need to convert to: 0=Monday, 1=Tuesday, ..., 6=Sunday
  const day = date.getDay();
  return day === 0 ? 6 : day - 1;
}
