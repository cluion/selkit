# @selkit/core

The framework-agnostic state machine behind [Selkit](https://github.com/cluion/selkit) —
a headless select toolkit. Zero DOM, zero framework dependencies: it takes state
in, emits state and events out. Use it directly to build your own renderer, or
use an adapter ([`@selkit/dom`](https://www.npmjs.com/package/@selkit/dom),
[`@selkit/vue`](https://www.npmjs.com/package/@selkit/vue),
[`@selkit/react`](https://www.npmjs.com/package/@selkit/react)).

## Install

```bash
pnpm add @selkit/core
```

## Usage

```ts
import { createSelkit } from '@selkit/core'

const select = createSelkit({
  options: [
    { value: 'a', label: 'Apple' },
    { value: 'b', label: 'Banana' },
  ],
  multiple: true,
})

select.subscribe((state) => {
  // render from state.visibleOptions / state.selected / state.isOpen …
})

select.open()
select.setQuery('ap')
select.selectActive()
```

The controller exposes state, search, highlight/keyboard, selection, tagging,
async loading, a11y attribute computation and `aria-live` announcements — see the
[API reference](https://cluion.github.io/selkit/api/controller).

## Docs

📖 [cluion.github.io/selkit](https://cluion.github.io/selkit/) · [繁體中文](https://cluion.github.io/selkit/zh/)

## License

[MIT](https://github.com/cluion/selkit/blob/main/LICENSE)
