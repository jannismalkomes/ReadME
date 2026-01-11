# PDF to Audiobook Converter

This repository is the starting point for a new app that converts PDF documents into audiobooks. The app provides a clean and intuitive user experience, inspired by the Trade Republic app, and is built using modern web technologies with support for both Android and iOS platforms.

---

## Features

- **Home Tab**:
  - Displays all loaded PDFs in a tile format.
  - Allows importing new PDFs from the local device via a plus icon.
- **Listener Tab**:
  - Functions as an audio player, similar to Spotify.
  - Displays live text being spoken, akin to Spotify's lyrics feature.
  - Includes a text edit mode for manual cleaning of the generated text.
- **Import Tab**:
  - Provides settings to adjust text export options, such as filtering out page numbers.
  - Enables reimporting text from PDFs with updated settings.
- **Text Editor**:
  - Allows manual editing of the text, including removing unnecessary headers, numbers, or sections.
  - Offers a reimport button to reload text from the PDF if needed.

---

## Design

- **Theme**: Clean black-and-white design.
- **Inspiration**: Trade Republic app.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v20 recommended)
- [npm](https://www.npmjs.com/)
- [Android Studio](https://developer.android.com/studio) or [Xcode](https://developer.apple.com/xcode/) for native builds

### Installation

1. **Clone the repository:**
    ```sh
    git clone https://github.com/yourusername/pdf-to-audiobook.git
    cd pdf-to-audiobook
    ```
2. **Install dependencies:**
    ```sh
    npm install
    ```
3. **Run the app:**
    ```sh
    npm run dev
    ```

---

## Notes

This README provides a high-level overview of the app's functionality and design. For more details, refer to the [project description](project_description.md).
