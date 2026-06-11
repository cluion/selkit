# 原生 JS

`@selkit/dom` 以純 DOM 渲染 controller，不需要任何框架。

## 掛載

`createSelkitDom(target, config)` 接受元素或選擇器字串，回傳一個 instance：

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

回傳的 instance 為：

```ts
interface SelkitDomInstance {
  controller: SelkitController // headless 大腦
  element: HTMLElement // 渲染出的根節點
  destroy(): void // 解除綁定並移除
}
```

所有行為相關操作都透過 `instance.controller` — 監聽事件、以程式選取等：

```js
instance.controller.on('change', ({ value }) => console.log(value))
instance.controller.select('banana')
```

## 簡寫別名

為了貼近 select2 / Tom Select 的手感，提供兩個別名：

```js
import { sk, Selkit } from '@selkit/dom'

sk('#fruit', { options }) // createSelkitDom 的函式別名
const s = new Selkit('#fruit', { options }) // class 風格別名
```

## 增強既有的 `<select>`

若掛載目標是 `<select>`，Selkit 會讀取它的 `<option>`、`value`、`multiple` 與
`name`，隱藏原生元素並保持同步。這是漸進式增強 — 表單仍透過原生控制項送出，且
`destroy()` 會還原它。

```html
<select id="fruit" name="fruit">
  <option value="apple">Apple</option>
  <option value="banana" selected>Banana</option>
</select>
```

```js
createSelkitDom('#fruit') // 選項來自 <select>
```

`<optgroup>` 會自動成為 Selkit 分組。

## 僅限 DOM 的設定

`SelkitDomConfig` 在 [`SelkitConfig`](/zh/api/config) 之上多了幾個渲染期選項：

| 選項 | 型別 | 說明 |
| --- | --- | --- |
| `classPrefix` | `string` | BEM class 前綴，預設 `"selkit"`。 |
| `name` | `string` | 維護 hidden input 以供傳統表單送出。見[表單](/zh/features/forms)。 |
| `virtualScroll` | `boolean` | 只渲染可視切片。見[虛擬捲動](/zh/features/virtual-scroll)。 |
| `itemHeight` | `number` | 虛擬捲動的固定列高，預設 `36`。 |

## 清理

移除元件時務必呼叫 `destroy()` 以解除事件綁定，並在增強模式下還原原生 `<select>`：

```js
instance.destroy()
```
