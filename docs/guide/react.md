# React

`@selkit/react` provides a `<SelkitSelect>` component and a `useSelkit` hook.
State is bridged with `useSyncExternalStore`, so re-renders are driven by the
core and stay tear-free.

## Component

`<SelkitSelect>` is **controlled** via `value` + `onChange`:

```jsx
import { useState } from 'react'
import { SelkitSelect } from '@selkit/react'
import '@selkit/themes/base.css'

const options = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
]

export function Example() {
  const [value, setValue] = useState(null)
  return (
    <SelkitSelect
      options={options}
      value={value}
      onChange={(next, payload) => setValue(next)}
      placeholder="Pick a fruit…"
    />
  )
}
```

`onChange` receives `(value, payload)` where `payload` is `{ selected, value }`.
When `multiple` is set, `value` is an array.

## Props

| Prop | Type | Notes |
| --- | --- | --- |
| `options` | `SelkitItem<T>[]` | Flat options or groups. |
| `value` | `SelkitValue` | Controlled value. |
| `onChange` | `(value, payload) => void` | |
| `multiple` | `boolean` | |
| `placeholder` | `string` | |
| `searchable` | `boolean` | Defaults to `true`. |
| `fuzzy` | `boolean` | Fuzzy subsequence matching. |
| `minInputLength` | `number` | Gate filtering/loading. |
| `minResultsForSearch` | `number` | Hide the search box for short lists. |
| `hideSelected` | `boolean` | Remove chosen options from the list. |
| `loadOptions` | `(query, page) => Promise` | Async / paginated loading. |
| `taggable` / `createTag` | | Tagging. |
| `maxSelections` | `number` | |
| `virtualScroll` / `itemHeight` | | Virtual scrolling. |
| `dropdownParent` | `HTMLElement \| string` | Portal the dropdown (createPortal) out of clipping ancestors. |
| `clearable` | `boolean` | |
| `renderOption` | `(option, meta) => ReactNode` | Custom option rendering. |
| `renderSelection` | `(option, meta) => ReactNode` | Custom selected tag / single-value content. |
| `classPrefix` | `string` | |

See the full list in the [Config reference](/api/config).

## Custom option rendering

```jsx
<SelkitSelect
  options={options}
  renderOption={(option, { active, selected }) => (
    <span className={selected ? 'is-selected' : undefined}>⭐ {option.label}</span>
  )}
/>
```

## Custom selection rendering

Customize the displayed tag / single value (e.g. add an icon). The component keeps
the tag wrapper and remove button; `meta` is `{ index, multiple }`.

```jsx
<SelkitSelect
  options={options}
  multiple
  renderSelection={(option) => (
    <span>🔖 {option.label}</span>
  )}
/>
```

## Hook

For custom markup, use `useSelkit`:

```jsx
import { useSelkit } from '@selkit/react'

function Custom() {
  const { controller, state } = useSelkit({ options })
  // state is the live core state via useSyncExternalStore
  return <div>{state.visibleOptions.length} options</div>
}
```

`controller` is the same object documented in the
[Controller reference](/api/controller).
