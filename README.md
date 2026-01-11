# CleanCoin

CleanCoin is a privacy-first sobriety tracking app that rewards your progress with collectible milestone coins. All data is stored locally on your device—no ads, no analytics, no personal data collection.

---

## Features

- **Track Your Sobriety**: Add one or more habits (e.g., no alcohol, no smoking) and track your streaks.
- **Milestone Coins**: Earn beautifully designed 3D coins for each sobriety milestone (days, weeks, months, years).
- **Monthly Coins**: In the premium version, collect a unique coin for every month you keep all your habits unbroken.
- **Multiple Habits**: Track multiple habits independently (premium feature).
- **No Ads or Analytics**: 100% privacy—your data never leaves your device.
- **Offline-First**: Works fully offline; no account required.
- **Premium Upgrade**: Unlock unlimited habits and monthly coins.

---

## Screenshots

*(Add screenshots here if available)*

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v20 recommended)
- [npm](https://www.npmjs.com/)
- [Android Studio](https://developer.android.com/studio) or [Xcode](https://developer.apple.com/xcode/) for native builds

### Installation

1. **Clone the repository:**
    ```sh
    git clone https://github.com/yourusername/cleancoin.git
    cd cleancoin
    ```

2. **Install dependencies:**
    ```sh
    npm ci
    ```

3. **Run the app in development mode:**
    ```sh
    npm run dev
    ```

4. **Build for production:**
    ```sh
    npm run build
    ```

---

## Building for Android/iOS

See [BUILD_GUIDE.md](BUILD_GUIDE.md) for detailed instructions on building the free or premium version, including how to set version flags and package IDs.

---

## Project Structure

```
.
├── src/                # Main React source code
├── components/         # Legacy components (JS)
├── coins/              # Coin assets and logic
├── entities/           # Data entities
├── pages/              # Legacy pages (JS)
├── public/             # Static assets (privacy policy, icons, etc.)
├── android/            # Android native project
├── ios/                # iOS native project
├── .github/workflows/  # GitHub Actions CI/CD
├── package.json        # Project metadata and scripts
├── vite.config.js      # Vite configuration
├── tailwind.config.js  # Tailwind CSS config
├── BUILD_GUIDE.md      # Build instructions
└── README.md           # This file
```

---

## Privacy

CleanCoin is designed for privacy:

- **No personal data is collected or transmitted.**
- **No analytics or advertising libraries.**
- **All data is stored locally on your device.**

See [public/privacy-policy.md](public/privacy-policy.md) for full details.

---

## Contributing

Pull requests are welcome! Please open an issue first to discuss major changes.

---

## License

*(Specify your license here, e.g., MIT, GPL, etc.)*

---

## Contact

- **Website:** [https://cleancoin.app](https://cleancoin.app)
- **Email:** privacy@cleancoin.app

---

**Every day is a victory. Keep going. 💛**
