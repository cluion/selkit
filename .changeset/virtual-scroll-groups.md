---
"@selkit/core": minor
"@selkit/dom": minor
"@selkit/vue": minor
"@selkit/react": minor
---

feat: virtual scrolling now supports grouped lists

Virtual scroll previously fell back to full rendering when `optgroup`-style groups
were present (uniform fixed-height rows were required). It now virtualizes grouped
lists too, using a per-row height model so group headers and options can differ in
height.

- New `groupHeight` option (DOM config) / prop (Vue + React), default `28` — set it
  to match your theme's header height, like `itemHeight`.
- New core helpers: `computeVirtualWindow` (variable-height windowing via cumulative
  offsets) and `computeScrollIntoViewVariable` (keep the active option visible under
  grouped virtual scroll). Flat lists keep the existing `O(1)` `computeVirtualRange`
  fast path.

Notes: group headers are not sticky; extreme (100k+) lists are best kept flat —
grouped virtual targets up to a few thousand rows.
