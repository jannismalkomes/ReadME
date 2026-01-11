/**
 * Creates a URL for a page
 * @param {string} pageName - The name of the page
 * @returns {string} The URL path
 */
export function createPageUrl(pageName) {
    return `/${pageName.toLowerCase()}`;
}

/**
 * Format duration in seconds to mm:ss format
 * @param {number} seconds 
 * @returns {string}
 */
export function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Truncate text to specified length
 * @param {string} text 
 * @param {number} maxLength 
 * @returns {string}
 */
export function truncateText(text, maxLength = 100) {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + '...';
}
