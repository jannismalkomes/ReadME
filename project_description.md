# Project Description: PDF to Audiobook Converter

## Overview
This project is a mobile application designed to convert PDF documents into audiobooks. The app provides a seamless user experience with a clean black-and-white design inspired by the Trade Republic app. It is built using React, Vite, and Capacitor.js for cross-platform mobile support.

## Tech Stack
- **Frontend**: React 18 with Vite
- **Mobile Support**: Capacitor.js for Android and iOS
- **Styling**: Tailwind CSS (black & white theme)
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **PDF Processing**: pdfjs-dist
- **Text-to-Speech**: Web Speech API (SpeechSynthesis)
- **Storage**: localStorage (via custom storage client)

## App Architecture

### Pages Structure
```
src/pages/
├── Home.jsx       # Library view with PDF tiles grid
├── Import.jsx     # PDF import with settings
├── Player.jsx     # Audio player with lyrics-style text display
└── Editor.jsx     # Text editor for manual cleaning
```

### Core Components
```
src/components/
└── ui/           # Reusable UI components (button, input, etc.)
```

### API/Storage
```
src/api/
└── storageClient.js   # localStorage-based book storage
```

## Key Features

### 1. Home Tab (Library)
- **PDF Grid**: Displays all imported PDFs in a 2-column tile format
- **Book Cards**: Each tile shows book icon, title, and import date
- **Menu Actions**: Long-press/menu for delete functionality
- **Add Button**: Floating action button (+) to import new PDFs
- **Empty State**: Friendly message when no books exist

### 2. Import Tab
- **File Picker**: Native file input for PDF selection
- **Import Settings**:
  - Remove page numbers (regex-based filtering)
  - Remove headers (experimental, length-based heuristic)
  - Remove footers (experimental)
  - Remove extra empty lines
  - Normalize whitespace
- **PDF Processing**: Uses pdfjs-dist to extract text from PDFs
- **Import Button**: Processes PDF and saves to storage

### 3. Player Tab
- **Audio Controls**:
  - Play/Pause button (centered, prominent)
  - Skip forward/backward (±500 characters)
  - Progress bar (clickable for seeking)
  - Speed control (0.5x - 2.0x)
- **Live Text Display**: 
  - Shows current text being spoken (like Spotify lyrics)
  - Updates in real-time during playback
  - Tap to open text editor
- **Navigation**: Back to library, link to editor

### 4. Text Editor
- **Full-screen Textarea**: Edit the extracted text
- **Auto-save**: Saves changes when navigating away
- **Manual Save**: Save button in header
- **Reset Function**: Reimport original text from PDF
- **Character Count**: Shows current text length

## Data Model

### Book Entity
```javascript
{
  id: string,           // Unique identifier
  title: string,        // Extracted from filename
  fileName: string,     // Original PDF filename
  text: string,         // Processed/edited text
  originalText: string, // Raw extracted text (for reset)
  createdAt: string,    // ISO date string
  updatedAt: string,    // ISO date string
  currentPosition: number, // Playback position (character index)
  importSettings: {
    removePageNumbers: boolean,
    removeHeaders: boolean,
    removeFooters: boolean,
    removeEmptyLines: boolean,
    normalizeWhitespace: boolean
  }
}
```

## Design Guidelines

### Colors
- **Background**: Pure black (#000000)
- **Text**: White (#FFFFFF)
- **Secondary Text**: Zinc-500 (#71717a)
- **Cards/Surfaces**: Zinc-900 (#18181b)
- **Borders**: Zinc-800 (#27272a)
- **Accent (CTAs)**: White on black, black on white

### Typography
- **Headers**: Semibold, larger sizes
- **Body**: Regular weight
- **UI Elements**: Medium weight

### Components
- **Buttons**: Rounded-full for actions, rounded-xl for cards
- **Cards**: Rounded-xl with subtle borders
- **Transitions**: Smooth color transitions on hover

## Routing
```
/               → Home (Library)
/import         → Import PDF
/player/:id     → Audio Player
/editor/:id     → Text Editor
```

## Future Enhancements (Not Yet Implemented)
- [ ] Multiple voice options
- [ ] Bookmark/highlight system
- [ ] Reading statistics
- [ ] Cloud sync
- [ ] Share functionality
- [ ] Chapter detection
- [ ] Background playback
- [ ] Sleep timer

## Build Commands
```bash
npm install          # Install dependencies
npm run dev          # Start development server
npm run build        # Build for production
npm run android:run  # Build and run on Android
npm run ios:run      # Build and run on iOS
```

## Notes for Implementation
1. The Web Speech API may have limitations on mobile - consider native TTS plugins for production
2. PDF.js worker needs to be loaded from CDN for browser compatibility
3. Large PDFs may need chunked processing to avoid memory issues
4. Consider IndexedDB for larger storage needs in production