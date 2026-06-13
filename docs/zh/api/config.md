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
| `hideSelected` | `boolean` | `false` | 把已選項從清單移除。 |
| `clearable` | `boolean` | 單選 `true` | 顯示清除鈕。 |
| `closeOnSelect` | `boolean` | 單選 `true` / 多選 `false` | 選取後關閉下拉。 |
| `disabled` | `boolean` | `false` | 停用控制項。 |
| `placeholder` | `string` | — | 佔位文字。 |
| `loadOptions` | `(query, page) => Promise<SelkitItem<T>[] \| SelkitLoadResult<T>>` | — | 非同步 / 分頁載入。見[非同步](/zh/features/async)。 |
| `debounce` | `number` | `250` | `loadOptions` 的 debounce（毫秒）。 |
| `filterRemote` | `boolean` | `false` | 對遠端結果再套本地過濾。 |
| `taggable` | `boolean` | `false` | 允許即時建立選項。 |
| `createTag` | `(query) => SelkitOption<T>` | — | 新 tag 的 factory。 |
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

```ts
interface SelkitMessages {
  loading: string
  noResults: string
  minInputLength: (remaining: number) => string
}
```

## 僅限 DOM 的選項

`SelkitDomConfig`（`@selkit/dom` 使用）在上述之外擴充：

| 選項 | 型別 | 預設 | 說明 |
| --- | --- | --- | --- |
| `classPrefix` | `string` | `"selkit"` | BEM class 前綴。 |
| `name` | `string` | — | 維護 hidden input 以供表單送出。 |
| `virtualScroll` | `boolean` | `false` | 只渲染可視切片。 |
| `itemHeight` | `number` | `36` | 虛擬捲動的固定列高。 |
| `dropdownParent` | `HTMLElement \| string` | — | 把下拉 portal 到其他容器以逃離裁切祖先。Vue/React 也是同名 prop。 |

Vue 與 React 元件以 props 揭露相同選項，另加 `virtualScroll` / `itemHeight` 與框架特有的
部分（React 的 `renderOption`、Vue 的 `option` slot）。

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

interface SelkitLoadResult<T = unknown> {
  items: SelkitItem<T>[]
  hasMore: boolean
}
```
