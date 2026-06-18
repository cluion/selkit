# Positioning

Selkit ships a lightweight, **zero-dependency** dropdown positioner by default.
When you need collision handling or robust placement inside tricky containers,
opt into [`@selkit/floating`](https://www.npmjs.com/package/@selkit/floating) —
without giving up the zero-dependency core.

## Default positioner

Out of the box the dropdown is positioned with a small built-in positioner:

- Aligns to the control's left edge and matches its width
- Flips above the control when there isn't enough room below
- Tracks scroll and resize

Set `dropdownParent` to teleport the dropdown out of clipping `overflow` /
`transform` ancestors (commonly `document.body`):

::: code-group

```js [Vanilla]
createSelkitDom('#el', { options, dropdownParent: document.body })
```

```vue [Vue]
<SelkitSelect :options="options" :dropdown-parent="document.body" />
```

```jsx [React]
<SelkitSelect options={options} dropdownParent={document.body} />
```

:::

The default positioner only flips vertically. It does **not** shift horizontally
to avoid the viewport edge, and it can drift inside `transform` or fixed-header
containers. For those cases, use `@selkit/floating`.

## Advanced positioning with @selkit/floating

`@selkit/floating` wraps [`@floating-ui/dom`](https://floating-ui.com/) to add
`flip` (vertical), `shift` (horizontal collision avoidance) and `size`
(viewport-aware `max-height`). Install it alongside your adapter:

```bash
pnpm add @selkit/floating
```

Pass `createFloatingPositioner` as the `positioner` factory. The same factory
works across all three adapters:

::: code-group

```js [Vanilla]
import { createSelkitDom } from '@selkit/dom'
import { createFloatingPositioner } from '@selkit/floating'

createSelkitDom('#el', {
  options,
  positioner: createFloatingPositioner,
})
```

```vue [Vue]
<script setup>
import { createFloatingPositioner } from '@selkit/floating'
</script>

<template>
  <SelkitSelect :options="options" :positioner="createFloatingPositioner" />
</template>
```

```jsx [React]
import { createFloatingPositioner } from '@selkit/floating'

<SelkitSelect options={options} positioner={createFloatingPositioner} />
```

:::

When a `positioner` is provided, the adapter delegates **all** dropdown
positioning to it and stops applying its own position styles. Pair it with
`dropdownParent` when you also need to escape an `overflow: hidden` ancestor.

## Customizing placement and padding

`createFloatingPositioner(reference, floating, opts)` accepts `placement`,
`padding`, `gap` and `autoWidth`. The adapter supplies `autoWidth`; wrap the
factory in a closure to set the rest:

::: code-group

```js [Vanilla]
createSelkitDom('#el', {
  options,
  positioner: (trigger, dropdown, opts) =>
    createFloatingPositioner(trigger, dropdown, {
      ...opts,
      placement: 'top-start',
      padding: 12,
    }),
})
```

```jsx [React]
<SelkitSelect
  options={options}
  positioner={(trigger, dropdown, opts) =>
    createFloatingPositioner(trigger, dropdown, {
      ...opts,
      placement: 'top-start',
      padding: 12,
    })
  }
/>
```

:::

## Low-level API

For custom renderers, `@selkit/floating` also exposes the framework-agnostic
pieces used internally:

```ts
import { position, applyPosition } from '@selkit/floating'

// Compute placement without mutating the DOM
const result = await position(referenceEl, floatingEl, { placement: 'bottom-start' })
// → { x, y, placement, availableWidth, availableHeight }

// Apply a result to an element (position: fixed, width, data-placement)
applyPosition(floatingEl, referenceEl.getBoundingClientRect().width, result, {
  autoWidth: false,
})
```

`@selkit/floating` is the only part of Selkit with a runtime dependency. If you
don't install it, `@selkit/core` and the adapters stay dependency-free.
