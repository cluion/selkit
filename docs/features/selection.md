# Selection & Tagging

## Single and multiple

By default a select is single-choice. Set `multiple: true` for multi-select,
which renders chosen items as removable tags:

```js
createSelkit({ options, multiple: true })
```

The bound value is a single value for single select, or an array for multiple.

## Max selections

Cap how many items can be chosen at once:

```js
createSelkit({ options, multiple: true, maxSelections: 3 })
```

Once the cap is reached, further `select` calls are ignored.

## Hide selected

With `hideSelected`, chosen options are removed from the dropdown list — common
in multi-select UIs. The selected values are filtered out of `visibleOptions`, so
`getGroupedView()` skips them and all adapters hide them with no adapter-specific
code:

```js
createSelkit({ options, multiple: true, hideSelected: true })
```

Deselecting an item returns it to the list.

## Tagging

Allow users to create options that do not exist yet with `taggable` and a
`createTag` factory:

```js
createSelkit({
  options,
  taggable: true,
  createTag: (query) => ({ value: query.toLowerCase(), label: query }),
})
```

Pressing Enter with no matching option creates and selects a new tag, firing a
`create` event. If a tag with the same label already exists, the existing option
is selected instead of duplicating it.

## Reordering tags

`moveSelected(from, to)` reorders the selected array immutably and fires
`change` with the new order. The adapters wire this to drag-and-drop: tags are
`draggable`, and dropping one onto another calls `moveSelected`:

```js
controller.moveSelected(0, 2) // move the first tag to index 2
```

## Clearing

`clear()` removes all selections; the `clearable` option (default `true` for
single select) shows a clear button in the indicators area.
