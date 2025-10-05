/**
 * URL sanitization utilities
 * Validates and sanitizes URLs to prevent XSS and other security issues
 */

/**
 * Allowed URL protocols for links and images
 */
const ALLOWED_PROTOCOLS = ['http:', 'https:', 'mailto:'];

/**
 * Allowed protocols specifically for images
 */
const ALLOWED_IMAGE_PROTOCOLS = ['http:', 'https:', 'data:'];

/**
 * Sanitize and validate a URL
 * @param url - The URL to sanitize
 * @param allowedProtocols - Array of allowed protocols (default: ALLOWED_PROTOCOLS)
 * @returns Sanitized URL or empty string if invalid
 */
export function sanitizeUrl(
  url: string,
  allowedProtocols: string[] = ALLOWED_PROTOCOLS
): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  // Trim whitespace
  const trimmedUrl = url.trim();

  if (trimmedUrl === '') {
    return '';
  }

  // Decode to prevent double-encoding tricks
  let decodedUrl: string;
  try {
    decodedUrl = decodeURIComponent(trimmedUrl);
  } catch {
    // If decoding fails, use original (might already be decoded)
    decodedUrl = trimmedUrl;
  }

  // Check for dangerous patterns (case-insensitive)
  const dangerousPatterns = [
    /^\s*javascript:/i,
    /^\s*data:text\/html/i,
    /^\s*vbscript:/i,
    /^\s*file:/i,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(decodedUrl)) {
      return '';
    }
  }

  // Try to parse as URL
  try {
    // For absolute URLs, parse without base
    // For relative URLs, use window.location.href if available
    const base = (typeof window !== 'undefined' && window.location) ? window.location.href : 'http://localhost/';
    const urlObj = new URL(trimmedUrl, base);

    // Check if protocol is allowed
    if (allowedProtocols.includes(urlObj.protocol)) {
      let href = urlObj.href;

      // Strip trailing slash for root URLs (e.g., http://example.com/ -> http://example.com)
      // but keep it for paths (e.g., http://example.com/path/)
      if (href.endsWith('/') && urlObj.pathname === '/') {
        href = href.slice(0, -1);
      }

      return href;
    }

    // Protocol not allowed
    return '';
  } catch {
    // If URL parsing fails, it might be a relative URL or anchor
    // Allow relative URLs and anchors (they're safe)
    if (trimmedUrl.startsWith('/') || trimmedUrl.startsWith('#') || trimmedUrl.startsWith('.')) {
      return trimmedUrl;
    }

    // Invalid URL format
    return '';
  }
}

/**
 * Sanitize a link URL (allows http, https, mailto)
 */
export function sanitizeLinkUrl(url: string): string {
  return sanitizeUrl(url, ALLOWED_PROTOCOLS);
}

/**
 * Sanitize an image URL (allows http, https, data URIs for inline images)
 */
export function sanitizeImageUrl(url: string): string {
  const sanitized = sanitizeUrl(url, ALLOWED_IMAGE_PROTOCOLS);

  // Additional validation for data URIs - only allow images
  if (sanitized.startsWith('data:')) {
    if (!sanitized.startsWith('data:image/')) {
      return '';
    }
  }

  return sanitized;
}
