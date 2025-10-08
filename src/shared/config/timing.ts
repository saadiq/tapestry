/**
 * Timing configuration for auto-save and file operations
 * Centralized timing constants to ensure consistency across the application
 */

export const TIMING_CONFIG = {
  /**
   * Auto-save delay in milliseconds
   * Time to wait after user stops typing before auto-saving
   * @default 1000ms (1 second)
   */
  AUTO_SAVE_DELAY_MS: 1000,

  /**
   * File watcher debounce delay in milliseconds
   * Time to ignore file watcher events after our own save operations
   * Set to 3000ms because macOS fs.watch can fire events 2000-2500ms after a write
   * due to filesystem buffering and disk I/O latency. This prevents false "external change" warnings.
   * @default 3000ms (3 seconds)
   */
  FILE_WATCHER_DEBOUNCE_MS: 3000,

  /**
   * Window blur save debounce in milliseconds
   * Time to wait after window blur before triggering auto-save
   * Prevents rapid-fire saves during quick app switching
   * @default 100ms
   */
  BLUR_SAVE_DEBOUNCE_MS: 100,

  /**
   * Save operation timeout in milliseconds
   * Maximum time to wait for a save operation before timing out
   * Prevents hangs on slow I/O or network drives
   * @default 30000ms (30 seconds)
   */
  SAVE_TIMEOUT_MS: 30000,

  /**
   * File size threshold for displaying "saving..." toast
   * Files larger than this will show a toast during save operations
   * @default 10240 bytes (10KB)
   */
  LARGE_FILE_TOAST_THRESHOLD_BYTES: 10240,

  /**
   * File size threshold for large file warnings
   * Files larger than this will show a warning before loading
   * @default 5242880 bytes (5MB)
   */
  LARGE_FILE_WARNING_THRESHOLD_BYTES: 5_242_880,

  /**
   * Save tracking cleanup threshold
   * When the activeSaves Map exceeds this size, eager cleanup of stale entries is triggered
   * This prevents memory leaks during rapid file switching (e.g., opening >50 files in <5s)
   * @default 50 entries
   */
  SAVE_TRACKING_CLEANUP_THRESHOLD: 50,

  /**
   * Save event tracking delay in milliseconds
   * Delay after save completion before removing from activeSaves tracking map
   * Allows file system events to settle before we stop ignoring file watcher events
   * @default 50ms
   */
  SAVE_EVENT_TRACKING_DELAY_MS: 50,

  /**
   * Toast display durations by type
   */
  TOAST_DURATION: {
    SUCCESS_MS: 3000,
    ERROR_MS: 5000,
    INFO_MS: 3000,
    WARNING_MS: 4000,
  },
} as const;

/**
 * Type for timing config - useful for type-safe access
 */
export type TimingConfig = typeof TIMING_CONFIG;
