# 虛擬捲動

對於非常長的選項清單，虛擬捲動只渲染視野內的列加上少量緩衝，讓 DOM 保持輕量。

## 啟用

虛擬捲動是 opt-in。開啟它並提供與你樣式相符的固定列高：

::: code-group

```js [原生]
createSelkitDom('#big', {
  options: thousandsOfOptions,
  virtualScroll: true,
  itemHeight: 38, // px，須與實際渲染列高一致
})
```

```vue [Vue]
<SelkitSelect :options="thousandsOfOptions" virtual-scroll :item-height="38" />
```

```jsx [React]
<SelkitSelect options={thousandsOfOptions} virtualScroll itemHeight={38} />
```

:::

`itemHeight` 預設 `38`，對齊 base theme 的選項高度。請依你的主題實際渲染高度設定。

## 分組清單

虛擬捲動也支援 `optgroup` 式的分組。由於 group header 高度與 option 不同，需另外提供
`groupHeight`：

::: code-group

```js [原生]
createSelkitDom('#big', {
  options: groupedOptions,
  virtualScroll: true,
  itemHeight: 38,  // option 列高
  groupHeight: 28, // group 標題列高
})
```

```vue [Vue]
<SelkitSelect :options="groupedOptions" virtual-scroll :item-height="38" :group-height="28" />
```

```jsx [React]
<SelkitSelect options={groupedOptions} virtualScroll itemHeight={38} groupHeight={28} />
```

:::

`groupHeight` 預設 `28`（base theme 的標題高度）。與 `itemHeight` 一樣，請依你的主題實際
渲染高度設定，佔位計算才會準確。

group header **不會** sticky —— 捲進某組中段時，該組標題會跟著捲出。極端（10 萬+）清單
建議維持扁平；分組虛擬鎖定數千列以內。

## 運作方式

扁平清單用不碰 DOM 的核心輔助函式 `computeVirtualRange`，把捲動位置、視窗高度與單一列高
對應成該渲染的切片與上下佔位（`O(1)`）：

```ts
import { computeVirtualRange } from '@selkit/core'

computeVirtualRange({
  scrollTop: 400,
  viewportHeight: 260,
  itemHeight: 38,
  itemCount: 1000,
  overscan: 4, // 選用的緩衝列數，預設 4
})
// → { startIndex, endIndex, paddingTop, paddingBottom }
```

分組清單因列高不一，改用 `computeVirtualWindow`，吃每列高度陣列（標題列用 `groupHeight`，
其餘用 `itemHeight`），以累積偏移回傳相同形狀：

```ts
import { computeVirtualWindow } from '@selkit/core'

computeVirtualWindow({
  heights: [28, 38, 38, 28, 38], // group, opt, opt, group, opt
  scrollTop: 100,
  viewportHeight: 260,
  overscan: 4,
})
// → { startIndex, endIndex, paddingTop, paddingBottom }
```

每個 adapter 追蹤下拉浮層的 `scrollTop`，呼叫對應的輔助函式，並把回傳的切片（含 group
header）渲染在兩個保留捲軸尺寸的佔位元素之間。同一套計算驅動三個 adapter，行為一致。
