# @selkit/react

React adapter for [Selkit](https://github.com/cluion/selkit) — the
framework-agnostic select toolkit. A `<SelkitSelect>` component over
[`@selkit/core`](https://www.npmjs.com/package/@selkit/core): controlled value,
render props and SSR-friendly rendering.

## Install

```bash
pnpm add @selkit/react @selkit/themes
```

## Usage

```tsx
import { useState } from 'react'
import { SelkitSelect } from '@selkit/react'
import '@selkit/themes/base.css'

const fruits = [
  { value: 'a', label: 'Apple' },
  { value: 'b', label: 'Banana' },
]

export function Example() {
  const [value, setValue] = useState(null)
  return (
    <SelkitSelect
      options={fruits}
      value={value}
      onChange={setValue}
      placeholder="Pick a fruit…"
    />
  )
}
```

Customize options/selection with `renderOption` / `renderSelection`, or use the
`useSelkit` hook for full control. See the
[React guide](https://cluion.github.io/selkit/guide/react).

## Docs

📖 [cluion.github.io/selkit](https://cluion.github.io/selkit/) · [繁體中文](https://cluion.github.io/selkit/zh/)

## License

[MIT](https://github.com/cluion/selkit/blob/main/LICENSE)
