# Config

`createSelkit(config)` and every adapter accept a `SelkitConfig`. All options are
optional.

## SelkitConfig

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `options` | `SelkitItem<T>[]` | `[]` | Initial options — flat options or groups. |
| `value` | `SelkitValue` | `null` | Initial selection. |
| `multiple` | `boolean` | `false` | Allow multiple selection. |
| `searchable` | `boolean` | `true` | Whether the list can be searched. |
| `minResultsForSearch` | `number` | `0` | Show the search box only once the option count reaches this. |
| `minInputLength` | `number` | `0` | Minimum characters before filtering / loading. |
| `fuzzy` | `boolean` | `false` | Use fuzzy subsequence matching instead of substring. Ignored if `filter` is set. |
| `filter` | `FilterFn<T>` | substring | Custom match predicate `(option, query) => boolean`. |
| `hideSelected` | `boolean` | `false` | Remove chosen options from the list. |
| `clearable` | `boolean` | `true` single | Show a clear button. |
| `closeOnSelect` | `boolean` | `true` single / `false` multiple | Close the dropdown after selecting. |
| `disabled` | `boolean` | `false` | Disable the control. |
| `placeholder` | `string` | — | Placeholder text. |
| `loadOptions` | `(query, page) => Promise<SelkitItem<T>[] \| SelkitLoadResult<T>>` | — | Async / paginated loading. See [Async](/features/async). |
| `debounce` | `number` | `250` | Debounce in ms for `loadOptions`. |
| `filterRemote` | `boolean` | `false` | Apply the local filter to remote results. |
| `taggable` | `boolean` | `false` | Allow creating options on the fly. |
| `createTag` | `(query) => SelkitOption<T>` | — | Factory for new tags. |
| `tokenSeparators` | `string[]` | `[]` | Auto-split typed/pasted input on these separators (e.g. `[',', ' ']`) into tags. Multiple-select only; creating new tags also needs `taggable`. Tokens matching an existing option are selected; the remainder stays in the input. |
| `maxSelections` | `number` | — | Cap on selected items. |
| `messages` | `Partial<SelkitMessages>` | English defaults | Override the empty-state messages (loading / no results / type-more). See [i18n](#i18n-messages). |

## i18n / messages

The dropdown's empty-state text is resolved by the core via
`controller.getEmptyMessage()`, so every adapter shows the same string. Override
any subset of the three messages — unspecified keys keep their English default.

```ts
createSelkit({
  minInputLength: 3,
  messages: {
    loading: '載入中…',
    noResults: '查無資料',
    // `remaining` is how many more characters are still needed
    minInputLength: (remaining) => `再輸入 ${remaining} 個字`,
  },
})
```

`getEmptyMessage()` picks one message based on the current state, in order:

1. `loading` — while async `loadOptions` is in flight.
2. `minInputLength(remaining)` — when the query is shorter than `minInputLength`.
3. `noResults` — otherwise (no matching options).

```ts
interface SelkitMessages {
  loading: string
  noResults: string
  minInputLength: (remaining: number) => string
}
```

## DOM-only options

`SelkitDomConfig` (used by `@selkit/dom`) extends the above:

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `classPrefix` | `string` | `"selkit"` | BEM class prefix. |
| `name` | `string` | — | Maintain hidden inputs for form submission. |
| `virtualScroll` | `boolean` | `false` | Render only the visible slice. |
| `itemHeight` | `number` | `36` | Fixed row height for virtual scroll. |
| `dropdownParent` | `HTMLElement \| string` | — | Portal the dropdown into another element to escape clipping ancestors. Also a Vue/React prop. |
| `templateOption` | `(option, meta) => string \| Node` | — | Customize a dropdown option's content. Strings are set as text; return a `Node` for markup (icons). `meta` is `{ index, active, selected }`. DOM-only — see `renderOption` / `option` slot for Vue/React. |
| `templateSelection` | `(option, meta) => string \| Node` | — | Customize the selected tag / single-value content. Strings are set as text; return a `Node` for markup (icons). `meta` is `{ index, multiple }`. DOM-only — see `renderSelection` / `selection` slot for Vue/React. |

The Vue and React components expose the same options as props, plus
`virtualScroll` / `itemHeight` and framework-specific bits. Customize a dropdown
option with `renderOption` (React) / the `option` slot (Vue) / `templateOption`
(DOM), and the selected display with `renderSelection` (React) / the `selection`
slot (Vue) / `templateSelection` (DOM). Option `meta` is `{ index, active,
selected }`; selection `meta` is `{ index, multiple }`.

## Types

```ts
interface SelkitOption<T = unknown> {
  value: string | number
  label: string
  disabled?: boolean
  data?: T
}

interface SelkitGroup<T = unknown> {
  label: string
  disabled?: boolean
  options: SelkitOption<T>[]
}

type SelkitItem<T = unknown> = SelkitOption<T> | SelkitGroup<T>

type SelkitValue = string | number | null | Array<string | number>

type FilterFn<T = unknown> = (option: SelkitOption<T>, query: string) => boolean

interface SelkitLoadResult<T = unknown> {
  items: SelkitItem<T>[]
  hasMore: boolean
}
```
