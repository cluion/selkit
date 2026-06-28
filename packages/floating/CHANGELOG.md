# @selkit/floating

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
