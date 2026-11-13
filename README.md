# MIHAKK

MIHAKK is a React + TypeScript study and exam practice app for Helwan International Technological University. It turns the existing question bank in `Sub/` into focused, timed practice sessions, with instant feedback and a review screen. No student account or backend is required; session counts are kept locally in the browser.

MIHAKK is installable as a Progressive Web App. After the first online visit, its app shell, icons, and built assets are cached so the dashboard and bundled question bank can reopen offline. On supported browsers, use **Install app** in the header or the browser's install control.

## Run locally

```sh
npm install
npm run dev
```

## Build

```sh
npm run build
npm run preview
```

## GitHub Pages

The repository includes a GitHub Actions workflow that builds the Vite app and publishes `dist` to GitHub Pages on every push to `main`. In repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions**.

MCQ and true/false questions are auto-graded. Essay answers stay on the device and are compared with the source model answer for self-review.
