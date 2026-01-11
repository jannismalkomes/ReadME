/**
 * Mock Base44 client for local development
 * This simulates the Base44 API using localStorage for persistence
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

// Mock user (simulating logged-in user)
const mockUser = {
    id: 'user-1',
    email: 'demo@cleancoin.app',
    name: 'Demo User',
    role: 'admin', // Set to admin so you can access CoinUpload
};

// Create entity methods
const createEntityMethods = (entityName) => {
    const storageKey = `cleancoin_${entityName}`;

    return {
        list: async () => {
            return getStoredData(storageKey);
        },

        filter: async (criteria) => {
            const items = getStoredData(storageKey);
            return items.filter((item) => {
                return Object.entries(criteria).every(([key, value]) => item[key] === value);
            });
        },

        get: async (id) => {
            const items = getStoredData(storageKey);
            return items.find((item) => item.id === id) || null;
        },

        create: async (data) => {
            const items = getStoredData(storageKey);
            const newItem = {
                ...data,
                id: generateId(),
                created_by: mockUser.email,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
            items.push(newItem);
            saveStoredData(storageKey, items);
            return newItem;
        },

        update: async (id, data) => {
            const items = getStoredData(storageKey);
            const index = items.findIndex((item) => item.id === id);
            if (index !== -1) {
                items[index] = {
                    ...items[index],
                    ...data,
                    updated_at: new Date().toISOString(),
                };
                saveStoredData(storageKey, items);
                return items[index];
            }
            throw new Error(`${entityName} with id ${id} not found`);
        },

        delete: async (id) => {
            const items = getStoredData(storageKey);
            const filtered = items.filter((item) => item.id !== id);
            saveStoredData(storageKey, filtered);
            return { success: true };
        },
    };
};

// Base44 client mock
export const base44 = {
    auth: {
        me: async () => mockUser,
        login: async () => mockUser,
        logout: async () => ({ success: true }),
    },

    entities: {
        UserProgress: createEntityMethods('UserProgress'),
        CoinAsset: createEntityMethods('CoinAsset'),
    },

    integrations: {
        Core: {
            // Mock file upload - stores as data URL
            UploadFile: async ({ file }) => {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => {
                        // In a real app, this would upload to a server
                        // For now, we'll use the data URL or a placeholder
                        resolve({
                            file_url: reader.result, // Data URL of the file
                        });
                    };
                    reader.onerror = () => reject(new Error('Failed to read file'));
                    reader.readAsDataURL(file);
                });
            },
        },
    },
};

export default base44;
