# Controller

`createSelkit(config)` returns a `SelkitController`. Adapters create and own one
internally; you can reach it via the instance (`instance.controller` in vanilla,
`useSelkit().controller` in Vue/React).

## State access

### `getState()`

Returns a readonly snapshot of the current [state](/api/events#state).

### `subscribe(listener)`

Registers a listener called on every state change with the new state. Returns an
unsubscribe function.

```js
const off = controller.subscribe((state) => render(state))
off() // stop listening
```

### `isSearchable()`

Returns whether the search input should be shown — `searchable` combined with the
`minResultsForSearch` threshold against the current option count.

## Open / close

| Method | Description |
| --- | --- |
| `open()` | Open the dropdown (no-op if disabled or already open). |
| `close()` | Close the dropdown. |
| `toggle()` | Toggle open state. |

## Searching

### `setQuery(query)`

Sets the search query. With `loadOptions`, debounces and triggers a load
(respecting `minInputLength`); otherwise filters the local options. Fires
`search`.

### `loadMore()`

Loads and appends the next page. No-op without `loadOptions`, when `hasMore` is
`false`, or while loading. See [Async & Pagination](/features/async).

## Highlight

| Method | Description |
| --- | --- |
| `setActiveIndex(index)` | Highlight a specific visible index. |
| `moveActive(delta)` | Move highlight by delta, skipping disabled, without wrapping. |
| `moveActiveToStart()` | Highlight the first enabled option. |
| `moveActiveToEnd()` | Highlight the last enabled option. |

## Selection

| Method | Description |
| --- | --- |
| `select(value)` | Select an option by value. |
| `deselect(value)` | Remove a value from the selection. |
| `toggleSelect(value)` | Toggle a value. |
| `selectActive()` | Select the highlighted option, or create a tag when taggable and there is no match. |
| `clear()` | Clear all selections. |
| `moveSelected(from, to)` | Reorder selected items (for tag drag-and-drop). |
| `createTag()` | Create and select a tag from the current query. |
| `backspace()` | For adapters to call on Backspace: when multiple and the query is empty, removes the last tag (and restores its label to the query when `restoreOnBackspace` is set). |

## Dynamic updates

| Method | Description |
| --- | --- |
| `setOptions(options)` | Replace the options. |
| `setDisabled(disabled)` | Enable / disable the control. |

## Events

### `on(event, handler)`

Subscribe to a semantic [event](/api/events#events). Returns an unsubscribe
function.

```js
const off = controller.on('change', ({ value }) => console.log(value))
```

## Derived views

### `a11y()`

Returns ARIA attributes for `trigger`, `listbox` and `option(index)`.

### `getGroupedView()`

Returns the row sequence to render — group headers interleaved with options whose
`index` aligns with `state.visibleOptions`.

### `getEmptyMessage()`

Returns the string to show when the dropdown has no rows — one of `loading`,
`minInputLength(remaining)` or `noResults`, picked from the current state. Customize
the strings via the [`messages` config](/api/config#i18n-messages).

### `getEmptyReason()`

Returns why the dropdown is empty — `'loading' | 'min-input' | 'no-results'`,
using the same precedence as `getEmptyMessage()`. Adapters pass this to the
[`empty` swappable component](/api/config#swappable-components) so you can branch
(e.g. render a spinner only while `'loading'`).

## Lifecycle

### `destroy()`

Clears timers, listeners and subscribers. Adapters call this from their own
teardown.
