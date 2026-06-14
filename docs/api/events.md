# State & Events

## State

`getState()` returns a readonly `SelkitState`. Subscribers receive it on every
change.

| Field | Type | Description |
| --- | --- | --- |
| `isOpen` | `boolean` | Whether the dropdown is open. |
| `query` | `string` | Current search string. |
| `activeIndex` | `number` | Highlighted index in `visibleOptions`, or `-1`. |
| `selected` | `SelkitOption<T>[]` | Selected options (length 0–1 for single, 0–n for multiple). |
| `visibleOptions` | `SelkitOption<T>[]` | Filtered, flattened options currently shown. |
| `loading` | `boolean` | An initial async load is in flight. |
| `noResults` | `boolean` | Not loading and `visibleOptions` is empty (not merely below `minInputLength`). |
| `disabled` | `boolean` | Whether the control is disabled. |
| `page` | `number` | Loaded page for pagination (1-based; `0` before any load). |
| `hasMore` | `boolean` | Whether another page can be loaded. |
| `loadingMore` | `boolean` | Appending the next page (distinct from `loading`). |

## Events

Subscribe with [`on(event, handler)`](/api/controller#on-event-handler).

| Event | Payload | Fired when |
| --- | --- | --- |
| `open` | `void` | The dropdown opens. |
| `close` | `void` | The dropdown closes. |
| `change` | `{ selected, value }` | Selection changes (select / deselect / clear / tag / reorder). |
| `search` | `{ query }` | The query changes via `setQuery`. |
| `highlight` | `{ index, option }` | The highlighted option changes. |
| `load:start` | `{ query }` | An async load begins. |
| `load:end` | `{ options }` | An async load resolves. |
| `load:error` | `{ error }` | An async load rejects. |
| `create` | `{ option }` | A tag is created. |
| `announce` | `{ message }` | A screen-reader message should be read (selection / result-count changes). Adapters write it to an `aria-live` region automatically. |

```js
controller.on('change', ({ selected, value }) => {
  console.log(value, selected)
})

controller.on('load:error', ({ error }) => {
  console.error('load failed', error)
})
```

## a11y attributes

`a11y()` returns the attributes adapters spread onto the markup:

```ts
interface SelkitA11y {
  trigger: {
    role: 'combobox'
    'aria-expanded': boolean
    'aria-controls': string
    'aria-haspopup': 'listbox'
    'aria-activedescendant'?: string
    'aria-disabled'?: boolean
  }
  listbox: {
    role: 'listbox'
    id: string
    'aria-multiselectable'?: boolean
  }
  option(index: number): {
    role: 'option'
    id: string
    'aria-selected': boolean
    'aria-disabled'?: boolean
  }
}
```

## Live announcements

Beyond the static ARIA attributes, every adapter renders a visually-hidden
`aria-live="polite"` region and writes the [`announce`](#events) message to it, so
screen readers hear selection and result-count changes. Customize the wording with
the `selected` / `deselected` / `cleared` / `resultsCount`
[messages](/api/config#i18n-messages). The behavior is on by default — no config
needed.
