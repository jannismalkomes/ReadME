import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'app.readme.premium',
    appName: 'ReadME',
    webDir: 'dist',
    android: {
        backgroundColor: '#000000'
    },
    plugins: {
        StatusBar: {
            style: 'dark',
            backgroundColor: '#000000'
        }
    }
};

export default config;
