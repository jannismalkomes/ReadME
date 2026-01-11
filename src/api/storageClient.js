/**
 * Storage client for PDF Audiobook app
 * Uses localStorage for persistence
 */

// Helper to get data from localStorage
const getStoredData = (key) => {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('Error reading from localStorage:', e);
        return [];
    }
};

// Helper to save data to localStorage
const saveStoredData = (key, data) => {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error('Error saving to localStorage:', e);
    }
};

// Generate a unique ID
const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

const STORAGE_KEY = 'pdf_audiobook_books';

/**
 * Book entity structure:
 * {
 *   id: string,
 *   title: string,
 *   fileName: string,
 *   text: string,
 *   originalText: string,
 *   createdAt: string,
 *   updatedAt: string,
 *   currentPosition: number, // character position for playback
 *   importSettings: {
 *     removePageNumbers: boolean,
 *     removeHeaders: boolean,
 *     removeFooters: boolean,
 *   }
 * }
 */

export const storage = {
    books: {
        list: async () => {
            return getStoredData(STORAGE_KEY);
        },

        get: async (id) => {
            const books = getStoredData(STORAGE_KEY);
            return books.find(book => book.id === id) || null;
        },

        create: async (bookData) => {
            const books = getStoredData(STORAGE_KEY);
            const newBook = {
                id: generateId(),
                ...bookData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                currentPosition: 0,
            };
            books.push(newBook);
            saveStoredData(STORAGE_KEY, books);
            return newBook;
        },

        update: async (id, updates) => {
            const books = getStoredData(STORAGE_KEY);
            const index = books.findIndex(book => book.id === id);
            if (index === -1) return null;

            books[index] = {
                ...books[index],
                ...updates,
                updatedAt: new Date().toISOString(),
            };
            saveStoredData(STORAGE_KEY, books);
            return books[index];
        },

        delete: async (id) => {
            const books = getStoredData(STORAGE_KEY);
            const filtered = books.filter(book => book.id !== id);
            saveStoredData(STORAGE_KEY, filtered);
            return true;
        },
    },
};
