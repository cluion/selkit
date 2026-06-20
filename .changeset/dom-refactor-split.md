---
"@selkit/dom": patch
---

refactor: split dom.ts into types / select-form / templates modules

dom.ts exceeded the 800-line guideline. Extract focused modules with no behavior
change (all 89 dom tests unchanged and green):

- `types.ts` — SelkitDomConfig / SelkitDomInstance / row types
- `select-form.ts` — native <select> parsing, config merge, and form sync (pure fns)
- `templates.ts` — dropdown row builders (group / create / option / spacer) as pure fns

dom.ts drops 979 → 750 lines. Public API unchanged.
