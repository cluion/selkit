---
"@selkit/core": minor
"@selkit/dom": minor
"@selkit/vue": minor
"@selkit/react": minor
---

feat: resolveSelected — prefill selected labels when options aren't loaded

When `value` is set up front but its option isn't in `options` (or hasn't been
loaded by `loadOptions` yet), the matching label was unknown and the control
rendered blank. `resolveSelected` looks up the full options for the missing
values — sync or async — and fills in the selected labels.

- core: `resolveSelected(values) => SelkitOption[] | Promise<...>` config plus a
  new `state.resolving`. It runs once at init, only for values missing from
  `options`. Resolved options fill the selected labels and are **not** added to
  the option pool; a `String(value)` label is shown while resolving. On failure
  the fallback is kept and `load:error` fires. It never emits `change`, since the
  value itself is unchanged.
- dom / vue / react: expose `resolveSelected` (DOM config / Vue · React prop);
  the DOM adapter also toggles a `--resolving` class for optional styling.
