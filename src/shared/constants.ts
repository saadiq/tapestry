/**
 * Shared constants used across main and renderer processes
 */

/**
 * Regex pattern to detect URLs with allowed protocols (http, https, mailto).
 * Used for validation in both main and renderer processes.
 * Note: Case-sensitive to prevent malformed URLs (e.g., "HTTPS://example.com"
 * should not be treated as valid, as it would become "https://HTTPS://example.com")
 */
export const ALLOWED_PROTOCOL_REGEX = /^(https?|mailto):/;

/**
 * List of allowed URL protocols for external links.
 * Used to validate URLs before opening them externally.
 */
export const ALLOWED_PROTOCOLS = ['http:', 'https:', 'mailto:'];
