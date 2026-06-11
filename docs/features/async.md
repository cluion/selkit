# Async & Pagination

## Loading options

Provide `loadOptions` to fetch options as the user searches. It receives the
query and a 1-based page number, and runs through a debounce with stale-response
protection so only the latest result wins:

```js
createSelkit({
  loadOptions: async (query, page) => {
    const res = await fetch(`/api/search?q=${query}&page=${page}`)
    return res.json() // SelkitItem[] or { items, hasMore }
  },
  debounce: 250, // ms, default 250
})
```

While a request is in flight, `state.loading` is `true`. On completion the core
fires `load:end`; on failure it fires `load:error` and clears `loading`.

### Local vs. remote filtering

By default remote results are shown as-is (the server already filtered). Set
`filterRemote: true` to additionally apply the local filter to returned options.

## Pagination & infinite scroll

`loadOptions` may return either an array (a single page) or a paginated result:

```ts
{ items: SelkitItem[]; hasMore: boolean }
```

When `hasMore` is `true`, calling `loadMore()` fetches the next page and
**appends** it. The adapters call `loadMore()` automatically when the dropdown is
scrolled near its bottom, giving infinite scroll for free:

```js
createSelkit({
  loadOptions: async (query, page) => {
    const data = await fetchPage(query, page)
    return { items: data.rows, hasMore: data.page < data.totalPages }
  },
})
```

State exposes the pagination status:

- `state.page` — the current loaded page (1-based; `0` before any load).
- `state.hasMore` — whether another page is available.
- `state.loadingMore` — `true` while appending the next page (distinct from the
  initial `loading`).

`loadMore()` is a no-op when there is no `loadOptions`, when `hasMore` is `false`,
or while a load is already in progress. Starting a new search resets pagination
and replaces results rather than appending.

## Returning an array

Returning a plain array keeps the old, non-paginated behavior — it is treated as
a single page with `hasMore: false`:

```js
createSelkit({
  loadOptions: async (query) => {
    const res = await fetch(`/api/search?q=${query}`)
    return res.json() // SelkitItem[]
  },
})
```
