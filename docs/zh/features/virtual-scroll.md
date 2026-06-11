# 虛擬捲動

對於非常長的選項清單，虛擬捲動只渲染視野內的列加上少量緩衝，讓 DOM 保持輕量。

## 啟用

虛擬捲動是 opt-in。開啟它並提供與你樣式相符的固定列高：

::: code-group

```js [原生]
createSelkitDom('#big', {
  options: thousandsOfOptions,
  virtualScroll: true,
  itemHeight: 36, // px，須與實際渲染列高一致
})
```

```vue [Vue]
<SelkitSelect :options="thousandsOfOptions" virtual-scroll :item-height="36" />
```

```jsx [React]
<SelkitSelect options={thousandsOfOptions} virtualScroll itemHeight={36} />
```

:::

`itemHeight` 預設 `36`，對齊 base theme 的選項高度。請依你的主題實際渲染高度設定。

## 運作方式

共用、不碰 DOM 的核心輔助函式 `computeVirtualRange` 會把捲動位置、視窗高度與列高，
對應成該渲染的切片以及上下佔位高度：

```ts
import { computeVirtualRange } from '@selkit/core'

computeVirtualRange({
  scrollTop: 400,
  viewportHeight: 260,
  itemHeight: 36,
  itemCount: 1000,
  overscan: 4, // 選用的緩衝列數，預設 4
})
// → { startIndex, endIndex, paddingTop, paddingBottom }
```

每個 adapter 追蹤下拉浮層的 `scrollTop`，呼叫此輔助函式，並把回傳的切片渲染在兩個保留
捲軸尺寸的佔位元素之間。同一套計算驅動三個 adapter，因此各處行為一致。

## 限制

虛擬捲動目前針對**扁平選項清單**。當存在分組時，adapter 會退回完整渲染，因為佔位計算
需要一致的固定列高。
