---
'@selkit/core': minor
'@selkit/dom': minor
'@selkit/vue': minor
'@selkit/react': minor
'@selkit/themes': minor
'@selkit/floating': minor
---

Tree cascade (Phase 2): `treeCascade` config (default true, multiple-only) makes
selecting a parent check all descendant leaves and show a mixed (▣) state on
partially-checked parents; `toggleSelect` flips by the computed state. `value`
holds leaves only (SHOW_CHILD — no redundancy). a11y emits `aria-checked`
(true / false / mixed) on tree items; dom/vue/react render a three-state
checkbox; themes add `.selkit__checkbox` (checked / mixed / unchecked). Disabled
descendants are skipped by cascade; `maxSelections` caps how many leaves cascade
adds. `treeCascade: false` keeps Phase 1 independent selection.
