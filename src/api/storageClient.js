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
const SETTINGS_KEY = 'pdf_audiobook_settings';

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
 *   lastVoiceURI: string, // last selected voice for this book
 *   lastSpeechRate: number, // last selected playback speed for this book
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

    settings: {
        get: async () => {
            const settings = localStorage.getItem(SETTINGS_KEY);
            return settings ? JSON.parse(settings) : {
                favoriteVoices: [], // Array of voice URIs
                defaultLanguages: {}, // Map of bookId -> language code
            };
        },

        update: async (updates) => {
            const current = await storage.settings.get();
            const updated = { ...current, ...updates };
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
            return updated;
        },

        addFavoriteVoice: async (voiceURI) => {
            const settings = await storage.settings.get();
            if (!settings.favoriteVoices.includes(voiceURI)) {
                settings.favoriteVoices.push(voiceURI);
                await storage.settings.update(settings);
            }
            return settings;
        },

        removeFavoriteVoice: async (voiceURI) => {
            const settings = await storage.settings.get();
            settings.favoriteVoices = settings.favoriteVoices.filter(v => v !== voiceURI);
            await storage.settings.update(settings);
            return settings;
        },

        setBookDefaultLanguage: async (bookId, languageCode) => {
            const settings = await storage.settings.get();
            settings.defaultLanguages[bookId] = languageCode;
            await storage.settings.update(settings);
            return settings;
        },
    },
};
