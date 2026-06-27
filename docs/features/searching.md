# Searching

Selkit filters options as the user types. Everything here is configured on the
core and works identically across adapters.

## Default filtering

By default the search is a **case- and diacritics-insensitive substring** match
on the option label. Typing `cafe` matches `Café`:

```js
createSelkit({
  options: [
    { value: 1, label: 'Café' },
    { value: 2, label: 'Tea' },
  ],
})
// setQuery('cafe') → matches "Café"
```

## Fuzzy matching

Set `fuzzy: true` to switch to order-preserving **subsequence** matching. The
query characters must appear in order but need not be adjacent, so `blbr` matches
`Blueberry`:

```js
createSelkit({ options, fuzzy: true })
```

Fuzzy matching is also diacritics-insensitive.

## Custom filter

Provide your own predicate to fully control matching. A custom `filter` takes
precedence over `fuzzy`:

```js
createSelkit({
  options,
  filter: (option, query) =>
    option.label.toLowerCase().startsWith(query.toLowerCase()),
})
```

## Highlighting matches

As the user types, Selkit wraps the matched part of each option label in a
`<mark class="selkit__match">` so it's clear *why* an option matched. The
highlight follows the active filter — a substring under the default filter, the
matched characters under `fuzzy` — and is diacritics- and case-insensitive,
exactly like filtering (`cafe` highlights inside `Café`).

It's on by default. Turn it off with `highlightMatches: false`:

```js
createSelkit({ options, highlightMatches: false })
```

With a custom `filter`, highlighting can't know your predicate's exact match,
so it still looks for the query inside the label as a visual aid — disable it
if a mismatched highlight would mislead.

Style the mark through the `.selkit__match` class and the `--selkit-match-bg`
CSS variable (the bs5 theme maps it to `--bs-primary`).

## Sorting results

After filtering, reorder results with `sorter` — a comparator `(a, b, query) =>
number` (same contract as `Array.prototype.sort`, plus the current query for
relevance ranking). It applies to flat lists only and is ignored when options are
grouped (sorting across groups would break the headers).

```js
// Rank options whose label starts with the query first
createSelkit({
  options,
  sorter: (a, b, query) => {
    const rank = (o) =>
      o.label.toLowerCase().startsWith(query.toLowerCase()) ? 0 : 1
    return rank(a) - rank(b)
  },
})
```

The Vue and React components expose `sorter` as a prop.

## Minimum input length

`minInputLength` gates filtering — and async loading — until the user has typed
enough. Below the threshold no options are shown, and the empty list reads as
"awaiting input" rather than "no results" (`noResults` stays `false`):

```js
createSelkit({ options, minInputLength: 2 })
```

This is especially useful with [`loadOptions`](/features/async): the request is
not fired until the threshold is met.

## Hiding the search box

`minResultsForSearch` hides the search input until the list reaches a given size.
Combined with `searchable`, the controller exposes
[`isSearchable()`](/api/controller#issearchable), which adapters use to render the
input as read-only when search should be hidden:

```js
createSelkit({ options, minResultsForSearch: 10 }) // hidden until 10+ options
createSelkit({ options, searchable: false }) // never searchable
```
