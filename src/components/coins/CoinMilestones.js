// Coin milestone utilities
// Milestones are loaded from /public/milestones.json

// Base URL for coin files
const COINS_BASE_URL = '/coins/';

// Cache for loaded data
let milestonesCache = null;
let monthlyCoinsCache = null;
let fullDataCache = null;

/**
 * Load all data from the config file
 */
const loadFullData = async () => {
    if (fullDataCache) {
        return fullDataCache;
    }

    try {
        const response = await fetch('/milestones.json');
        fullDataCache = await response.json();
        return fullDataCache;
    } catch (error) {
        console.error('Error loading milestones:', error);
        return { milestones: [], monthlyCoins: [] };
    }
};

/**
 * Load milestones from the config file
 * This is the main way to get milestone data - edit public/milestones.json to add/modify milestones
 */
export const loadMilestones = async () => {
    if (milestonesCache) {
        return milestonesCache;
    }

    const data = await loadFullData();

    // Transform milestones to include full GLB URL
    milestonesCache = data.milestones.map(milestone => ({
        ...milestone,
        type: 'milestone',
        glbUrl: milestone.coinFile ? `${COINS_BASE_URL}${milestone.coinFile}` : ''
    }));

    return milestonesCache;
};

/**
 * Load monthly coins from the config file
 * Monthly coins are earned when the user stays sober for an entire calendar month
 */
export const loadMonthlyCoins = async () => {
    if (monthlyCoinsCache) {
        return monthlyCoinsCache;
    }

    const data = await loadFullData();

    // Transform monthly coins to include full GLB URL
    monthlyCoinsCache = (data.monthlyCoins || []).map(coin => ({
        ...coin,
        type: 'monthly',
        glbUrl: coin.coinFile ? `${COINS_BASE_URL}${coin.coinFile}` : ''
    }));

    return monthlyCoinsCache;
};

/**
 * Clear the cache (useful if you update milestones.json and want to reload)
 */
export const clearMilestonesCache = () => {
    milestonesCache = null;
    monthlyCoinsCache = null;
    fullDataCache = null;
};

/**
 * Get milestones that the user has earned based on days sober
 */
export const getEarnedMilestones = (milestones, daysSober) => {
    return milestones.filter(m => daysSober >= m.days);
};

/**
 * Get the most recent milestone earned
 */
export const getLatestMilestone = (milestones, daysSober) => {
    const earned = getEarnedMilestones(milestones, daysSober);
    return earned.length > 0 ? earned[earned.length - 1] : null;
};

/**
 * Get the next milestone to earn
 */
export const getNextMilestone = (milestones, daysSober) => {
    return milestones.find(m => daysSober < m.days) || null;
};

/**
 * Get a specific milestone by ID
 */
export const getMilestoneById = (milestones, id) => {
    return milestones.find(m => m.id === id);
};

/**
 * Check if a user has earned a specific monthly coin
 * User must have been sober since before the start of the month
 * and the month must have ended
 * @param {Date} startDate - The user's sobriety start date (or latest relevant habit start)
 * @param {Object} monthlyCoin - The monthly coin object { year, month }
 * @param {Date} [currentDate] - Optional current date for testing
 * @returns {boolean}
 */
export const hasEarnedMonthlyCoin = (startDate, monthlyCoin, currentDate = new Date()) => {
    if (!startDate) return false;

    const soberStart = new Date(startDate);

    // First day of the coin's month (user must be sober before or on this date)
    const monthStart = new Date(monthlyCoin.year, monthlyCoin.month - 1, 1);

    // First day of the NEXT month (the coin's month must have ended)
    const monthEnd = new Date(monthlyCoin.year, monthlyCoin.month, 1);

    // User must have started sobriety before or on the first day of the month
    // AND the month must have passed (current date is after the month ended)
    return soberStart <= monthStart && currentDate >= monthEnd;
};

/**
 * Check if a monthly coin is earned with multi-habit support
 * Only considers habits that existed BEFORE the start of the month
 * Habits added during the month don't affect that month's coin
 * @param {Array} habits - Array of habit objects with start_date
 * @param {Object} monthlyCoin - The monthly coin object { year, month }
 * @param {Date} [currentDate] - Optional current date for testing
 * @returns {boolean}
 */
