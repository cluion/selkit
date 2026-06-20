---
"@selkit/themes": minor
---

feat: dropdown open/close transition

Pure-CSS fade + slide on dropdown open and close (`@starting-style` + `display: allow-discrete`; no JS timing, no race):

- opacity + translateY(-4px), 0.15s ease (matches the existing arrow rotation)
- symmetric open/close
- `prefers-reduced-motion` disables the transition (a11y)
- graceful degradation on older browsers (instant show, no breakage)
- one rule shared by all three adapters (themes only); core / dom / vue / react untouched
