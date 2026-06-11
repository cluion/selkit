# Vue

`@selkit/vue` provides a `<SelkitSelect>` component and a `useSelkit` composable.
Both bridge the same `@selkit/core` controller into Vue's reactivity with a
`shallowRef`, so the heavy lifting stays in the core.

## Component

```vue
<script setup>
import { ref } from 'vue'
import { SelkitSelect } from '@selkit/vue'
import '@selkit/themes/base.css'

const value = ref(null)
const options = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
]
</script>

<template>
  <SelkitSelect
    v-model="value"
    :options="options"
    placeholder="Pick a fruit…"
    @change="(e) => console.log(e.value)"
  />
</template>
```

`v-model` binds to the selection (a single value, or an array when `multiple`).
The `change` event carries `{ selected, value }`.

## Props

The component forwards config to the core. Commonly used props:

| Prop | Type | Notes |
| --- | --- | --- |
| `options` | `SelkitItem[]` | Flat options or groups. |
| `modelValue` | `SelkitValue` | Bound via `v-model`. |
| `multiple` | `boolean` | Multiple selection. |
| `placeholder` | `string` | |
| `searchable` | `boolean` | Defaults to `true`. |
| `fuzzy` | `boolean` | Fuzzy subsequence matching. |
| `minInputLength` | `number` | Gate filtering/loading. |
| `minResultsForSearch` | `number` | Hide the search box for short lists. |
| `hideSelected` | `boolean` | Remove chosen options from the list. |
| `loadOptions` | `(query, page) => Promise` | Async / paginated loading. |
| `taggable` / `createTag` | | Tagging. |
| `maxSelections` | `number` | |
| `virtualScroll` / `itemHeight` | | Virtual scrolling. |
| `clearable` | `boolean` | |
| `classPrefix` | `string` | |

See the full list in the [Config reference](/api/config).

## Option slot

Customize how each option renders with the `option` slot:

```vue
<template>
  <SelkitSelect :options="options">
    <template #option="{ option, active, selected }">
      <span :class="{ active, selected }">⭐ {{ option.label }}</span>
    </template>
  </SelkitSelect>
</template>
```

## Composable

For full control over markup, use `useSelkit` and render the state yourself:

```vue
<script setup>
import { useSelkit } from '@selkit/vue'

const { controller, state } = useSelkit({ options })
// state is a shallowRef of the core state
</script>
```

`state.value` is reactive and updates on every core transition. `controller` is
the same object documented in the [Controller reference](/api/controller).