export const hasEarnedMonthlyCoinWithHabits = (habits, monthlyCoin, currentDate = new Date()) => {
    if (!habits || habits.length === 0) return false;

    // First day of the coin's month
    const monthStart = new Date(monthlyCoin.year, monthlyCoin.month - 1, 1);

    // First day of the NEXT month (the coin's month must have ended)
    const monthEnd = new Date(monthlyCoin.year, monthlyCoin.month, 1);

    // The month must have ended
    if (currentDate < monthEnd) return false;

    // Filter habits that existed BEFORE the month started
    // (habits added during or after the month don't count for this month's coin)
    const relevantHabits = habits.filter(habit => {
        const habitStart = new Date(habit.start_date);
        return habitStart < monthStart;
    });

    // If no habits existed before this month, can't earn the coin
    if (relevantHabits.length === 0) return false;

    // All relevant habits must have been started before or on the first day of the month
    // (they must have been clean for the entire month)
    return relevantHabits.every(habit => {
        const habitStart = new Date(habit.start_date);
        return habitStart <= monthStart;
    });
};

/**
 * Get all monthly coins the user has earned
 * @param {Array} monthlyCoins - Array of all monthly coins
 * @param {Date} startDate - The user's sobriety start date (for backward compatibility)
 * @param {Date} [currentDate] - Optional current date for testing
 * @returns {Array}
 */
export const getEarnedMonthlyCoins = (monthlyCoins, startDate, currentDate = new Date()) => {
    if (!startDate || !monthlyCoins) return [];
    return monthlyCoins.filter(coin => hasEarnedMonthlyCoin(startDate, coin, currentDate));
};

/**
 * Get all monthly coins earned with multi-habit support
 * @param {Array} monthlyCoins - Array of all monthly coins
 * @param {Array} habits - Array of habit objects with start_date
 * @param {Date} [currentDate] - Optional current date for testing
 * @returns {Array}
 */
export const getEarnedMonthlyCoinsWithHabits = (monthlyCoins, habits, currentDate = new Date()) => {
    if (!habits || habits.length === 0 || !monthlyCoins) return [];
    return monthlyCoins.filter(coin => hasEarnedMonthlyCoinWithHabits(habits, coin, currentDate));
};

/**
 * Get the next monthly coin the user can earn
 * @param {Array} monthlyCoins - Array of all monthly coins
 * @param {Date} startDate - The user's sobriety start date
 * @param {Date} [currentDate] - Optional current date for testing
 * @returns {Object|null}
 */
export const getNextMonthlyCoin = (monthlyCoins, startDate, currentDate = new Date()) => {
    if (!startDate || !monthlyCoins) return null;

    const soberStart = new Date(startDate);

    // Find the first monthly coin that:
    // 1. User started sobriety before or on the first of that month
    // 2. The month has not yet ended
    return monthlyCoins.find(coin => {
        const monthStart = new Date(coin.year, coin.month - 1, 1);
        const monthEnd = new Date(coin.year, coin.month, 1);
        return soberStart <= monthStart && currentDate < monthEnd;
    }) || null;
};

/**
 * Get the next monthly coin with multi-habit support
 * Only considers habits that existed before the month started
 * @param {Array} monthlyCoins - Array of all monthly coins
 * @param {Array} habits - Array of habit objects with start_date
 * @param {Date} [currentDate] - Optional current date for testing
 * @returns {Object|null}
 */
export const getNextMonthlyCoinWithHabits = (monthlyCoins, habits, currentDate = new Date()) => {
    if (!habits || habits.length === 0 || !monthlyCoins) return null;

    // Find the first monthly coin where:
    // 1. At least one habit existed before the month started
    // 2. All habits that existed before the month are still clean
    // 3. The month has not yet ended
    return monthlyCoins.find(coin => {
        const monthStart = new Date(coin.year, coin.month - 1, 1);
        const monthEnd = new Date(coin.year, coin.month, 1);

        // Month must not have ended yet
        if (currentDate >= monthEnd) return false;

        // Filter habits that existed before this month
        const relevantHabits = habits.filter(habit => {
            const habitStart = new Date(habit.start_date);
            return habitStart < monthStart;
        });

        // Need at least one habit that existed before the month
        if (relevantHabits.length === 0) return false;

        // All relevant habits must be clean (started before the month)
        return relevantHabits.every(habit => {
            const habitStart = new Date(habit.start_date);
            return habitStart <= monthStart;
        });
    }) || null;
};

/**
 * Get the month name
 */
export const getMonthName = (month) => {
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1] || '';
};

/**
 * Legacy function - now just loads from config file
 * Kept for backward compatibility with existing code
 */
export const getMilestonesWithAssets = async () => {
    return loadMilestones();
};

// Default export for convenience
export default {
    loadMilestones,
    loadMonthlyCoins,
    clearMilestonesCache,
    getEarnedMilestones,
    getLatestMilestone,
    getNextMilestone,
    getMilestoneById,
    hasEarnedMonthlyCoin,
    getEarnedMonthlyCoins,
    getNextMonthlyCoin,
    getMonthName,
    getMilestonesWithAssets
};
