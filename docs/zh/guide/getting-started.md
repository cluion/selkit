# 快速開始

Selkit 是一套 headless 的 select / combobox 工具組。單一狀態機 —
`@selkit/core` — 驅動原生 DOM、Vue 與 React 的輕量 adapter，三者共用同一份設定與行為。

## 安裝

依你的框架安裝核心與對應的 adapter，再加上提供現成樣式的 themes 套件。

::: code-group

```sh [原生]
pnpm add @selkit/dom @selkit/themes
```

```sh [Vue]
pnpm add @selkit/vue @selkit/themes
```

```sh [React]
pnpm add @selkit/react @selkit/themes
```

:::

每個 adapter 都相依於 `@selkit/core`，因此會一併安裝。

## 樣式

Selkit 預設只有行為、沒有樣式。在應用程式進入點匯入一次主題，即可得到可用的預設外觀：

```js
import '@selkit/themes/base.css'
// 選用：Bootstrap 5 風格主題，scoped 在 .selkit-theme-bs5
import '@selkit/themes/bs5.css'
```

客製化請見[主題與 RTL](/zh/guide/theming)。

## 快速上手

::: code-group

```js [原生]
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

## 線上 demo

三個 adapter 的可執行 demo 放在 repo 的 `examples/` 底下：`examples/vanilla`、
`examples/vue` 與 `examples/react`。它們用 import map 搭配 build 好的 `dist`，
不需要打包工具 — 直接用瀏覽器開啟 HTML 檔即可。

## 下一步

- [核心概念](/zh/guide/concepts) — headless 架構如何組合在一起。
- [API 參考](/zh/api/config) — 每個設定、方法、事件與 state 欄位。
- [功能](/zh/features/searching) — 搜尋、非同步載入、虛擬捲動等。
