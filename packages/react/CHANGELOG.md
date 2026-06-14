# @selkit/react

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

### Patch Changes

- Updated dependencies
  - @selkit/core@0.1.0
