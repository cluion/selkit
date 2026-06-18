# Async & Pagination

## Loading options

Provide `loadOptions` to fetch options as the user searches. It receives the
query, a 1-based page number, and an options object with an `AbortSignal`, and
runs through a debounce with stale-response protection so only the latest result
wins:

```js
createSelkit({
  loadOptions: async (query, page, { signal }) => {
    const res = await fetch(`/api/search?q=${query}&page=${page}`, { signal })
    return res.json() // SelkitItem[] or { items, hasMore }
  },
  debounce: 250, // ms, default 250
})
```

While a request is in flight, `state.loading` is `true`. On completion the core
fires `load:end`; on failure it fires `load:error` and clears `loading`.

### Aborting in-flight requests

The `signal` passed to `loadOptions` is aborted when a newer search supersedes
the request, when the query drops below `minInputLength`, or on `destroy()`. Pass
it to `fetch` (as above) to actually cancel the network request instead of just
ignoring its result. An aborted request never fires `load:error` — the
cancellation is silent. Forwarding the signal is optional: omit it and Selkit
still discards the stale response, it just won't cancel the wire.

### Caching results

Enable `cache` to memoize the first page of results by query string, so
re-running a search the user already typed (e.g. backspacing into a prior query)
serves from memory instead of hitting the API again:

```js
createSelkit({
  loadOptions,
  cache: true,
  cacheTTL: 30_000, // optional; ms before an entry is considered stale. Omit = never expires
})
```

Only the first page is cached — `loadMore()` always hits the server. A cache hit
updates state without firing `load:start` / `load:end` (there is no request).
The cache is cleared by `setOptions()` and `destroy()`.

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
