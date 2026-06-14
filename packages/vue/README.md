# @selkit/vue

Vue 3 adapter for [Selkit](https://github.com/cluion/selkit) — the
framework-agnostic select toolkit. A `<SelkitSelect>` component over
[`@selkit/core`](https://www.npmjs.com/package/@selkit/core) with `v-model`,
scoped slots and SSR-friendly rendering.

## Install

```bash
pnpm add @selkit/vue @selkit/themes
```

## Usage

```vue
<script setup>
import { ref } from 'vue'
import { SelkitSelect } from '@selkit/vue'
import '@selkit/themes/base.css'

const fruits = [
  { value: 'a', label: 'Apple' },
  { value: 'b', label: 'Banana' },
]
const value = ref(null)
</script>

<template>
  <SelkitSelect v-model="value" :options="fruits" placeholder="Pick a fruit…" />
</template>
```

Customize options/selection with the `option` / `selection` slots, or drop to the
`useSelkit` composable for full control. See the
[Vue guide](https://cluion.github.io/selkit/guide/vue).

## Docs

📖 [cluion.github.io/selkit](https://cluion.github.io/selkit/) · [繁體中文](https://cluion.github.io/selkit/zh/)

## License

[MIT](https://github.com/cluion/selkit/blob/main/LICENSE)
