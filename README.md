# Foldii

Mobile-first origami **fold-order puzzle** (PWA). Tap creases on the flat crease pattern in a valid order and watch the model refold. No answer key — the TypeScript fold simulator decides what can fold when.

## Stack

- Vite + React + TypeScript (strict)
- Inline SVG rendering
- `useReducer` + context (no router)
- Vitest for geometry/sim tests
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) for offline install

## Develop

```bash
npm install
npm run dev
```

## Test & build

```bash
npm test
npm run build
```

Output is in `dist/` — deploy as a static site (e.g. Vercel, framework preset Vite).

## Levels

1. **Half** — single valley fold  
2. **Corner first** — kinked crease ordering  
3. **Paper cup** — five folds, traditional cup model  
