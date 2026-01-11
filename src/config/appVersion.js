// ============================================
// APP VERSION CONFIGURATION
// ============================================
// Set IS_PREMIUM to true for Premium version
// Set IS_PREMIUM to false for Free version
//
// BUILD INSTRUCTIONS:
// -------------------
// 1. Set IS_PREMIUM below (true or false)
// 2. Set IS_PREMIUM in capacitor.config.ts to match
// 3. Run: npm run build && npx cap sync
// 4. Open Android Studio / Xcode and build

export const APP_CONFIG = {
    // Master switch - set to true for premium, false for free
    IS_PREMIUM: true,

    // App identifiers
    APP_IDS: {
        FREE: 'app.cleancoin.free',
        PREMIUM: 'app.cleancoin.premium',
    },

    // Free version limits
    FREE_LIMITS: {
        MAX_HABITS: 1,
        MONTHLY_COINS_ENABLED: false,
    },

    // Premium version features
    PREMIUM_FEATURES: {
        MAX_HABITS: Infinity,
        MONTHLY_COINS_ENABLED: true,
    },
};

// Helper functions
export function isPremium() {
    return APP_CONFIG.IS_PREMIUM;
}

export function getMaxHabits() {
    return APP_CONFIG.IS_PREMIUM
        ? APP_CONFIG.PREMIUM_FEATURES.MAX_HABITS
        : APP_CONFIG.FREE_LIMITS.MAX_HABITS;
}

export function isMonthlyCoinsEnabled() {
    return APP_CONFIG.IS_PREMIUM
        ? APP_CONFIG.PREMIUM_FEATURES.MONTHLY_COINS_ENABLED
        : APP_CONFIG.FREE_LIMITS.MONTHLY_COINS_ENABLED;
}
