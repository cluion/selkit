# 選取與 tagging

## 單選與多選

預設是單選。設定 `multiple: true` 改為多選，已選項會渲染成可移除的 tag：

```js
createSelkit({ options, multiple: true })
```

綁定值在單選時是單值，多選時是陣列。

多選模式下，點擊選項（或在其上按 Enter）會 **toggle**：點擊已選的選項會取消選取，
而不只能透過 tag 移除。

開啟 `restoreOnBackspace` 後，輸入框為空時按 Backspace 會刪除最後一個 tag 並把其
label 回填輸入框（同時開啟下拉），讓你直接編輯而不必重打。未開啟（預設）時 Backspace
只會刪除該 tag。

## checkbox 選項

若要做「已選項仍顯示並打勾」的多選，啟用 `checkboxes`（DOM config 選項／Vue · React
prop）。它會加上 `selkit--checkboxes` modifier class；內建主題會依 `aria-selected`
在每個選項渲染打勾框，無需額外標記：

```js
createSelkit({ options, multiple: true, checkboxes: true })
// React:  <SelkitSelect multiple checkboxes ... />
// Vue:    <SelkitSelect multiple checkboxes ... />
```

僅多選生效（單選忽略），並建議搭配 `hideSelected` 關閉（預設）讓已選項留在清單。
若不使用內建主題，可自行為 `.selkit--checkboxes .selkit__option` 設定打勾樣式。

## 選取上限

限制一次最多可選幾項：

```js
createSelkit({ options, multiple: true, maxSelections: 3 })
```

達到上限後，後續的 `select` 呼叫會被忽略。

## 摺疊 tag

多選項目很多時，一整排 tag 會撐爆控制項。`maxSelectedDisplay` 只顯示前 N 個 tag，
其餘摺疊成 `+M` 標記；點擊展開全部、再點（`-M`）收合：

```js
createSelkit({ options, multiple: true, maxSelectedDisplay: 5 })
```

未設（預設）時顯示全部 tag。僅多選生效，且純粹是顯示層 — 已選集合本身不受影響，
`value` 仍持有所有已選項。

## 隱藏已選

開啟 `hideSelected` 後，已選項會從下拉清單移除 — 多選 UI 常見做法。已選的值會被過濾出
`visibleOptions`，因此 `getGroupedView()` 會略過它們，所有 adapter 不需任何特別的程式
碼即可隱藏：

```js
createSelkit({ options, multiple: true, hideSelected: true })
```

取消選取後，該項會回到清單。

## Tagging

用 `taggable` 與 `createTag` factory，允許使用者建立尚不存在的選項：

```js
createSelkit({
  options,
  taggable: true,
  createTag: (query) => ({ value: query.toLowerCase(), label: query }),
})
```

在沒有相符選項時按 Enter 會建立並選取新 tag，並觸發 `create` 事件。若已存在同名 label
的選項，則改為選取既有選項，不會重複建立。

### 驗證 tag

傳入 `isValidToken` 來控管什麼能成為 tag。回傳 `false` 即靜默拒絕——Enter 或分隔符都不會
建立 tag，建立列也會隱藏——行為與未達 `minInputLength` 時一致：

```js
createSelkit({
  multiple: true,
  taggable: true,
  createTag: (query) => ({ value: query.toLowerCase(), label: query }),
  // 例如只允許看起來合法的 email
  isValidToken: (query) => /.+@.+\..+/.test(query),
})
```

### 可見的「建立」列

開啟 `taggable` 且查詢無精確相符時，下拉會在最後顯示一列可點的**建立列**
（例如 `Add "foo"`）— 使用者可用滑鼠建立 tag，而不只是按 Enter。該列可用鍵盤導航
（↑/↓/Home/End），選取它即呼叫 `createTag()`。當查詢為空、未達 `minInputLength`、
與某選項精確同名、已達 `maxSelections`、或 `isValidToken` 拒絕該查詢時不顯示。文字可用
[`create` 訊息](/zh/api/config#i18n-訊息)自訂：

```js
createSelkit({
  multiple: true,
  taggable: true,
  createTag: (query) => ({ value: query.toLowerCase(), label: query }),
  messages: { create: (query) => `建立「${query}」` },
})
```

在 `getGroupedView()` 的視圖中，該列為 `{ type: 'create', index, query, label }`；
adapter 會自動渲染。

## 分隔符（token separators）

多選模式下，`tokenSeparators` 會在偵測到分隔符時即時把打字或貼上的文字切成 tag —
特別適合貼上逗號或空白分隔的清單：

```js
createSelkit({
  options,
  multiple: true,
  taggable: true,
  createTag: (query) => ({ value: query.toLowerCase(), label: query }),
  tokenSeparators: [',', ' '],
})
```

打字或貼上 `apple, banana, ch` 會選取 `apple` 與 `banana`（比對既有選項，或在 `taggable`
時建立為 tag），並把 `ch` 留在輸入框。未開 `taggable` 時，無相符的 token 會被丟棄。
Vue/React 元件亦提供同名 prop。

## 重新排序 tag

`moveSelected(from, to)` 以不可變方式重排已選陣列，並以新順序觸發 `change`。adapter 把
它接上拖放：tag 為 `draggable`，把一個 tag 放到另一個上即呼叫 `moveSelected`：

```js
controller.moveSelected(0, 2) // 把第一個 tag 移到索引 2
```

## 清除

`clear()` 會移除所有選取；`clearable` 選項（單選預設 `true`）會在 indicators 區顯示清除鈕。
