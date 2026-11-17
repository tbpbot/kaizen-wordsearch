# Kaizen's Wordsearch

An interactive word search with 300+ human-anatomy terms across 12 body systems.
Grids go up to 50×50 (160 terms). Free, no backend, no accounts.

**Stack:** Vite · React 19 · TypeScript · plain CSS · Vitest. Static output, so it deploys anywhere.

## Features
- 5 sizes (12×12 to 50×50), 3 difficulties (across/down → diagonals → backwards)
- Filter by body system; each system has its own highlight colour
- **Clue mode**: hides the word list and shows definitions instead
- Drag, click-click, tap-tap (touch keeps native scroll/pinch) and full keyboard control
- Hints, click-a-word-to-locate, reveal solution, pause, zoom, best times
- **Shareable puzzles**: the URL hash holds the seed and settings, so a link reproduces the exact grid
- Progress, theme and zoom persist in localStorage; light/dark themes

## Develop
```bash
npm install
npm run dev      # http://localhost:5173
npm test         # generator + geometry tests
npm run build    # typecheck + production build into dist/
```

## Deploy
1. Push to GitHub: `git init && git add . && git commit -m "Initial commit"`, then create a repo and push.
2. In Vercel choose **Add New → Project**, import the repo and deploy. Vite is auto-detected
   (build `npm run build`, output `dist`), so no config file is needed.

## Add or edit terms
Terms live in `src/data/terms.ts` as `"WORD|clue"` strings (A–Z only). `npm test` checks format and duplicates.
