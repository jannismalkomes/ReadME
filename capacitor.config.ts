import type { CapacitorConfig } from '@capacitor/cli';

// ============================================
// SET THIS TO MATCH src/config/appVersion.js
// ============================================
const IS_PREMIUM = true;

const config: CapacitorConfig = {
    appId: IS_PREMIUM ? 'app.cleancoin.premium' : 'app.cleancoin.free',
    appName: IS_PREMIUM ? 'CleanCoin' : 'CleanCoin Free',
    webDir: 'dist',
    android: {
        backgroundColor: '#09090b'
    },
    plugins: {
        StatusBar: {
            style: 'dark',
            backgroundColor: '#09090b'
        }
    }
};

export default config;
