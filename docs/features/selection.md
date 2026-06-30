# Selection & Tagging

## Single and multiple

By default a select is single-choice. Set `multiple: true` for multi-select,
which renders chosen items as removable tags:

```js
createSelkit({ options, multiple: true })
```

The bound value is a single value for single select, or an array for multiple.

In multiple mode, clicking an option (or pressing Enter on it) **toggles** it — so
clicking an already-selected option deselects it, not just removing it via its tag.

With `restoreOnBackspace`, pressing Backspace while the input is empty removes the
last tag and restores its label to the input (opening the dropdown) so you can edit
it instead of retyping. Without it (the default), Backspace just removes the tag.

## Grouping

Group options under headings by passing `SelkitGroup` items. Groups are
non-selectable headings — only leaf options can be chosen:

```js
createSelkit({
  options: [
    { label: 'Fruit', options: [{ value: 'a', label: 'Apple' }] },
    { label: 'Veg', options: [{ value: 'c', label: 'Carrot' }] },
  ],
})
```

### Nested groups

`options` accepts another `SelkitGroup`, so groups nest to any depth. Each level
indents by `--selkit-level-indent` (default `16px`) via a per-row
`--selkit-depth`; intermediate headings stay non-selectable and only leaves carry
a value:

```js
createSelkit({
  options: [
    {
      label: 'Electronics',
      options: [
        { label: 'Computers', options: [
          { value: 'mbp', label: 'MacBook Pro' },
          { value: 'mba', label: 'MacBook Air' },
        ]},
        { value: 'ip15', label: 'iPhone 15' },
      ],
    },
  ],
})
```

Searching a nested list keeps the ancestor headings of any matching leaf, so the
hit stays in context; branches with no match collapse away. Tune the indent on
`.selkit` (or any ancestor):

```css
.selkit { --selkit-level-indent: 20px; }
```

A group's `disabled` propagates to all its descendants.

## Tree mode

When an option carries `children`, the select switches to **tree mode**: every
node — parent or leaf — has a value and is selectable; parents expand/collapse
through `controller.toggleExpanded(value)`. This is distinct from
[`SelkitGroup`](#grouping) (a non-selectable heading): `children` makes the
parent a selectable node.

```js
createSelkit({
  multiple: true,
  options: [
    { value: 'elec', label: 'Electronics', children: [
      { value: 'pc', label: 'Computers', children: [
        { value: 'mbp', label: 'MacBook Pro' },
        { value: 'mba', label: 'MacBook Air' },
      ]},
    ]},
  ],
})
```

> Parents are selectable. With `treeCascade: true` (the default, multiple-only),
> selecting a parent checks all descendant leaves, and a parent shows a **mixed**
> state when only some are checked; set `treeCascade: false` for independent
> selection. All nodes are expanded by default. Searching filters the tree and
> auto-expands the ancestors of any match (clear the query to restore). Tree
> mode virtualizes like flat lists — set `virtualScroll: true` for large trees;
> collapsing and searching re-flow the visible window.

## Checkbox options

For a multi-select where chosen options stay visible with a tick, enable
`checkboxes` (a DOM config option / Vue · React prop). It adds the
`selkit--checkboxes` modifier class; the bundled themes render a checkbox indicator
on each option, driven by `aria-selected` — no extra markup:

```js
createSelkit({ options, multiple: true, checkboxes: true })
// React:  <SelkitSelect multiple checkboxes ... />
// Vue:    <SelkitSelect multiple checkboxes ... />
```

It is multiple-only (ignored for single select) and pairs best with `hideSelected`
off (the default) so selected options remain in the list. Bring your own checkbox
look by styling `.selkit--checkboxes .selkit__option` if you don't use the themes.

## Max selections

Cap how many items can be chosen at once:

```js
createSelkit({ options, multiple: true, maxSelections: 3 })
```

Once the cap is reached, further `select` calls are ignored.

## Collapsing tags

When a multi-select holds many items, the row of tags can overflow the control.
`maxSelectedDisplay` keeps only the first N tags visible and collapses the rest
into a `+M` pill; click it to expand and show them all, click again (`-M`) to
collapse:

```js
createSelkit({ options, multiple: true, maxSelectedDisplay: 5 })
```

Unset (the default) shows every tag. It's multiple-only and a pure display
concern — the selected set itself is unaffected, so `value` still holds every
chosen item.

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

### Validating tags

Pass `isValidToken` to gate what can become a tag. Returning `false` silently
rejects the input — no tag is created via Enter or a token separator, and the
create row is hidden — exactly like the below-`minInputLength` behavior:

```js
createSelkit({
  multiple: true,
  taggable: true,
  createTag: (query) => ({ value: query.toLowerCase(), label: query }),
  // e.g. only allow valid-looking emails
  isValidToken: (query) => /.+@.+\..+/.test(query),
})
```

### Visible "create" row

When `taggable` is on and the query has no exact match, the dropdown shows a
clickable **create row** (e.g. `Add "foo"`) as the last result — so users can
create a tag with the mouse, not just by pressing Enter. It is keyboard-navigable
(↑/↓/Home/End) and selecting it calls `createTag()`. The row is hidden when the
query is empty, below `minInputLength`, exactly matches an option, `maxSelections`
is reached, or `isValidToken` rejects the query. Customize its text with the
[`create` message](/api/config#i18n-messages):

```js
createSelkit({
  multiple: true,
  taggable: true,
  createTag: (query) => ({ value: query.toLowerCase(), label: query }),
  messages: { create: (query) => `Create “${query}”` },
})
```

In the view from `getGroupedView()` the row appears as
`{ type: 'create', index, query, label }`; adapters render it for you.

## Token separators

In multiple-select mode, `tokenSeparators` turns typed or pasted text into tags as
soon as a separator is seen — ideal for pasting comma- or space-delimited lists:

```js
createSelkit({
  options,
  multiple: true,
  taggable: true,
  createTag: (query) => ({ value: query.toLowerCase(), label: query }),
  tokenSeparators: [',', ' '],
})
```

Typing or pasting `apple, banana, ch` selects `apple` and `banana` (matching
existing options, or created as tags when `taggable`), and leaves `ch` in the
input. Tokens that match no option are dropped when `taggable` is off. The same
prop is available on the Vue/React components.

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

For a guard against accidental clears, set `clearConfirm`: the first click enters
a "confirm" state (the button turns into a red **Confirm**), and only the second
click actually clears. It auto-reverts after 2.5s of inactivity:

```js
createSelkit({ options, multiple: true, clearable: true, clearConfirm: true })
```

`clearConfirmText` overrides the confirm button's label (shown text and
`aria-label`, default `"Confirm"`) — useful for i18n:

```js
createSelkit({
  options,
  multiple: true,
  clearable: true,
  clearConfirm: true,
  clearConfirmText: '確認清空',
})
```
