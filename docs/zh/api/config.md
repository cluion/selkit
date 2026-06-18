# Config

`createSelkit(config)` 與每個 adapter 都接受 `SelkitConfig`。所有選項皆為選用。

## SelkitConfig

| 選項 | 型別 | 預設 | 說明 |
| --- | --- | --- | --- |
| `options` | `SelkitItem<T>[]` | `[]` | 初始選項 — 扁平選項或分組。 |
| `value` | `SelkitValue` | `null` | 初始選取。 |
| `multiple` | `boolean` | `false` | 允許多選。 |
| `searchable` | `boolean` | `true` | 清單是否可搜尋。 |
| `minResultsForSearch` | `number` | `0` | 選項數達此值才顯示搜尋框。 |
| `minInputLength` | `number` | `0` | 過濾 / 載入前的最少字數。 |
| `fuzzy` | `boolean` | `false` | 改用 fuzzy 子序列比對。設定 `filter` 時忽略。 |
| `filter` | `FilterFn<T>` | 子字串 | 自訂比對函式 `(option, query) => boolean`。 |
| `sorter` | `SorterFn<T>` | — | 自訂結果排序 `(a, b, query) => number`（如相關度）。僅扁平清單；分組時忽略。Vue/React 也是同名 prop。 |
| `hideSelected` | `boolean` | `false` | 把已選項從清單移除。 |
| `clearable` | `boolean` | 單選 `true` | 顯示清除鈕。 |
| `closeOnSelect` | `boolean` | 單選 `true` / 多選 `false` | 選取後關閉下拉。 |
| `disabled` | `boolean` | `false` | 停用控制項。 |
| `placeholder` | `string` | — | 佔位文字。 |
| `ariaLabel` | `string` | — | 搜尋輸入框的可及名稱（`aria-label`），未設則退回 `placeholder`。請至少設其一，讓螢幕報讀（與 axe）能辨識欄位。 |
| `loadOptions` | `(query, page, { signal }) => Promise<SelkitItem<T>[] \| SelkitLoadResult<T>>` | — | 非同步 / 分頁載入。`signal` 在被取代時 abort。見[非同步](/zh/features/async)。 |
| `debounce` | `number` | `250` | `loadOptions` 的 debounce（毫秒）。 |
| `filterRemote` | `boolean` | `false` | 對遠端結果再套本地過濾。 |
| `cache` | `boolean` | `false` | 以 query 為鍵記憶 `loadOptions` 首頁結果。僅首頁；`setOptions` 會清空。見[非同步 › 快取](/zh/features/async#快取結果)。 |
| `cacheTTL` | `number` | — | 快取項目過期的毫秒數。不填＝不過期。僅在 `cache: true` 時生效。 |
| `taggable` | `boolean` | `false` | 允許即時建立選項。 |
| `createTag` | `(query) => SelkitOption<T>` | — | 新 tag 的 factory。 |
| `isValidToken` | `(query) => boolean` | — | 控管 tag 建立。回傳 `false` 時靜默隱藏建立列並阻擋 Enter / 分隔符。見[標籤 › 驗證](/zh/features/selection#驗證-tag)。 |
| `tokenSeparators` | `string[]` | `[]` | 打字或貼上時依分隔符（如 `[',', ' ']`）自動切成多個 tag。僅多選生效；建立新 tag 另需 `taggable`。與既有選項同名的 token 會被選取，剩餘片段留在輸入框。 |
| `restoreOnBackspace` | `boolean` | `false` | 僅多選：輸入框為空時按 Backspace 刪除最後一個 tag，並把其 label 回填輸入框供編輯（同時開啟下拉）。 |
| `maxSelections` | `number` | — | 選取上限。 |
| `messages` | `Partial<SelkitMessages>` | 英文預設 | 覆寫空狀態訊息（載入中／無結果／再輸入 N 字）。見 [i18n](#i18n-訊息)。 |

## i18n / 訊息

下拉的空狀態文字由 core 透過 `controller.getEmptyMessage()` 決定，因此三個 adapter
顯示一致的字串。可只覆寫三項訊息中的任一子集，未指定的鍵維持英文預設。

```ts
createSelkit({
  minInputLength: 3,
  messages: {
    loading: '載入中…',
    noResults: '查無資料',
    // remaining 為還需輸入的字數
    minInputLength: (remaining) => `再輸入 ${remaining} 個字`,
  },
})
```

`getEmptyMessage()` 依目前狀態依序擇一：

1. `loading` — 非同步 `loadOptions` 載入中。
2. `minInputLength(remaining)` — 查詢長度未達 `minInputLength`。
3. `noResults` — 其餘情況（無相符選項）。

`create(query)` 為獨立項：`taggable` 開啟時，清單中可見的「建立新項」列的文字
（見 [選取 › Tagging](/zh/features/selection#tagging)）。

```ts
interface SelkitMessages {
  loading: string
  noResults: string
  minInputLength: (remaining: number) => string
  create: (query: string) => string // 預設 `Add "${query}"`
  // aria-live 公告（螢幕報讀朗讀）
  selected: (label: string) => string //   `${label} selected`
  deselected: (label: string) => string // `${label} removed`
  cleared: () => string //                  'Selection cleared'
  resultsCount: (count: number) => string //'N results available'
}
```

`selected` / `deselected` / `cleared` / `resultsCount`為螢幕報讀
[live-region 公告](/zh/api/events#live-公告)的文字。`announce` 事件預設開啟，無需設定。

## 僅限 DOM 的選項

`SelkitDomConfig`（`@selkit/dom` 使用）在上述之外擴充：

| 選項 | 型別 | 預設 | 說明 |
| --- | --- | --- | --- |
| `classPrefix` | `string` | `"selkit"` | BEM class 前綴。 |
| `name` | `string` | — | 維護 hidden input 以供表單送出。 |
| `checkboxes` | `boolean` | `false` | 僅多選：在每個選項顯示打勾框（加上 `selkit--checkboxes` modifier，樣式在主題中）。Vue/React 也是同名 prop。 |
| `autogrow` | `boolean` | `false` | 輸入框寬度隨文字增長（用 `size` 屬性）而非撐滿剩餘空間。加上 `selkit--autogrow` modifier。Vue/React 也是同名 prop。 |
| `dropdownAutoWidth` | `boolean` | `false` | 下拉寬度貼齊內容（至少與控制項同寬，需要時更寬）而非固定等寬。加上 `selkit--auto-width` modifier。Vue/React 也是同名 prop。 |
| `virtualScroll` | `boolean` | `false` | 只渲染可視切片。 |
| `itemHeight` | `number` | `36` | 虛擬捲動的固定列高。 |
| `dropdownParent` | `HTMLElement \| string` | — | 把下拉 portal 到其他容器以逃離裁切祖先。Vue/React 也是同名 prop。 |
| `positioner` | `PositionerFactory` | 內建 | 替換下拉定位器。傳入 [`@selkit/floating`](https://www.npmjs.com/package/@selkit/floating) 的 `createFloatingPositioner` 即啟用 `flip`／`shift`／`size` 防遮擋。Vue/React 也是同名 prop。見[定位](/zh/features/positioning)。 |
| `templateOption` | `(option, meta) => string \| Node` | — | 自訂下拉選項內容。字串走 textContent；要 markup（icon）請回傳 `Node`。`meta` 為 `{ index, active, selected }`。僅限 DOM — Vue/React 見 `renderOption`／`option` slot。 |
| `templateSelection` | `(option, meta) => string \| Node` | — | 自訂已選 tag／單值內容。字串走 textContent；要 markup（icon）請回傳 `Node`。`meta` 為 `{ index, multiple }`。僅限 DOM — Vue/React 見 `renderSelection`／`selection` slot。 |

Vue 與 React 元件以 props 揭露相同選項，另加 `virtualScroll` / `itemHeight` 與框架特有的
部分。自訂選項用 `renderOption`（React）／`option` slot（Vue）／`templateOption`（DOM）；
自訂已選顯示用 `renderSelection`（React）／`selection` slot（Vue）／`templateSelection`（DOM）。
選項 `meta` 為 `{ index, active, selected }`；已選 `meta` 為 `{ index, multiple }`。

## 可換元件

除了選項／已選的內容外，你還能替換結構性零件的內容——下拉箭頭、清除鈕、標籤移除鈕、
分組標題、以及空／載入列。每個 adapter 用各自的慣用機制，且**只替換內層內容**——外殼、
class、行為（click 處理、事件委派）都維持不變，所以不會不小心弄壞清除／移除鈕。

| 零件 | DOM config | Vue slot | React prop | Meta |
| --- | --- | --- | --- | --- |
| 下拉箭頭 | `templateArrow` | `arrow` | `renderArrow` | `{ open }` |
| 清除鈕 | `templateClear` | `clear` | `renderClear` | — |
| 標籤移除鈕 | `templateTagRemove` | `tag-remove` | `renderTagRemove` | `(option, { index })` |
| 分組標題 | `templateGroup` | `group` | `renderGroup` | `{ label, disabled }` |
| 空／載入 | `templateEmpty` | `empty` | `renderEmpty` | `{ reason, message, query }` |

DOM 鉤子回傳 `string | Node`（字串走 textContent 防 XSS、Node 直接掛入）；Vue slot 與
React prop 回傳各自原生的節點型別。`empty` 鉤子的 `reason` 為
`'loading' | 'min-input' | 'no-results'`，`message` 為已解析的預設文字——可依 `reason`
分流（例如載入中顯示 spinner、其餘沿用 `message`）。這些都是純呈現層，因此完全位於
adapter（不在 `@selkit/core`）。

## 型別

```ts
interface SelkitOption<T = unknown> {
  value: string | number
  label: string
  disabled?: boolean
  data?: T
}

interface SelkitGroup<T = unknown> {
  label: string
  disabled?: boolean
  options: SelkitOption<T>[]
}

type SelkitItem<T = unknown> = SelkitOption<T> | SelkitGroup<T>

type SelkitValue = string | number | null | Array<string | number>

type FilterFn<T = unknown> = (option: SelkitOption<T>, query: string) => boolean

type SorterFn<T = unknown> = (
  a: SelkitOption<T>,
  b: SelkitOption<T>,
  query: string,
) => number

interface SelkitLoadResult<T = unknown> {
  items: SelkitItem<T>[]
  hasMore: boolean
}
```
