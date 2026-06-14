# 搜尋

Selkit 會隨使用者輸入過濾選項。這裡的一切都設定在核心上，且在各 adapter 表現一致。

## 預設過濾

預設搜尋是對選項 label 做**不分大小寫與變音符號的子字串**比對。輸入 `cafe` 會比中
`Café`：

```js
createSelkit({
  options: [
    { value: 1, label: 'Café' },
    { value: 2, label: 'Tea' },
  ],
})
// setQuery('cafe') → 比中 "Café"
```

## Fuzzy 比對

設定 `fuzzy: true` 切換成保序的**子序列**比對。查詢字元需依序出現但不必相鄰，因此
`blbr` 能比中 `Blueberry`：

```js
createSelkit({ options, fuzzy: true })
```

Fuzzy 比對同樣不分變音符號。

## 自訂過濾

提供你自己的判斷函式以完全掌控比對。自訂 `filter` 的優先序高於 `fuzzy`：

```js
createSelkit({
  options,
  filter: (option, query) =>
    option.label.toLowerCase().startsWith(query.toLowerCase()),
})
```

## 排序結果

過濾後可用 `sorter` 重排結果 — 比較器 `(a, b, query) => number`（契約同
`Array.prototype.sort`，並多帶目前 query 以利相關度排序）。僅扁平清單套用，分組時忽略
（跨組排序會破壞標頭）。

```js
// 以 query 開頭的選項排最前
createSelkit({
  options,
  sorter: (a, b, query) => {
    const rank = (o) =>
      o.label.toLowerCase().startsWith(query.toLowerCase()) ? 0 : 1
    return rank(a) - rank(b)
  },
})
```

Vue 與 React 元件以 `sorter` prop 揭露。

## 最少輸入字數

`minInputLength` 會在使用者輸入足夠字數前，擋下過濾 — 以及非同步載入。未達門檻時不顯示
任何選項，且空清單會被視為「等待輸入」而非「無相符」（`noResults` 維持 `false`）：

```js
createSelkit({ options, minInputLength: 2 })
```

這在搭配 [`loadOptions`](/zh/features/async) 時特別有用：未達門檻前不會發出請求。

## 隱藏搜尋框

`minResultsForSearch` 會在清單達到指定大小前隱藏搜尋輸入框。結合 `searchable`，
controller 會提供 [`isSearchable()`](/zh/api/controller#issearchable)，adapter 以此在
不該顯示搜尋時把輸入框渲染為唯讀：

```js
createSelkit({ options, minResultsForSearch: 10 }) // 達 10 個以上才顯示
createSelkit({ options, searchable: false }) // 永不可搜尋
```
