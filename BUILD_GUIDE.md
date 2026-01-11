# CleanCoin Build Guide

## App Versions

| Version | App ID | App Name |
|---------|--------|----------|
| Free | `app.cleancoin.free` | CleanCoin |
| Premium | `app.readme.premium` | CleanCoin Premium |

---

## Building the Free Version

### 1. Set the flags
In `src/config/appVersion.js`:
```js
IS_PREMIUM: false
```

In `capacitor.config.ts`:
```ts
const IS_PREMIUM = false;
```

### 2. Sync the project
Click the **🔄 Sync** button in VS Code, or run:
```bash
npm run build && npx cap sync
```

### 3. Build in Android Studio
1. Open Android Studio (click **🤖 Android** button)
2. **File → Sync Project with Gradle Files**
3. **Build → Clean Project**
4. **Build → Generate Signed Bundle / APK...**
5. Choose **Android App Bundle** (for Play Store) or **APK**
6. Select your keystore and complete the wizard

---

## Building the Premium Version

### 1. Set the flags
In `src/config/appVersion.js`:
```js
IS_PREMIUM: true
```

In `capacitor.config.ts`:
```ts
const IS_PREMIUM = true;
```

### 2. Update Android package (first time only)
Rename the folder:
```
android/app/src/main/java/app/cleancoin/free/
→ android/app/src/main/java/app/readme/premium/
```

Update `MainActivity.java`:
```java
package app.readme.premium;
```

Update `android/app/build.gradle`:
```groovy
namespace = "app.readme.premium"
applicationId "app.readme.premium"
```

### 3. Sync the project
```bash
npm run build && npx cap sync
```

### 4. Build in Android Studio
1. Open Android Studio
2. **File → Sync Project with Gradle Files**
3. **Build → Clean Project**
4. **Build → Generate Signed Bundle / APK...**
5. Choose **Android App Bundle** or **APK**
6. Select your keystore and complete the wizard

---

## iOS Build Notes

For iOS, update the Bundle Identifier in Xcode:
- Free: `app.cleancoin.free`
- Premium: `app.readme.premium`

1. Open Xcode (click **🍎 iOS** button)
2. Select the **App** target
3. Go to **Signing & Capabilities**
4. Update **Bundle Identifier**
5. Archive and upload to App Store Connect

---

## Version Numbers

Update version numbers in these files before each release:

| File | Field |
|------|-------|
| `package.json` | `version` |
| `android/app/build.gradle` | `versionCode` and `versionName` |
| `ios/App/App.xcodeproj/project.pbxproj` | `CURRENT_PROJECT_VERSION` and `MARKETING_VERSION` |
