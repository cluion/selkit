# Vue

`@selkit/vue` 提供 `<SelkitSelect>` 元件與 `useSelkit` composable。兩者都以
`shallowRef` 把同一顆 `@selkit/core` controller 橋接進 Vue 的響應式系統，繁重工作
仍留在核心。

## 元件

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

`v-model` 綁定選取結果（單選為單值，`multiple` 時為陣列）。`change` 事件帶有
`{ selected, value }`。

## Props

元件會把設定轉交給核心。常用 props：

| Prop | 型別 | 備註 |
| --- | --- | --- |
| `options` | `SelkitItem[]` | 扁平選項或分組。 |
| `modelValue` | `SelkitValue` | 透過 `v-model` 綁定。 |
| `multiple` | `boolean` | 多選。 |
| `placeholder` | `string` | |
| `searchable` | `boolean` | 預設 `true`。 |
| `fuzzy` | `boolean` | fuzzy 子序列比對。 |
| `minInputLength` | `number` | 達字數才過濾/載入。 |
| `minResultsForSearch` | `number` | 清單太短時隱藏搜尋框。 |
| `hideSelected` | `boolean` | 把已選項從清單移除。 |
| `loadOptions` | `(query, page) => Promise` | 非同步 / 分頁載入。 |
| `taggable` / `createTag` | | tagging。 |
| `maxSelections` | `number` | |
| `virtualScroll` / `itemHeight` | | 虛擬捲動。 |
| `clearable` | `boolean` | |
| `classPrefix` | `string` | |

完整清單見 [Config 參考](/zh/api/config)。

## option slot

用 `option` slot 自訂每個選項的渲染：

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

若要完全掌控 markup，使用 `useSelkit` 並自行渲染 state：

```vue
<script setup>
import { useSelkit } from '@selkit/vue'

const { controller, state } = useSelkit({ options })
// state 是核心 state 的 shallowRef
</script>
```

`state.value` 是響應式的，會在每次核心轉換時更新。`controller` 即
[Controller 參考](/zh/api/controller)所載的同一個物件。
