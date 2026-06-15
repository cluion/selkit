---
"@selkit/core": minor
"@selkit/dom": minor
"@selkit/vue": minor
"@selkit/react": minor
---

feat: keep the active option scrolled into view

Moving the highlight with the keyboard (Arrow / Home / End) or opening the dropdown
now scrolls the active option into view automatically (`block: 'nearest'` — minimal
movement, only when off-screen). This keeps the `aria-activedescendant` target visible
as the combobox pattern requires. It triggers only when the active index changes, so
it never fights a manual scroll.

Under virtual scrolling the target row may not be rendered yet, so the scroll offset is
computed from the fixed `itemHeight` and the list re-renders at the new position.

- core: new `computeScrollIntoView` helper (sibling of `computeVirtualRange`)
- dom / vue / react: wire it into keyboard navigation and open
