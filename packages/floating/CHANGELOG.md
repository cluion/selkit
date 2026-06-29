# @selkit/floating

## 0.17.0

### Minor Changes

- eec4299: Tree search: in tree mode, searching filters the tree and auto-expands the
  ancestor chain of any matching node (branches with no match collapse away);
  clearing the query restores the original expand state. core `#treeVisible` takes
  a query; no adapter changes needed (visibleOptions already drives rendering).

## 0.16.0

### Minor Changes

- a615df4: Tree cascade (Phase 2): `treeCascade` config (default true, multiple-only) makes
  selecting a parent check all descendant leaves and show a mixed (▣) state on
  partially-checked parents; `toggleSelect` flips by the computed state. `value`
  holds leaves only (SHOW_CHILD — no redundancy). a11y emits `aria-checked`
  (true / false / mixed) on tree items; dom/vue/react render a three-state
  checkbox; themes add `.selkit__checkbox` (checked / mixed / unchecked). Disabled
  descendants are skipped by cascade; `maxSelections` caps how many leaves cascade
  adds. `treeCascade: false` keeps Phase 1 independent selection.

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

## 0.14.0

### Minor Changes

- 061c819: Nested groups: `SelkitGroup.options` now accepts a nested `SelkitGroup`, so
  groups can nest to any depth with per-level indentation. Only leaf options are
  selectable; a group's `disabled` propagates to all descendants; searching keeps
  the ancestor headings of matching leaves (branches with no match collapse).
  Each row carries a `--selkit-depth` CSS variable; themes indent by
  `--selkit-level-indent` (default `16px`). One-level usage stays fully backward
  compatible.

## 0.13.0

## 0.12.0

## 0.11.0

## 0.10.1

## 0.10.0

## 0.9.0

### Minor Changes

- ca03b5e: SSR safety net — all packages server-side render without errors and hydrate cleanly (Next.js / Nuxt / VitePress).

  - `@selkit/react`: portal target now resolves in `useEffect` (was `useMemo` during render), so the server pass never touches `document`; ships a built-in `"use client"` directive for the Next.js App Router.
  - Added SSR smoke tests — React via `renderToStaticMarkup`, Vue via `renderToString` — both in a document-free `node` environment.
  - New docs page documents SSR status per package plus Next.js / Nuxt usage.

## 0.8.0

## 0.7.0

## 0.6.0

## 0.5.0

### Minor Changes

- Add `@selkit/floating`, an optional advanced dropdown positioner powered by `@floating-ui/dom` (offset / flip / shift / size collision handling), and wire it into all three adapters via a new opt-in `positioner` factory option/prop.

  - New package `@selkit/floating` exposes `createFloatingPositioner` (a `PositionerFactory` with an `autoUpdate` loop), plus the framework-agnostic `position()` and pure `applyPosition()` helpers.
  - `@selkit/dom`, `@selkit/vue` and `@selkit/react` accept a `positioner` factory; when provided, the adapter delegates all dropdown positioning to it. The built-in zero-dependency positioner stays the default, so the core and adapters remain dependency-free unless you install `@selkit/floating`.
