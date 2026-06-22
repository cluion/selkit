---
"@selkit/core": minor
"@selkit/dom": minor
"@selkit/vue": minor
"@selkit/react": minor
"@selkit/floating": minor
"@selkit/themes": minor
---

SSR safety net — all packages server-side render without errors and hydrate cleanly (Next.js / Nuxt / VitePress).

- `@selkit/react`: portal target now resolves in `useEffect` (was `useMemo` during render), so the server pass never touches `document`; ships a built-in `"use client"` directive for the Next.js App Router.
- Added SSR smoke tests — React via `renderToStaticMarkup`, Vue via `renderToString` — both in a document-free `node` environment.
- New docs page documents SSR status per package plus Next.js / Nuxt usage.
