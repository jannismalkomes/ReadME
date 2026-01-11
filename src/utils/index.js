/**
 * Creates a URL for a page
 * @param {string} pageName - The name of the page (e.g., 'Home', 'Settings', 'Gallery')
 * @returns {string} The URL path
 */
export function createPageUrl(pageName) {
    return `/${pageName}`;
}
