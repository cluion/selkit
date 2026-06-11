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
| `maxSelections` | `number` | — | Cap on selected items. |

## DOM-only options

`SelkitDomConfig` (used by `@selkit/dom`) extends the above:

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `classPrefix` | `string` | `"selkit"` | BEM class prefix. |
| `name` | `string` | — | Maintain hidden inputs for form submission. |
| `virtualScroll` | `boolean` | `false` | Render only the visible slice. |
| `itemHeight` | `number` | `36` | Fixed row height for virtual scroll. |

The Vue and React components expose the same options as props, plus
`virtualScroll` / `itemHeight` and framework-specific bits (`renderOption` in
React, the `option` slot in Vue).

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
