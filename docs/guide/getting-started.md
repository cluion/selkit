# Getting Started

Selkit is a headless select / combobox toolkit. A single state machine —
`@selkit/core` — drives thin adapters for vanilla DOM, Vue and React, all sharing
the same configuration and behavior.

## Installation

Install the core plus the adapter for your framework, and the themes package for
ready-made styling.

::: code-group

```sh [Vanilla]
pnpm add @selkit/dom @selkit/themes
```

```sh [Vue]
pnpm add @selkit/vue @selkit/themes
```

```sh [React]
pnpm add @selkit/react @selkit/themes
```

:::

Each adapter depends on `@selkit/core`, so it is installed automatically.

## Styling

Selkit ships unstyled behavior. Import a theme once in your app entry to get a
usable default look:

```js
import '@selkit/themes/base.css'
// optional: a Bootstrap 5 flavored theme, scoped to .selkit-theme-bs5
import '@selkit/themes/bs5.css'
```

See [Theming & RTL](/guide/theming) for customization.

## Quick start

::: code-group

```js [Vanilla]
import { createSelkitDom } from '@selkit/dom'
import '@selkit/themes/base.css'

const instance = createSelkitDom('#fruit', {
  options: [
    { value: 'apple', label: 'Apple' },
    { value: 'banana', label: 'Banana' },
    { value: 'cherry', label: 'Cherry' },
  ],
  placeholder: 'Pick a fruit…',
})

instance.controller.on('change', ({ value }) => console.log(value))
```

```vue [Vue]
<script setup>
import { ref } from 'vue'
import { SelkitSelect } from '@selkit/vue'
import '@selkit/themes/base.css'

const value = ref(null)
const options = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
]
</script>

<template>
  <SelkitSelect v-model="value" :options="options" placeholder="Pick a fruit…" />
</template>
```

```jsx [React]
import { useState } from 'react'
import { SelkitSelect } from '@selkit/react'
import '@selkit/themes/base.css'

const options = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
]

export function Example() {
  const [value, setValue] = useState(null)
  return (
    <SelkitSelect
      options={options}
      value={value}
      onChange={(v) => setValue(v)}
      placeholder="Pick a fruit…"
    />
  )
}
```

:::

## Live demos

Runnable demos for all three adapters live in the repository under `examples/`:
`examples/vanilla`, `examples/vue` and `examples/react`. They use an import map
plus the built `dist`, so no bundler is required — open the HTML file in a browser.

## Next steps

- [Core Concepts](/guide/concepts) — how the headless architecture fits together.
- [API Reference](/api/config) — every config option, method, event and state field.
- [Features](/features/searching) — searching, async loading, virtual scroll and more.
