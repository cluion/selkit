# Virtual Scroll

For very long option lists, virtual scrolling renders only the rows in view plus
a small buffer, keeping the DOM light.

## Enabling

Virtual scroll is opt-in. Turn it on and provide a fixed row height that matches
your styling:

::: code-group

```js [Vanilla]
createSelkitDom('#big', {
  options: thousandsOfOptions,
  virtualScroll: true,
  itemHeight: 36, // px, must match rendered row height
})
```

```vue [Vue]
<SelkitSelect :options="thousandsOfOptions" virtual-scroll :item-height="36" />
```

```jsx [React]
<SelkitSelect options={thousandsOfOptions} virtualScroll itemHeight={36} />
```

:::

`itemHeight` defaults to `36`, which matches the base theme's option height. Set
it to whatever your theme renders.

## How it works

The shared, DOM-free core helper `computeVirtualRange` maps the scroll position,
viewport height and item height to the slice to render plus top/bottom spacer
heights:

```ts
import { computeVirtualRange } from '@selkit/core'

computeVirtualRange({
  scrollTop: 400,
  viewportHeight: 260,
  itemHeight: 36,
  itemCount: 1000,
  overscan: 4, // optional buffer rows, default 4
})
// → { startIndex, endIndex, paddingTop, paddingBottom }
```

Each adapter tracks the dropdown's `scrollTop`, calls this helper and renders the
returned slice between two spacer elements that preserve the scrollbar size. The
same math drives all three adapters, so behavior is identical everywhere.

## Limitations

Virtual scroll currently targets **flat option lists**. When groups are present,
the adapters fall back to full rendering, because uniform fixed-height rows are
required for the spacer math to be correct.
