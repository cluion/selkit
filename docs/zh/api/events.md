# State 與 Events

## State

`getState()` 回傳唯讀的 `SelkitState`。訂閱者會在每次變更時收到它。

| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| `isOpen` | `boolean` | 下拉是否開啟。 |
| `query` | `string` | 目前搜尋字串。 |
| `activeIndex` | `number` | `visibleOptions` 中 highlight 的索引，或 `-1`。 |
| `selected` | `SelkitOption<T>[]` | 已選選項（單選長度 0–1，多選 0–n）。 |
| `visibleOptions` | `SelkitOption<T>[]` | 目前顯示、過濾且扁平化的選項。 |
| `loading` | `boolean` | 初次非同步載入進行中。 |
| `noResults` | `boolean` | 非載入中且 `visibleOptions` 為空（非僅是未達 `minInputLength`）。 |
| `disabled` | `boolean` | 控制項是否停用。 |
| `page` | `number` | 分頁已載入的頁碼（從 1 起；載入前為 `0`）。 |
| `hasMore` | `boolean` | 是否還能載入下一頁。 |
| `loadingMore` | `boolean` | 追加下一頁中（與 `loading` 區分）。 |

## Events

以 [`on(event, handler)`](/zh/api/controller#on-event-handler) 訂閱。

| 事件 | Payload | 觸發時機 |
| --- | --- | --- |
| `open` | `void` | 下拉開啟。 |
| `close` | `void` | 下拉關閉。 |
| `change` | `{ selected, value }` | 選取變更（select / deselect / clear / tag / 重排）。 |
| `search` | `{ query }` | 透過 `setQuery` 變更查詢。 |
| `highlight` | `{ index, option }` | highlight 的選項變更。 |
| `load:start` | `{ query }` | 非同步載入開始。 |
| `load:end` | `{ options }` | 非同步載入完成。 |
| `load:error` | `{ error }` | 非同步載入失敗。 |
| `create` | `{ option }` | 建立 tag。 |
| `announce` | `{ message }` | 應朗讀的螢幕報讀訊息（選取／結果數變化）。adapter 會自動寫入 `aria-live` region。 |

```js
controller.on('change', ({ selected, value }) => {
  console.log(value, selected)
})

controller.on('load:error', ({ error }) => {
  console.error('load failed', error)
})
```

## a11y 屬性

`a11y()` 回傳 adapter 套用到 markup 上的屬性：

```ts
interface SelkitA11y {
  trigger: {
    role: 'combobox'
    'aria-expanded': boolean
    'aria-controls': string
    'aria-haspopup': 'listbox'
    'aria-activedescendant'?: string
    'aria-disabled'?: boolean
  }
  listbox: {
    role: 'listbox'
    id: string
    'aria-multiselectable'?: boolean
  }
  option(index: number): {
    role: 'option'
    id: string
    'aria-selected': boolean
    'aria-disabled'?: boolean
  }
}
```

## live 公告

除了靜態 ARIA 屬性，每個 adapter 都會渲染一個視覺隱藏的 `aria-live="polite"`
region，並把 [`announce`](#事件) 訊息寫入，讓螢幕報讀朗讀選取與結果數變化。文字可用
`selected` / `deselected` / `cleared` / `resultsCount`
[messages](/zh/api/config#i18n-訊息) 自訂。預設開啟，無需設定。
