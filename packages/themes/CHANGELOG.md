# @selkit/themes

## 0.11.0

### Minor Changes

- e81a599: 多選摺疊：`maxSelectedDisplay` 超過上限時顯示前 N 個 tag + 「+M」標記，點擊展開全部、再點收合。三框架一致（adapter 本地展開狀態）。themes 新增 `.selkit__more`；field gap 4→8px 讓多選 tag 不黏。

## 0.10.1

## 0.10.0

### Minor Changes

- 92061c9: 搜尋命中高亮：option label 的命中片段以 `<mark class="selkit__match">` 標示，三框架一致。

  - core 新增純函式 `highlightMatches(label, query, fuzzy)` 與 controller `highlightLabel(label)`；比對與 filter 一致（去變音符 + 大小寫不敏感，fuzzy 標子序列）。預組／分解變音符皆標對位置。
  - dom / vue / react 預設渲染高亮；文字一律走框架內建 escape，標籤字元不會被當 HTML（防 XSS）。
  - 新增 `highlightMatches` config（預設 `true`），可關閉。
  - themes 新增 `.selkit__match` 樣式與 `--selkit-match-bg` 變數（base + bs5）。

## 0.9.0

### Minor Changes

- ca03b5e: SSR safety net — all packages server-side render without errors and hydrate cleanly (Next.js / Nuxt / VitePress).

  - `@selkit/react`: portal target now resolves in `useEffect` (was `useMemo` during render), so the server pass never touches `document`; ships a built-in `"use client"` directive for the Next.js App Router.
  - Added SSR smoke tests — React via `renderToStaticMarkup`, Vue via `renderToString` — both in a document-free `node` environment.
  - New docs page documents SSR status per package plus Next.js / Nuxt usage.

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
