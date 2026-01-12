# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ReadME is a mobile app that converts PDF documents into audiobooks with text-to-speech. Built with React 18 + Vite, using Capacitor.js for cross-platform iOS/Android deployment.

## Commands

```bash
# Development
npm run dev              # Start Vite dev server
npm run build            # Build to /dist
npm run preview          # Preview production build

# Mobile
npm run android:run      # Build + sync + run on Android device
npm run ios:run          # Build + sync + run on iOS device
npm run android:open     # Open Android Studio
npm run ios:open         # Open Xcode
npm run android:sync     # Build + sync Android only
npm run ios:sync         # Build + sync iOS only
```

No test or lint commands are configured in this project.

## Architecture

### Tech Stack
- **React 18 + Vite** - Frontend framework and build tool
- **Capacitor.js 8** - Native iOS/Android wrapper
- **Tailwind CSS** - Styling (pure black/white theme)
- **pdfjs-dist** - PDF text extraction
- **Web Speech API** - Text-to-speech synthesis
- **localStorage** - Data persistence via custom storage client

### Project Structure
```
src/
├── pages/           # Route components (Home, Import, Player, Editor)
├── components/ui/   # Reusable Radix UI wrapped components
├── api/             # storageClient.js - localStorage wrapper
└── lib/             # utils.js - CSS utilities (cn function)
```

### Routing
- `/` - Home (library grid of imported PDFs)
- `/import` - PDF file picker with text processing settings
- `/player/:id` - Audio player with live text display
- `/editor/:id` - Full-text editor for manual cleanup

### Data Model
Books stored in localStorage under key `pdf_audiobook_books`. Each book has: `id`, `title`, `fileName`, `text`, `originalText`, `thumbnail` (data URL), `currentPosition` (char index), `createdAt`, `updatedAt`, `importSettings`.

### Storage API (`src/api/storageClient.js`)
```javascript
storage.books.list()           // Get all books
storage.books.get(id)          // Get single book
storage.books.create(data)     // Create book
storage.books.update(id, data) // Update book
storage.books.delete(id)       // Delete book
```

## Build Configuration

### Free vs Premium Versions
Toggle `IS_PREMIUM` in two files:
- `src/config/appVersion.js`
- `capacitor.config.ts`

App IDs: `app.cleancoin.free` (free) / `app.readme.premium` (premium)

### Version Numbers (update before release)
- `package.json` - `version`
- `android/app/build.gradle` - `versionCode`, `versionName`
- `ios/App/App.xcodeproj/project.pbxproj` - `CURRENT_PROJECT_VERSION`, `MARKETING_VERSION`

## Implementation Notes

- Web Speech API has mobile limitations; chunks limited to 5000 chars per utterance
- PDF.js worker loads from CDN for browser compatibility
- Thumbnails rendered from first PDF page at 900px width, JPEG 0.8 quality
- Position tracking uses ~15 chars/second at 1x playback speed
