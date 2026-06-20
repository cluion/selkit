# @selkit/themes

## 0.8.0

### Minor Changes

- 671f648: feat: dropdown open/close transition

  Pure-CSS fade + slide on dropdown open and close (`@starting-style` + `display: allow-discrete`; no JS timing, no race):

  - opacity + translateY(-4px), 0.15s ease (matches the existing arrow rotation)
  - symmetric open/close
  - `prefers-reduced-motion` disables the transition (a11y)
  - graceful degradation on older browsers (instant show, no breakage)
  - one rule shared by all three adapters (themes only); core / dom / vue / react untouched

## 0.7.0

## 0.6.0

## 0.5.0

## 0.4.0

## 0.3.0

## 0.2.0

## 0.1.1

### Patch Changes

- Add a per-package README (install + quick start + docs link) so each package
  has proper documentation on its npm page.

## 0.1.0

### Minor Changes

- Initial public release of Selkit — the framework-agnostic select toolkit.

  A headless `@selkit/core` state machine with vanilla DOM, Vue 3 and React
  adapters and a CSS-variable theme (base + bs5). Highlights:

  - Single / multiple select, search filtering, fuzzy matching, custom `filter`
    and `sorter`, `minInputLength`, `minResultsForSearch`.
  - Async loading (`loadOptions`) with debounce, pagination and infinite scroll.
  - Tagging with a visible "create" row, `tokenSeparators`, `restoreOnBackspace`.
  - optgroup, `hideSelected`, `maxSelections`, draggable tag reordering,
    checkbox options, virtual scrolling.
  - Dropdown portal (`dropdownParent`), `dropdownAutoWidth`, input `autogrow`.
  - Custom templates (option / selection) per adapter, i18n `messages`.
  - Full keyboard navigation, ARIA combobox attributes and `aria-live`
    announcements; checked against axe-core.
