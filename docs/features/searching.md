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
