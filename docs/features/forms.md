# Forms

`@selkit/dom` integrates with classic HTML form submission in two ways.

## Enhancing a `<select>`

Mount Selkit on an existing `<select>` and it enhances it in place: options,
initial value, `multiple` and `name` are read from the native element, which is
hidden and kept in sync as the user selects. The form still submits through the
original `<select>`.

```html
<form>
  <select id="fruit" name="fruit">
    <option value="apple">Apple</option>
    <option value="banana" selected>Banana</option>
  </select>
</form>
```

```js
import { createSelkitDom } from '@selkit/dom'
createSelkitDom('#fruit')
```

`<optgroup>`s become groups. Calling `destroy()` restores the original
`<select>`. Tagging adds new `<option>`s to the native element so they submit too.

## Hidden inputs via `name`

If you mount on a plain element instead of a `<select>`, set `name` and Selkit
maintains hidden `<input>`s so the value is submitted with the form:

```js
createSelkitDom('#fruit', {
  options,
  name: 'fruit',
})
```

- Single select maintains one hidden input named `fruit`.
- Multiple select maintains one hidden input per value, named `fruit[]`.

The inputs update automatically whenever the selection changes.

## Framework forms

In Vue and React you typically bind the value through `v-model` / `value` +
`onChange` and submit it via your usual form handling, so the hidden-input
mechanism is specific to the vanilla adapter.
