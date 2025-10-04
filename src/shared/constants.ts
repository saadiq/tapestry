/**
 * Shared constants used across main and renderer processes
 */

/**
 * Regex pattern to detect URLs with allowed protocols (http, https, mailto).
 * Used for validation in both main and renderer processes.
 * Case-insensitive to handle URLs like "HTTP://example.com" or "HTTPS://example.com"
 */
export const ALLOWED_PROTOCOL_REGEX = /^(https?|mailto):/i;

/**
 * List of allowed URL protocols for external links.
 * Used to validate URLs before opening them externally.
 */
export const ALLOWED_PROTOCOLS = ['http:', 'https:', 'mailto:'];
