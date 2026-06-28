# @selkit/vue

## 0.15.0

### Minor Changes

- 3500d97: Tree mode (Phase 1): `SelkitOption.children` switches the select into tree mode,
  where every node (parent or leaf) carries a value and is selectable, and parents
  expand/collapse via `controller.toggleExpanded(value)`. Selection is independent
  (no cascade yet — planned for a later phase); all nodes are expanded by default;
  tree mode does not virtualize. `SelkitViewRow` gains a `treeitem` variant and
  a11y emits `role=treeitem` + `aria-expanded`; dom/vue/react render a toggle and
  indent by depth; themes add `.selkit__toggle`. Distinct from `SelkitGroup`
  (non-selectable heading).

### Patch Changes

- Updated dependencies [3500d97]
  - @selkit/core@0.15.0

## 0.14.0

### Minor Changes

- 061c819: Nested groups: `SelkitGroup.options` now accepts a nested `SelkitGroup`, so
  groups can nest to any depth with per-level indentation. Only leaf options are
  selectable; a group's `disabled` propagates to all descendants; searching keeps
  the ancestor headings of matching leaves (branches with no match collapse).
  Each row carries a `--selkit-depth` CSS variable; themes indent by
  `--selkit-level-indent` (default `16px`). One-level usage stays fully backward
  compatible.

### Patch Changes

- Updated dependencies [061c819]
  - @selkit/core@0.14.0

## 0.13.0

### Minor Changes

- f9bed62: 下拉選項列間 gap：`optionGap`（預設 4）。dropdown 改 flex column + gap（CSS 變數 `--selkit-option-gap`）；虛擬捲動的 `computeVirtualRange`/`Window` + `scrollIntoView` 皆帶 gap（`stride = itemHeight + gap`），捲動不錯位。option padding 7→9px；`itemHeight` 預設 36→38 對齊新選項高度。

### Patch Changes

- Updated dependencies [f9bed62]
  - @selkit/core@0.13.0

## 0.12.0

### Minor Changes

- 0b75cdd: clear 二次確認：`clearConfirm` 點第一次進入待確認、再點才真正清空（2.5s 未點自動復原）；`clearConfirmText` 自訂確認按鈕文字（預設 "Confirm"，顯示與 aria-label 同步）。三框架 adapter 本地狀態；themes 新增 `.selkit__clear--confirm` 與 `--selkit-danger` 變數（base + bs5）。

### Patch Changes

- Updated dependencies [0b75cdd]
  - @selkit/core@0.12.0

## 0.11.0

### Minor Changes

- e81a599: 多選摺疊：`maxSelectedDisplay` 超過上限時顯示前 N 個 tag + 「+M」標記，點擊展開全部、再點收合。三框架一致（adapter 本地展開狀態）。themes 新增 `.selkit__more`；field gap 4→8px 讓多選 tag 不黏。

### Patch Changes

- Updated dependencies [e81a599]
  - @selkit/core@0.11.0

## 0.10.1

### Patch Changes

- 8814058: 開啟一個 select 時自動關閉其他：outside-click 改 capture 階段，繞過 control 的 stopPropagation。三框架各加多實例測試。
  - @selkit/core@0.10.1

## 0.10.0

### Minor Changes

- 92061c9: 搜尋命中高亮：option label 的命中片段以 `<mark class="selkit__match">` 標示，三框架一致。

  - core 新增純函式 `highlightMatches(label, query, fuzzy)` 與 controller `highlightLabel(label)`；比對與 filter 一致（去變音符 + 大小寫不敏感，fuzzy 標子序列）。預組／分解變音符皆標對位置。
  - dom / vue / react 預設渲染高亮；文字一律走框架內建 escape，標籤字元不會被當 HTML（防 XSS）。
  - 新增 `highlightMatches` config（預設 `true`），可關閉。
  - themes 新增 `.selkit__match` 樣式與 `--selkit-match-bg` 變數（base + bs5）。

### Patch Changes

- Updated dependencies [92061c9]
  - @selkit/core@0.10.0

## 0.9.0

### Minor Changes

- ca03b5e: SSR safety net — all packages server-side render without errors and hydrate cleanly (Next.js / Nuxt / VitePress).

  - `@selkit/react`: portal target now resolves in `useEffect` (was `useMemo` during render), so the server pass never touches `document`; ships a built-in `"use client"` directive for the Next.js App Router.
  - Added SSR smoke tests — React via `renderToStaticMarkup`, Vue via `renderToString` — both in a document-free `node` environment.
  - New docs page documents SSR status per package plus Next.js / Nuxt usage.

### Patch Changes

- Updated dependencies [ca03b5e]
  - @selkit/core@0.9.0

## 0.8.0

### Patch Changes

- @selkit/core@0.8.0

## 0.7.0

### Minor Changes

- 0b3d6d6: feat: resolveSelected — prefill selected labels when options aren't loaded

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

### Patch Changes

- Updated dependencies [0b3d6d6]
  - @selkit/core@0.7.0

## 0.6.0

### Minor Changes

- Async UX enhancements — request cancellation, result caching, and tag validation.

  - **AbortController**: `loadOptions` now receives a third argument `{ signal }`, aborted when a newer search supersedes it, the query drops below `minInputLength`, or on `destroy()`. Forward it to `fetch` to cancel in-flight requests. Self-aborts are silent (no `load:error`). Backward compatible — functions that ignore the argument keep working.
  - **Result cache**: opt-in `cache` memoizes the first page of `loadOptions` results by query, with optional `cacheTTL` (ms). First page only — `loadMore()` always hits the server; cleared by `setOptions()` / `destroy()`.
  - **`isValidToken`**: opt-in `(query) => boolean` gates tag creation; returning `false` silently hides the create row and blocks Enter / token separators.

  All three are wired through the `@selkit/dom`, `@selkit/vue` and `@selkit/react` adapters.

### Patch Changes

- Updated dependencies
  - @selkit/core@0.6.0

## 0.5.0

### Minor Changes

- Add `@selkit/floating`, an optional advanced dropdown positioner powered by `@floating-ui/dom` (offset / flip / shift / size collision handling), and wire it into all three adapters via a new opt-in `positioner` factory option/prop.

  - New package `@selkit/floating` exposes `createFloatingPositioner` (a `PositionerFactory` with an `autoUpdate` loop), plus the framework-agnostic `position()` and pure `applyPosition()` helpers.
  - `@selkit/dom`, `@selkit/vue` and `@selkit/react` accept a `positioner` factory; when provided, the adapter delegates all dropdown positioning to it. The built-in zero-dependency positioner stays the default, so the core and adapters remain dependency-free unless you install `@selkit/floating`.

### Patch Changes

- @selkit/core@0.5.0

## 0.4.0

### Minor Changes

- bede5ea: feat: virtual scrolling now supports grouped lists

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

### Patch Changes

- Updated dependencies [bede5ea]
  - @selkit/core@0.4.0

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

### Patch Changes

- Updated dependencies [db65d25]
  - @selkit/core@0.3.0

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

### Patch Changes

- Updated dependencies [7d39a2d]
  - @selkit/core@0.2.0

## 0.1.1

### Patch Changes

- Add a per-package README (install + quick start + docs link) so each package
  has proper documentation on its npm page.
- Updated dependencies
  - @selkit/core@0.1.1

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
