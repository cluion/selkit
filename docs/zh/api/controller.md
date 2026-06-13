# Controller

`createSelkit(config)` 回傳一個 `SelkitController`。adapter 會在內部建立並持有一個；你可
透過 instance 取得（原生為 `instance.controller`，Vue/React 為 `useSelkit().controller`）。

## 存取 state

### `getState()`

回傳目前 [state](/zh/api/events#state) 的唯讀快照。

### `subscribe(listener)`

註冊一個在每次 state 變更時以新 state 呼叫的 listener。回傳取消訂閱函式。

```js
const off = controller.subscribe((state) => render(state))
off() // 停止監聽
```

### `isSearchable()`

回傳是否該顯示搜尋輸入框 — 由 `searchable` 與 `minResultsForSearch` 門檻（對目前選項數）
共同決定。

## 開 / 關

| 方法 | 說明 |
| --- | --- |
| `open()` | 開啟下拉（已停用或已開啟時為 no-op）。 |
| `close()` | 關閉下拉。 |
| `toggle()` | 切換開關狀態。 |

## 搜尋

### `setQuery(query)`

設定查詢字串。有 `loadOptions` 時會 debounce 並觸發載入（遵守 `minInputLength`）；否則過濾
本地選項。觸發 `search`。

### `loadMore()`

載入並追加下一頁。沒有 `loadOptions`、`hasMore` 為 `false` 或載入中時為 no-op。見
[非同步與分頁](/zh/features/async)。

## Highlight

| 方法 | 說明 |
| --- | --- |
| `setActiveIndex(index)` | highlight 指定的可見索引。 |
| `moveActive(delta)` | 依 delta 移動 highlight，跳過 disabled，不 wrap。 |
| `moveActiveToStart()` | highlight 第一個可用選項。 |
| `moveActiveToEnd()` | highlight 最後一個可用選項。 |

## 選取

| 方法 | 說明 |
| --- | --- |
| `select(value)` | 依 value 選取選項。 |
| `deselect(value)` | 從選取中移除某 value。 |
| `toggleSelect(value)` | 切換某 value。 |
| `selectActive()` | 選取 highlight 的選項；taggable 且無相符時建立 tag。 |
| `clear()` | 清除所有選取。 |
| `moveSelected(from, to)` | 重排已選項（供 tag 拖放）。 |
| `createTag()` | 以目前查詢字串建立並選取 tag。 |

## 動態更新

| 方法 | 說明 |
| --- | --- |
| `setOptions(options)` | 取代選項。 |
| `setDisabled(disabled)` | 啟用 / 停用控制項。 |

## 事件

### `on(event, handler)`

訂閱語意化[事件](/zh/api/events#events)。回傳取消訂閱函式。

```js
const off = controller.on('change', ({ value }) => console.log(value))
```

## 衍生視圖

### `a11y()`

回傳 `trigger`、`listbox` 與 `option(index)` 的 ARIA 屬性。

### `getGroupedView()`

回傳要渲染的 row 序列 — 分組標頭與選項交錯，選項的 `index` 對齊 `state.visibleOptions`。

### `getEmptyMessage()`

回傳下拉無 row 時要顯示的字串 — 依目前狀態擇一回傳 `loading`、
`minInputLength(remaining)` 或 `noResults`。可透過 [`messages` 設定](/zh/api/config#i18n-訊息)自訂。

## 生命週期

### `destroy()`

清除計時器、listener 與訂閱者。adapter 會在自身 teardown 時呼叫它。
