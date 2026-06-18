# 定位

Selkit 預設內建一個輕量、**零依賴**的下拉定位器。當你需要防遮擋處理，或要在棘手的
容器中穩定定位時，可選裝
[`@selkit/floating`](https://www.npmjs.com/package/@selkit/floating)——而且不必
犧牲零依賴的核心。

## 預設定位器

開箱即用，下拉由內建的輕量定位器定位：

- 對齊控制項左緣、與其同寬
- 下方空間不足時翻到控制項上方
- 隨捲動與 resize 更新

設定 `dropdownParent` 可把下拉傳送到指定容器，藉此逃離會裁切的 `overflow` /
`transform` 祖先（常用 `document.body`）：

::: code-group

```js [原生 JS]
createSelkitDom('#el', { options, dropdownParent: document.body })
```

```vue [Vue]
<SelkitSelect :options="options" :dropdown-parent="document.body" />
```

```jsx [React]
<SelkitSelect options={options} dropdownParent={document.body} />
```

:::

預設定位器只做垂直翻轉，**不會**水平位移以避開視窗邊緣，在 `transform` 或固定表頭
容器中也可能跑位。這些情況請改用 `@selkit/floating`。

## 用 @selkit/floating 進階定位

`@selkit/floating` 薄包 [`@floating-ui/dom`](https://floating-ui.com/)，補上
`flip`（垂直翻轉）、`shift`（水平防遮擋）與 `size`（依視窗的 `max-height`）。
與你的 adapter 一起安裝：

```bash
pnpm add @selkit/floating
```

把 `createFloatingPositioner` 當作 `positioner` 工廠傳入。同一個工廠在三個 adapter
皆可用：

::: code-group

```js [原生 JS]
import { createSelkitDom } from '@selkit/dom'
import { createFloatingPositioner } from '@selkit/floating'

createSelkitDom('#el', {
  options,
  positioner: createFloatingPositioner,
})
```

```vue [Vue]
<script setup>
import { createFloatingPositioner } from '@selkit/floating'
</script>

<template>
  <SelkitSelect :options="options" :positioner="createFloatingPositioner" />
</template>
```

```jsx [React]
import { createFloatingPositioner } from '@selkit/floating'

<SelkitSelect options={options} positioner={createFloatingPositioner} />
```

:::

提供 `positioner` 後，adapter 會把下拉定位**完全**交給它，並停止套用自己的位置
樣式。若同時需要逃離 `overflow: hidden` 祖先，請搭配 `dropdownParent`。

## 自訂 placement 與 padding

`createFloatingPositioner(reference, floating, opts)` 接受 `placement`、
`padding`、`gap` 與 `autoWidth`。`autoWidth` 由 adapter 提供；其餘以閉包包裝設定：

::: code-group

```js [原生 JS]
createSelkitDom('#el', {
  options,
  positioner: (trigger, dropdown, opts) =>
    createFloatingPositioner(trigger, dropdown, {
      ...opts,
      placement: 'top-start',
      padding: 12,
    }),
})
```

```jsx [React]
<SelkitSelect
  options={options}
  positioner={(trigger, dropdown, opts) =>
    createFloatingPositioner(trigger, dropdown, {
      ...opts,
      placement: 'top-start',
      padding: 12,
    })
  }
/>
```

:::

## 低階 API

若要自訂 renderer，`@selkit/floating` 也匯出內部使用的框架無關零件：

```ts
import { position, applyPosition } from '@selkit/floating'

// 計算位置 不觸碰 DOM
const result = await position(referenceEl, floatingEl, { placement: 'bottom-start' })
// → { x, y, placement, availableWidth, availableHeight }

// 把結果套到元素（position: fixed、寬度、data-placement）
applyPosition(floatingEl, referenceEl.getBoundingClientRect().width, result, {
  autoWidth: false,
})
```

`@selkit/floating` 是 Selkit 唯一帶執行期依賴的部分。不安裝它，`@selkit/core`
與各 adapter 就維持零依賴。
