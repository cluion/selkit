# React

`@selkit/react` 提供 `<SelkitSelect>` 元件與 `useSelkit` hook。State 以
`useSyncExternalStore` 橋接，因此重新渲染由核心驅動且不會 tearing。

## 元件

`<SelkitSelect>` 以 `value` + `onChange` **受控**：

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

`onChange` 收到 `(value, payload)`，其中 `payload` 為 `{ selected, value }`。設定
`multiple` 時 `value` 為陣列。

## Props

| Prop | 型別 | 備註 |
| --- | --- | --- |
| `options` | `SelkitItem<T>[]` | 扁平選項或分組。 |
| `value` | `SelkitValue` | 受控值。 |
| `onChange` | `(value, payload) => void` | |
| `multiple` | `boolean` | |
| `placeholder` | `string` | |
| `searchable` | `boolean` | 預設 `true`。 |
| `fuzzy` | `boolean` | fuzzy 子序列比對。 |
| `minInputLength` | `number` | 達字數才過濾/載入。 |
| `minResultsForSearch` | `number` | 清單太短時隱藏搜尋框。 |
| `hideSelected` | `boolean` | 把已選項從清單移除。 |
| `loadOptions` | `(query, page) => Promise` | 非同步 / 分頁載入。 |
| `taggable` / `createTag` | | tagging。 |
| `maxSelections` | `number` | |
| `virtualScroll` / `itemHeight` | | 虛擬捲動。 |
| `dropdownParent` | `HTMLElement \| string` | 用 createPortal 把下拉送出裁切祖先。 |
| `clearable` | `boolean` | |
| `renderOption` | `(option, meta) => ReactNode` | 自訂選項渲染。 |
| `classPrefix` | `string` | |

完整清單見 [Config 參考](/zh/api/config)。

## 自訂選項渲染

```jsx
<SelkitSelect
  options={options}
  renderOption={(option, { active, selected }) => (
    <span className={selected ? 'is-selected' : undefined}>⭐ {option.label}</span>
  )}
/>
```

## Hook

若要自訂 markup，使用 `useSelkit`：

```jsx
import { useSelkit } from '@selkit/react'

function Custom() {
  const { controller, state } = useSelkit({ options })
  // state 是透過 useSyncExternalStore 取得的即時核心 state
  return <div>{state.visibleOptions.length} options</div>
}
```

`controller` 即 [Controller 參考](/zh/api/controller)所載的同一個物件。
