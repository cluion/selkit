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

## Grouped lists

Virtual scroll also works with `optgroup`-style groups. Because a group header is
a different height than an option, provide `groupHeight` as well:

::: code-group

```js [Vanilla]
createSelkitDom('#big', {
  options: groupedOptions,
  virtualScroll: true,
  itemHeight: 36,  // option row height
  groupHeight: 28, // group header height
})
```

```vue [Vue]
<SelkitSelect :options="groupedOptions" virtual-scroll :item-height="36" :group-height="28" />
```

```jsx [React]
<SelkitSelect options={groupedOptions} virtualScroll itemHeight={36} groupHeight={28} />
```

:::

`groupHeight` defaults to `28` (the base theme's header height). Like `itemHeight`,
set it to whatever your theme renders so the spacer math stays accurate.

Group headers are **not** sticky — scrolling into the middle of a group scrolls its
header off with the rest. Extreme (100k+) lists are best kept flat; grouped virtual
targets up to a few thousand rows.

## How it works

For flat lists the DOM-free core helper `computeVirtualRange` maps the scroll
position, viewport height and a single item height to the slice to render plus
top/bottom spacer heights (`O(1)`):

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

For grouped lists, where rows differ in height, `computeVirtualWindow` takes a
per-row `heights` array (header rows use `groupHeight`, others `itemHeight`) and
returns the same shape using cumulative offsets:

```ts
import { computeVirtualWindow } from '@selkit/core'

computeVirtualWindow({
  heights: [28, 36, 36, 28, 36], // group, opt, opt, group, opt
  scrollTop: 100,
  viewportHeight: 260,
  overscan: 4,
})
// → { startIndex, endIndex, paddingTop, paddingBottom }
```

Each adapter tracks the dropdown's `scrollTop`, calls the right helper and renders
the returned slice (group headers included) between two spacer elements that
preserve the scrollbar size. The same math drives all three adapters, so behavior
is identical everywhere.
