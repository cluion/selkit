# 表單

`@selkit/dom` 以兩種方式整合傳統 HTML 表單送出。

## 增強 `<select>`

把 Selkit 掛在既有的 `<select>` 上，它會就地增強：從原生元素讀取選項、初始值、
`multiple` 與 `name`，隱藏該元素並隨使用者選取保持同步。表單仍透過原生 `<select>` 送出。

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

`<optgroup>` 會成為分組。呼叫 `destroy()` 會還原原生 `<select>`。tagging 會把新的
`<option>` 加進原生元素，使其一併送出。

## 以 `name` 維護 hidden input

若掛在一般元素（而非 `<select>`）上，設定 `name`，Selkit 會維護 hidden `<input>`，讓值
隨表單送出：

```js
createSelkitDom('#fruit', {
  options,
  name: 'fruit',
})
```

- 單選維護一個名為 `fruit` 的 hidden input。
- 多選每個值維護一個 hidden input，名為 `fruit[]`。

每當選取變更，這些 input 會自動更新。

## 框架表單

在 Vue 與 React 中，你通常透過 `v-model` / `value` + `onChange` 綁定值，並用你慣用的表單
處理方式送出，因此 hidden input 機制專屬於原生 adapter。
