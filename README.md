# NanoThumbnail

NanoThumbnail is a free, open-source web application designed to create viral YouTube thumbnails using AI. It supports two providers: **Replicate** (Google Nano Banana Pro model) and **Google Gemini** (gemini-3-pro-image-preview) to transform simple prompts into high-quality, expressive images.

![NanoThumbnail Preview](image.webp)

## Features

-   **Nano Banana Pro Integration**: Uses Google's latest model, optimized for text rendering and photorealism.
-   **BYOK (Bring Your Own Key)**: Connect your own Replicate or Google Gemini API key. You pay the provider directly, ensuring privacy and the lowest cost.
-   **100% Free Interface**: No monthly subscriptions or hidden fees for the UI.
-   **Reference Images**: Upload up to 14 reference images to guide the AI generation.
-   **Customizable Output**: Configure resolution (1K/2K/4K), aspect ratio (16:9, 9:16, 4:3, 1:1), output format (PNG/JPG), and safety filter level.
-   **Generation History**: Keep track of your recent creations (stored locally).
-   **Internationalization**: Fully translated in English 🇺🇸 and French 🇫🇷.
-   **Privacy Focused**: API keys and history are stored locally in your browser (LocalStorage).

## Tech Stack

-   **Framework**: [Astro](https://astro.build/) v5.0 (Static Site Generation)
-   **Language**: TypeScript
-   **Styling**: Custom CSS with Glassmorphism UI
-   **Icons**: Font Awesome
-   **Font**: Plus Jakarta Sans (Google Fonts)
-   **API**: [Replicate](https://replicate.com/) (Google Nano Banana Pro model) or [Google Gemini](https://aistudio.google.com/) (gemini-3-pro-image-preview)
-   **CORS Proxy**: [corsproxy.io](https://corsproxy.io/)
-   **Hosting**: [Netlify](https://netlify.com/)

## Project Structure

```
src/
├── components/
│   ├── app/                 # Application components
│   │   ├── Sidebar.astro    # Prompt input, image upload, settings
│   │   ├── MainArea.astro   # Result display area
│   │   ├── HistoryPanel.astro
│   │   └── SettingsModal.astro
│   ├── landing/             # Landing page sections
│   │   ├── Hero.astro
│   │   ├── Features.astro
│   │   ├── Problem.astro
│   │   ├── Steps.astro
│   │   ├── FAQ.astro
│   │   └── CTA.astro
│   ├── ui/                  # Reusable UI components
│   ├── Header.astro
│   ├── Footer.astro
│   └── LangSelect.astro
├── layouts/
│   ├── BaseLayout.astro     # Main layout with meta tags, fonts, icons
│   └── LegalLayout.astro    # Layout for legal pages
├── pages/
│   ├── index.astro          # Landing page
│   ├── app.astro            # Main application
│   ├── legal-notice.astro
│   ├── privacy-policy.astro
│   └── terms-of-service.astro
├── scripts/
│   ├── api.ts               # Replicate/Gemini API integration & polling
│   ├── state.ts             # Application state management
│   ├── ui.ts                # UI logic (history, image upload, settings)
│   ├── i18n/                # Internationalization
│   │   ├── index.ts         # i18n system (auto-detection, switching)
│   │   ├── en.ts            # English translations
│   │   └── fr.ts            # French translations
│   └── modules/
│       └── errors/          # Error handling & modal
└── styles/
    ├── global.css           # Global styles & CSS variables
    ├── errors.css
    └── legal.css
```

## Getting Started

### Prerequisites

-   Node.js (v18 or higher)
-   npm
-   A [Replicate](https://replicate.com/) API key and/or a [Google Gemini](https://aistudio.google.com/apikey) API key

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/yoanbernabeu/NanoThumbnail.git
    cd NanoThumbnail
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Start the development server:
    ```bash
    npm run dev
    ```

4.  Open your browser at `http://localhost:4321`

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally (static only, no proxy functions) |
| `npm run serve` | Serve `dist/` with the Netlify functions emulated (Replicate works locally) |
| `npm run start` | Build, then `serve` |

## Building for Production

```bash
npm run build
```

The output will be in the `dist/` directory.

### Running the production build locally

The Replicate provider and the YouTube remix fallback go through two Netlify
functions (`netlify/functions/`). `serve.mjs` is a zero-dependency Node server
that serves `dist/` and emulates both functions, so the full app works on your
machine without Netlify:

```bash
npm run start          # build + serve
# or, if dist/ already exists
npm run serve
```

Then open <http://localhost:8788/app/>. Set `PORT` / `HOST` to change the bind
address. API keys are still entered in the app's settings modal and stay in
your browser's localStorage.

### Deployment

The project is configured for deployment on **Netlify** with the `netlify.toml` configuration file.

## How It Works

1. **User enters a prompt** describing the desired thumbnail
2. **Optional**: Upload reference images to guide the generation
3. **Configure settings**: resolution, aspect ratio, format, safety level
4. **API call**: The prompt is enhanced and sent to Replicate (Nano Banana Pro) or Google Gemini, depending on the selected provider
5. **Polling** (Replicate only): The app polls the API until the generation is complete. Gemini returns the image in a single request
6. **Display**: The generated image is fetched via CORS proxy and displayed
7. **Download**: User can download the thumbnail in the selected format

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

**Yoan Bernabeu**

-   Website: [YoanDev.co](https://yoandev.co)
-   Twitter: [@yOyO38](https://twitter.com/yOyO38)
