/**
 * Logger.js - Centralized logging utility for Year Planner
 *
 * Provides configurable logging levels to reduce console noise in production
 * while allowing verbose debugging when needed.
 */

/**
 * Log levels enum
 */
export const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4,
};

/**
 * Logger class for structured application logging
 */
class Logger {
  /**
   * Create a new Logger instance
   * @param {string} [name='App'] - Logger name/prefix for log messages
   * @param {number} [level] - Minimum log level to output
   */
  constructor(name = 'App', level = null) {
    this.name = name;
    this._level = level !== null ? level : this._getDefaultLevel();
  }

  /**
   * Determine default log level based on environment
   * @returns {number} Default log level
   * @private
   */
  _getDefaultLevel() {
    // Check for debug mode via URL parameter or localStorage
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has('debug') || urlParams.get('log') === 'debug') {
        return LOG_LEVELS.DEBUG;
      }
      if (localStorage.getItem('yearPlanner_debug') === 'true') {
        return LOG_LEVELS.DEBUG;
      }
    }
    // Default to WARN level to reduce noise
    return LOG_LEVELS.WARN;
  }

  /**
   * Get current log level
   * @returns {number} Current log level
   */
  get level() {
    return this._level;
  }

  /**
   * Set log level
   * @param {number} level - New log level
   */
  set level(level) {
    if (level >= LOG_LEVELS.DEBUG && level <= LOG_LEVELS.NONE) {
      this._level = level;
    }
  }

  /**
   * Format a log message with timestamp and logger name
   * @param {string} levelName - Level name (DEBUG, INFO, etc.)
   * @param {Array} args - Arguments to log
   * @returns {Array} Formatted arguments
   * @private
   */
  _formatMessage(levelName, args) {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, 12);
    return [`[${timestamp}] [${this.name}] [${levelName}]`, ...args];
  }

  /**
   * Log a debug message
   * @param {...any} args - Arguments to log
   */
  debug(...args) {
    if (this._level <= LOG_LEVELS.DEBUG) {
      console.log(...this._formatMessage('DEBUG', args));
    }
  }

  /**
   * Log an info message
   * @param {...any} args - Arguments to log
   */
  info(...args) {
    if (this._level <= LOG_LEVELS.INFO) {
      console.info(...this._formatMessage('INFO', args));
    }
  }

  /**
   * Log a warning message
   * @param {...any} args - Arguments to log
   */
  warn(...args) {
    if (this._level <= LOG_LEVELS.WARN) {
      console.warn(...this._formatMessage('WARN', args));
    }
  }

  /**
   * Log an error message
   * @param {...any} args - Arguments to log
   */
  error(...args) {
    if (this._level <= LOG_LEVELS.ERROR) {
      console.error(...this._formatMessage('ERROR', args));
    }
  }

  /**
   * Log a group of related messages
   * @param {string} label - Group label
   * @param {Function} fn - Function containing log calls
   */
  group(label, fn) {
    if (this._level <= LOG_LEVELS.DEBUG) {
      console.group(`[${this.name}] ${label}`);
      fn();
      console.groupEnd();
    }
  }

  /**
   * Log timing information
   * @param {string} label - Timer label
   * @returns {Function} Function to call when timing is complete
   */
  time(label) {
    if (this._level <= LOG_LEVELS.DEBUG) {
      const start = performance.now();
      return () => {
        const duration = (performance.now() - start).toFixed(2);
        this.debug(`${label}: ${duration}ms`);
      };
    }
    return () => {}; // No-op if not debugging
  }

  /**
   * Create a child logger with a sub-name
   * @param {string} subName - Sub-name to append
   * @returns {Logger} New Logger instance
   */
  child(subName) {
    return new Logger(`${this.name}:${subName}`, this._level);
  }
}

/**
 * Create pre-configured loggers for different modules
 */
const createLogger = (name) => new Logger(name);

// Default application logger
export const logger = createLogger('YearPlanner');

// Module-specific loggers
export const appLogger = createLogger('App');
export const gridLogger = createLogger('Grid');
export const storageLogger = createLogger('Storage');
export const positionLogger = createLogger('Position');
export const recurrenceLogger = createLogger('Recurrence');

/**
 * Enable debug mode globally
 */
export function enableDebugMode() {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('yearPlanner_debug', 'true');
  }
  logger.level = LOG_LEVELS.DEBUG;
  appLogger.level = LOG_LEVELS.DEBUG;
  gridLogger.level = LOG_LEVELS.DEBUG;
  storageLogger.level = LOG_LEVELS.DEBUG;
  positionLogger.level = LOG_LEVELS.DEBUG;
  recurrenceLogger.level = LOG_LEVELS.DEBUG;
  logger.info('Debug mode enabled');
}

/**
 * Disable debug mode globally
 */
export function disableDebugMode() {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('yearPlanner_debug');
  }
  const defaultLevel = LOG_LEVELS.WARN;
  logger.level = defaultLevel;
  appLogger.level = defaultLevel;
  gridLogger.level = defaultLevel;
  storageLogger.level = defaultLevel;
  positionLogger.level = defaultLevel;
  recurrenceLogger.level = defaultLevel;
  console.info('Debug mode disabled');
}

// Export Logger class for custom instances
export { Logger };
