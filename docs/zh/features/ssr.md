# 伺服器渲染（SSR）

Selkit 全套件皆 SSR 安全——在 Next.js、Nuxt、VitePress 等 SSR 框架下都能正常渲染、
乾淨 hydrate，不會報錯。

| 套件 | SSR | 說明 |
| --- | :---: | --- |
| `@selkit/core` | ✅ | 純狀態機，零 DOM 存取。 |
| `@selkit/dom` | ✅ | 命令式 client API（`createSelkitDom`）。只在瀏覽器呼叫才有意義；單純 import 此套件不會碰到 DOM。 |
| `@selkit/vue` | ✅ | `setup()` 註冊監聽器，但所有 DOM 存取都在 `onMounted`／非 immediate 的 `watch` 內。以 `renderToString` 驗證。 |
| `@selkit/react` | ✅ | portal target 在 `useEffect` 解析，render 期不碰 DOM。內建 `"use client"` directive。以 `renderToStaticMarkup` 驗證。 |
| `@selkit/floating` | ✅ | `@floating-ui/dom` 的薄包裝，只在定位 callback 內碰 DOM。 |
| `@selkit/themes` | ✅ | 純 CSS。 |

## 為什麼安全

- **Core 不碰 DOM。** `@selkit/core` 是純 TypeScript 狀態機。選取、搜尋、虛擬捲動、
  a11y 屬性全在無 `document`／`window` 的環境計算，伺服器端跑起來完全一致。
- **Adapter 把 DOM 限於 client 生命週期。** Vue／React adapter 只在 `onMounted`／
  `useEffect` 與事件 handler 內碰 DOM——這些在 SSR 永遠不會執行。React 的 `dropdownParent`
  portal target 在 effect 內解析而非 render 期，所以 server pass 不會讀 `document`。

## React（Next.js）

`@selkit/react` 已內建 `"use client"` directive，在 Next.js App Router **無需額外設定**即可使用：

```tsx
// app/page.tsx — Server Component 可直接 import 並渲染
import { SelkitSelect } from '@selkit/react'

export default function Page() {
  return <SelkitSelect options={options} />
}
```

在 Pages Router 或非 Next 環境則不需要 directive，照常使用即可。

## Vue（Nuxt）

`@selkit/vue` 開箱即 SSR 安全：

```vue
<script setup lang="ts">
import { SelkitSelect } from '@selkit/vue'
</script>

<template>
  <SelkitSelect :options="options" />
</template>
```

## 原生 JS（`@selkit/dom`）

`@selkit/dom` 是命令式 API——你呼叫 `createSelkitDom(el, config)` 把它掛到真實元素上，
而元素只存在於瀏覽器。import 此套件無副作用；只要在 client 程式碼呼叫
（body 結尾的 `<script>`、或 `DOMContentLoaded`／框架 mount hook），不要在伺服器渲染期間呼叫。
