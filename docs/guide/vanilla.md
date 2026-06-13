# Vanilla JS

`@selkit/dom` renders the controller with plain DOM — no framework required.

## Mounting

`createSelkitDom(target, config)` accepts an element or a selector string and
returns an instance:

```js
import { createSelkitDom } from '@selkit/dom'

const instance = createSelkitDom('#fruit', {
  options: [
    { value: 'apple', label: 'Apple' },
    { value: 'banana', label: 'Banana' },
  ],
  placeholder: 'Pick a fruit…',
  clearable: true,
})
```

The returned instance is:

```ts
interface SelkitDomInstance {
  controller: SelkitController // the headless brain
  element: HTMLElement // the rendered root
  destroy(): void // unbind and remove
}
```

Use `instance.controller` for everything behavioral — listening to events,
selecting programmatically, and so on:

```js
instance.controller.on('change', ({ value }) => console.log(value))
instance.controller.select('banana')
```

## Short aliases

For a select2 / Tom Select feel, two aliases are provided:

```js
import { sk, Selkit } from '@selkit/dom'

sk('#fruit', { options }) // function alias for createSelkitDom
const s = new Selkit('#fruit', { options }) // class-style alias
```

## Enhancing a native `<select>`

If the mount target is a `<select>`, Selkit reads its `<option>`s, `value`,
`multiple` and `name`, hides the native element and keeps it in sync. This is
progressive enhancement — the form still submits through the original control,
and `destroy()` restores it.

```html
<select id="fruit" name="fruit">
  <option value="apple">Apple</option>
  <option value="banana" selected>Banana</option>
</select>
```

```js
createSelkitDom('#fruit') // options come from the <select>
```

`<optgroup>` elements become Selkit groups automatically.

## DOM-only config

`SelkitDomConfig` extends [`SelkitConfig`](/api/config) with a couple of
render-time options:

| Option | Type | Description |
| --- | --- | --- |
| `classPrefix` | `string` | BEM class prefix, defaults to `"selkit"`. |
| `name` | `string` | Maintain hidden inputs for plain form submission. See [Forms](/features/forms). |
| `virtualScroll` | `boolean` | Render only the visible slice. See [Virtual Scroll](/features/virtual-scroll). |
| `itemHeight` | `number` | Fixed row height for virtual scroll, defaults to `36`. |
| `dropdownParent` | `HTMLElement \| string` | Portal the dropdown into another element (e.g. `document.body`) to escape clipping ancestors like `overflow:hidden` containers or modals. |
| `templateSelection` | `(option, meta) => string \| Node` | Customize the selected tag / single-value content. `meta` is `{ index, multiple }`. |

A returned **string** is set as `textContent` (safe — no HTML injection); return a
**`Node`** to include markup such as an icon:

```js
createSelkitDom(el, {
  options,
  multiple: true,
  templateSelection: (option) => {
    const span = document.createElement('span')
    span.textContent = `🔖 ${option.label}`
    return span
  },
})
```

## Cleanup

Always call `destroy()` when removing the component to unbind listeners and, in
enhancement mode, restore the native `<select>`:

```js
instance.destroy()
```
