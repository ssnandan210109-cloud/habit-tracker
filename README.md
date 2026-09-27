# Daymark

A local-first habit tracker built with React, Vite, Tailwind CSS, Framer Motion, Lucide, and Recharts. Habit history stays in browser storage; there is no backend or account requirement.

## Run locally

Requires Node.js 20.19+ and npm.

```sh
npm install
npm run dev
```

Create a production build with `npm run build`.

## Included

- First-run setup with focus areas and optional starter habits
- Habit creation, editing, archive/restore, deletion, schedules, goals, icons, and colors
- Daily check-ins, weekly grids, streaks, shield protection, completion history, and XP
- Dashboard, Today, calendar, insights, achievements, focus timer, and settings views
- Local persistence, JSON export/import, dark mode, search, notifications, and keyboard command palette
- Responsive sidebar and mobile navigation, reduced-motion support, install manifest, and offline service worker

## Data

The app stores its state under `daymark-v1` in browser `localStorage`. Export a JSON backup in Settings before clearing browser data. Sample habits are only offered as optional onboarding choices and are not inserted automatically.
