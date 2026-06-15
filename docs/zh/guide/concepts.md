# 核心概念

## Headless 核心，輕量 adapter

Selkit 清楚地分成兩層：

- **`@selkit/core`** — 純 TypeScript 狀態機。它掌管所有行為：開關、搜尋過濾、
  單選/多選、highlight 移動、對鍵盤友善的導航、無障礙屬性、非同步載入、tagging
  與重新排序。它不碰 DOM，也不匯入任何框架。
- **Adapter** — `@selkit/dom`、`@selkit/vue` 與 `@selkit/react`。每一個都訂閱核心的
  state 並渲染它。它們不含任何行為，只有渲染與把事件轉呼叫到 controller 的接線。

因為行為集中在同一處，每個 adapter 的表現都一致，也會同時獲得新功能。

## Controller

`createSelkit(config)` 回傳一個 **controller**：你互動的唯一物件。它提供：

- `getState()` — 目前 [state](/zh/api/events#state) 的唯讀快照。
- `subscribe(listener)` — 每次 state 變更都會收到通知，adapter 以此重新渲染。
- `on(event, handler)` — 監聽語意化[事件](/zh/api/events#events)，如 `change`、
  `search` 或 `load:end`。
- 驅動行為的方法：`open`、`close`、`setQuery`、`select`、`deselect`、`clear`、
  `moveSelected`、`loadMore` 等，請見 [Controller 參考](/zh/api/controller)。

```js
import { createSelkit } from '@selkit/core'

const controller = createSelkit({
  options: [
    { value: 'a', label: 'Apple' },
    { value: 'b', label: 'Banana' },
  ],
})

controller.subscribe((state) => {
  // 渲染 state.visibleOptions、state.selected …
})

controller.open()
controller.setQuery('ap')
controller.select('a')
```

## 不可變 state

State 永不就地修改。每次轉換都產生一個新的 state 物件並通知訂閱者。這讓 Vue
（`shallowRef`）與 React（`useSyncExternalStore`）的變更偵測變得簡單，也讓除錯更可預測。

## 選項與分組

選項是純物件。分組以一個標籤包住一組選項：

```ts
type SelkitOption = {
  value: string | number
  label: string
  disabled?: boolean
  data?: unknown // 攜帶你自己的 typed payload
}

type SelkitGroup = {
  label: string
  disabled?: boolean // 會向下傳遞到該組選項
  options: SelkitOption[]
}
```

核心會把扁平選項與分組正規化成一串有序的 row 加上一份扁平清單，讓 adapter 能渲染
分組標頭，同時索引與 `visibleOptions` 對齊。請見 [`getGroupedView()`](/zh/api/controller#getgroupedview)。

## 衍生視圖

Controller 提供衍生輔助，讓 adapter 保持單純：

- [`a11y()`](/zh/api/controller#a11y) — trigger、listbox 與每個選項的 ARIA 屬性。
- [`getGroupedView()`](/zh/api/controller#getgroupedview) — 要渲染的 row 序列，
  分組標頭交錯其中。
- [`isSearchable()`](/zh/api/controller#issearchable) — 是否該顯示搜尋框，由
  `searchable` 與 `minResultsForSearch` 共同決定。

## 定位

下拉浮層由內建於 `@selkit/dom` 的輕量、零依賴定位器負責定位。這守住了「無執行期依賴」
的承諾；不會硬性相依任何定位函式庫。

## 讓作用中選項保持可見

用鍵盤移動高亮（Arrow／Home／End）或開啟下拉時，作用中選項會自動捲入可視區
（`block: 'nearest'`——移動最小、只在跑出視窗外時才捲）。這讓 `aria-activedescendant`
指向的選項保持可見，正是 combobox 模式的要求。它**只在 active 索引變動時**觸發，所以不會
跟手動捲動打架。虛擬捲動下該列可能尚未渲染，因此改用固定 `itemHeight` 透過核心輔助函式
`computeScrollIntoView`（[`computeVirtualRange`](/zh/features/virtual-scroll) 的姊妹函式）
算出偏移，再依新位置重繪。
