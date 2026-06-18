# @selkit/floating

Optional advanced dropdown positioner for [Selkit](https://github.com/cluion/selkit) —
the framework-agnostic select toolkit. Upgrades the built-in zero-dependency
positioner with collision handling (`flip` / `shift` / `size`) powered by
[`@floating-ui/dom`](https://floating-ui.com/).

`@selkit/dom` ships a lightweight, zero-dependency positioner by default
(vertical flip only). Install this package when you need horizontal
collision avoidance, viewport-aware max-height, or robust positioning inside
`transform` / fixed-header containers — without giving up Selkit's zero-runtime-dependency core.

## Install

```bash
pnpm add @selkit/dom @selkit/floating @selkit/themes
```

## Usage

Pass `createFloatingPositioner` as the `positioner` factory:

```js
import { createSelkitDom } from '@selkit/dom'
import { createFloatingPositioner } from '@selkit/floating'
import '@selkit/themes/base.css'

createSelkitDom(document.getElementById('host'), {
  options: [
    { value: 'a', label: 'Apple' },
    { value: 'b', label: 'Banana' },
  ],
  positioner: createFloatingPositioner,
})
```

Customize placement / padding by wrapping it in a closure:

```js
createSelkitDom(host, {
  positioner: (trigger, dropdown, opts) =>
    createFloatingPositioner(trigger, dropdown, {
      ...opts,
      placement: 'top-start',
      padding: 12,
    }),
})
```

## API

- `createFloatingPositioner(reference, floating, opts?)` — a
  [`PositionerFactory`](https://www.npmjs.com/package/@selkit/dom)-compatible
  factory with an `autoUpdate` loop. Drop-in for `@selkit/dom`'s `positioner` option.
- `position(reference, floating, opts?)` — framework-agnostic positioning
  computation returning `{ x, y, placement, availableWidth, availableHeight }`.
  No style mutation; usable by any adapter.
- `applyPosition(floating, referenceWidth, result, opts?)` — pure helper that
  applies a `FloatingResult` to an element (`position: fixed`, width, `data-placement`).

`FloatingOptions`: `{ autoWidth?, gap?, placement?, padding? }`.

## Docs

📖 [cluion.github.io/selkit](https://cluion.github.io/selkit/) · [繁體中文](https://cluion.github.io/selkit/zh/)

## License

[MIT](https://github.com/cluion/selkit/blob/main/LICENSE)
