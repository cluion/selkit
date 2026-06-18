# 非同步與分頁

## 載入選項

提供 `loadOptions` 即可隨使用者搜尋取得選項。它收到查詢字串、從 1 起算的頁碼，以及帶有
`AbortSignal` 的選項物件，並會經過 debounce 與過期回應防護，確保只有最新結果生效：

```js
createSelkit({
  loadOptions: async (query, page, { signal }) => {
    const res = await fetch(`/api/search?q=${query}&page=${page}`, { signal })
    return res.json() // SelkitItem[] 或 { items, hasMore }
  },
  debounce: 250, // 毫秒，預設 250
})
```

請求進行中時 `state.loading` 為 `true`。完成時核心觸發 `load:end`；失敗時觸發
`load:error` 並清除 `loading`。

### 取消進行中的請求

當有更新的搜尋取代了當前請求、查詢退回未達 `minInputLength`、或 `destroy()` 時，傳給
`loadOptions` 的 `signal` 會被 abort。把它傳給 `fetch`（如上）即可**真正中斷**網路請求，
而不只是忽略結果。被取消的請求**不會**觸發 `load:error`——取消是靜默的。傳 signal 是選用：
不傳的話 Selkit 仍會丟棄過期回應，只是不會中斷連線。

### 快取結果

開啟 `cache` 可把首頁結果以 query 字串為鍵記憶起來，使用者重打已輸入過的搜尋（例如倒退回
先前的字串）時就從記憶體取，不再打 API：

```js
createSelkit({
  loadOptions,
  cache: true,
  cacheTTL: 30_000, // 選填；毫秒 超過視為過期。不填＝不過期
})
```

只有首頁會快取——`loadMore()` 一律打伺服器。快取命中時直接更新 state、不觸發
`load:start` / `load:end`（沒有實際請求）。`setOptions()` 與 `destroy()` 會清空快取。

### 本地 vs. 遠端過濾

預設會原樣顯示遠端結果（伺服器已過濾）。設定 `filterRemote: true` 可對回傳的選項額外套用
本地過濾。

## 分頁與無限捲動

`loadOptions` 可回傳陣列（單頁）或分頁結果：

```ts
{ items: SelkitItem[]; hasMore: boolean }
```

當 `hasMore` 為 `true`，呼叫 `loadMore()` 會取得下一頁並**追加**。adapter 會在下拉浮層捲動
接近底部時自動呼叫 `loadMore()`，無限捲動因此免費附帶：

```js
createSelkit({
  loadOptions: async (query, page) => {
    const data = await fetchPage(query, page)
    return { items: data.rows, hasMore: data.page < data.totalPages }
  },
})
```

State 會揭露分頁狀態：

- `state.page` — 目前已載入的頁碼（從 1 起；載入前為 `0`）。
- `state.hasMore` — 是否還有下一頁。
- `state.loadingMore` — 追加下一頁時為 `true`（與初次的 `loading` 區分）。

`loadMore()` 在沒有 `loadOptions`、`hasMore` 為 `false`、或已有載入進行中時皆為 no-op。
開始新搜尋會重置分頁並取代結果，而非追加。

## 回傳陣列

回傳純陣列即維持舊有、非分頁的行為 — 視為單頁且 `hasMore: false`：

```js
createSelkit({
  loadOptions: async (query) => {
    const res = await fetch(`/api/search?q=${query}`)
    return res.json() // SelkitItem[]
  },
})
```
