# 內容安全政策（CSP）

Selkit 設計上可在**嚴格**的 Content Security Policy 下運作。它**不需要
`'unsafe-eval'`**、也**不需要 `'unsafe-inline'`**——下面這條政策就夠了：

```
default-src 'self'; script-src 'self'; style-src 'self';
```

（把 `'self'` 換成你的 app 實際提供 script / style 的來源——例如 CDN，或你
自家 bundle 的 nonce／hash。）

## 為什麼能通過

| CSP 顧慮 | Selkit | 需要放寬嗎？ |
| --- | --- | --- |
| `script-src` | 全程**無** `eval` / `new Function` | 不需要 `'unsafe-eval'` |
| `style-src` | 所有動態樣式都走 **CSSOM**（`element.style.*`），不用 markup 的 `style="…"` 屬性、也不用 `<style>` 區塊 | 不需要 `'unsafe-inline'` |
| Trusted Types | 選項文字走 `textContent`；自訂 markup 以 DOM `Node` 形式 append。**無** `innerHTML` / `insertAdjacentHTML` | 相容 `require-trusted-types-for 'script'` |
| 執行期注入樣式表 | 無——不建立 `<style>`、不用 `insertRule` 或 `adoptedStyleSheets` | — |

`style-src` 的關鍵觀念：它管的是**從 markup 解析出來的 inline style**（HTML 的
`style="…"` 屬性與 `<style>` 元素），**不管**透過 CSSOM 設定的樣式屬性。Selkit
是用 JavaScript 對 `element.style` 賦值來定位下拉與套版面，所以嚴格的
`style-src 'self'` **不會**讓它壞掉。Vue（`:style`）與 React（`style={}`）adapter
也是用同樣的方式、經 CSSOM 套樣式。

## 主題是一般樣式表

`@selkit/themes` 出的是純 `.css` 檔（`base.css`、`bs5.css`）。把它們像任何樣式表
一樣打包或提供即可，歸在 `style-src 'self'`（或你的 nonce／hash）底下。它們由 CSS
變數驅動，不含任何 inline script。

## `@selkit/floating`

選裝的 [`@selkit/floating`](/zh/features/positioning) 定位器薄包 `@floating-ui/dom`，
後者同樣是經 CSSOM 計算並套用位置、且不用 `eval`。它在同一條嚴格政策下即可運作，
不需要額外指令。
