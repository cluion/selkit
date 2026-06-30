---
"@selkit/core": minor
"@selkit/dom": minor
"@selkit/vue": minor
"@selkit/react": minor
"@selkit/themes": minor
"@selkit/floating": minor
---

highlightFirst: new config (default `true`). When `false`, the dropdown opens
and re-searches with no auto-highlight — only keyboard movement produces one.
Selecting an option now clears the highlight instead of leaving it on the
just-chosen item; keyboard `Enter` keeps its position so toggle-off still works.
Collapsing/expanding a group or tree node preserves the current highlight when
the highlighted item stays visible.
