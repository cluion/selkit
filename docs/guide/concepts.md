# Core Concepts

## Headless core, thin adapters

Selkit splits cleanly into two layers:

- **`@selkit/core`** — a pure TypeScript state machine. It owns all behavior:
  opening and closing, search filtering, single/multiple selection, highlight
  movement, keyboard-friendly navigation, accessibility attributes, async
  loading, tagging and reordering. It touches no DOM and imports no framework.
- **Adapters** — `@selkit/dom`, `@selkit/vue` and `@selkit/react`. Each one
  subscribes to the core's state and renders it. They contain no behavior, only
  rendering and event wiring that forwards to the controller.

Because behavior lives in one place, every adapter behaves identically and gains
new features at the same time.

## The controller

`createSelkit(config)` returns a **controller**: the single object you interact
with. It exposes:

- `getState()` — a readonly snapshot of the current [state](/api/events#state).
- `subscribe(listener)` — be notified on every state change. Adapters use this
  to re-render.
- `on(event, handler)` — listen to semantic [events](/api/events#events) such as
  `change`, `search` or `load:end`.
- Methods that drive behavior: `open`, `close`, `setQuery`, `select`, `deselect`,
  `clear`, `moveSelected`, `loadMore`, and more. See the
  [Controller reference](/api/controller).

```js
import { createSelkit } from '@selkit/core'

const controller = createSelkit({
  options: [
    { value: 'a', label: 'Apple' },
    { value: 'b', label: 'Banana' },
  ],
})

controller.subscribe((state) => {
  // render state.visibleOptions, state.selected, ...
})

controller.open()
controller.setQuery('ap')
controller.select('a')
```

## Immutable state

State is never mutated in place. Each transition produces a new state object and
notifies subscribers. This makes change detection trivial in Vue (`shallowRef`)
and React (`useSyncExternalStore`), and keeps debugging predictable.

## Options and groups

Options are plain objects. A group wraps options under a label:

```ts
type SelkitOption = {
  value: string | number
  label: string
  disabled?: boolean
  data?: unknown // carry your own typed payload
}

type SelkitGroup = {
  label: string
  disabled?: boolean // cascades to the group's options
  options: SelkitOption[]
}
```

The core normalizes flat options and groups into an ordered list of rows plus a
flat list, so adapters can render grouped headers while indices stay aligned with
`visibleOptions`. See [`getGroupedView()`](/api/controller#getgroupedview).

## Derived views

The controller exposes derived helpers so adapters stay dumb:

- [`a11y()`](/api/controller#a11y) — ARIA attributes for the trigger, listbox and
  each option.
- [`getGroupedView()`](/api/controller#getgroupedview) — the row sequence to
  render, with group headers interleaved.
- [`isSearchable()`](/api/controller#issearchable) — whether the search input
  should be shown, combining `searchable` with `minResultsForSearch`.

## Positioning

The dropdown is positioned by a lightweight, zero-dependency positioner that
ships inside `@selkit/dom`. This preserves the "no runtime dependencies" promise;
there is no hard dependency on a positioning library.

## Keeping the active option visible

As you move the highlight with the keyboard (Arrow / Home / End) or open the
dropdown, the active option is scrolled into view automatically (`block: 'nearest'`
— minimal movement, only when off-screen). This keeps the `aria-activedescendant`
target visible, which the combobox pattern requires. It triggers only when the
active index changes, so it never fights a manual scroll. Under virtual scrolling
the target row may not be rendered yet, so the offset is computed from the fixed
`itemHeight` via the core helper `computeScrollIntoView` (sibling of
[`computeVirtualRange`](/features/virtual-scroll)) and the list re-renders at the
new position.
