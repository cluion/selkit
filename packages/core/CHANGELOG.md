# @selkit/core

## 0.3.0

### Minor Changes

- db65d25: feat: keep the active option scrolled into view

  Moving the highlight with the keyboard (Arrow / Home / End) or opening the dropdown
  now scrolls the active option into view automatically (`block: 'nearest'` — minimal
  movement, only when off-screen). This keeps the `aria-activedescendant` target visible
  as the combobox pattern requires. It triggers only when the active index changes, so
  it never fights a manual scroll.

  Under virtual scrolling the target row may not be rendered yet, so the scroll offset is
  computed from the fixed `itemHeight` and the list re-renders at the new position.

  - core: new `computeScrollIntoView` helper (sibling of `computeVirtualRange`)
  - dom / vue / react: wire it into keyboard navigation and open

## 0.2.0

### Minor Changes

- 7d39a2d: feat: swappable components for structural chrome

  Replace the inner content of the dropdown arrow, clear button, tag remove button,
  group heading and the empty/loading row, while keeping each part's wrapper, classes
  and behavior (click handling, event delegation) intact.

  - DOM: `templateArrow`, `templateClear`, `templateTagRemove`, `templateGroup`, `templateEmpty`
  - Vue: `arrow`, `clear`, `tag-remove`, `group`, `empty` slots
  - React: `renderArrow`, `renderClear`, `renderTagRemove`, `renderGroup`, `renderEmpty` props

  Adds `controller.getEmptyReason()` (`'loading' | 'min-input' | 'no-results'`) so the
  `empty` hook can branch on state (e.g. show a spinner only while loading).

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
