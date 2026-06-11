# 主題與 RTL

`@selkit/themes` 提供兩份樣式表，皆以 CSS 變數驅動。

## Base theme

中性、與框架無關的外觀：

```js
import '@selkit/themes/base.css'
```

每個顏色、圓角與間距都是 `.selkit` 上的 CSS 變數。在元件或任一祖先覆寫它們，即可不動
markup 就重新換膚：

```css
.selkit {
  --selkit-border: #d0d5dd;
  --selkit-border-focus: #6366f1;
  --selkit-bg: #ffffff;
  --selkit-text: #101828;
  --selkit-muted: #667085;
  --selkit-hover: #f2f4f7;
  --selkit-active: #eef2ff;
  --selkit-active-text: #3538cd;
  --selkit-tag-bg: #eef2ff;
  --selkit-radius: 8px;
  --selkit-gap: 6px;
}
```

## Bootstrap 5 theme

bs5 theme 把 Selkit 變數對應到 Bootstrap 的 `--bs-*` token。它 **scoped** 在
`.selkit-theme-bs5` 容器內，因此只影響容器內的元件：

```js
import '@selkit/themes/base.css' // 結構
import '@selkit/themes/bs5.css' // bs5 變數對應
```

```html
<div class="selkit-theme-bs5">
  <!-- 這裡的 Selkit 會融入 Bootstrap 5 -->
</div>
```

在已載入 Bootstrap 的頁面上，它會自動套用你的主題；否則會退回 CSS 內建的合理 fallback。

## Class 名稱

Markup 採用 BEM，前綴為 `selkit`（可透過 `classPrefix` 設定）：

| Class | 元素 |
| --- | --- |
| `.selkit` | 根節點 |
| `.selkit__control` | 可點擊的觸發框 |
| `.selkit__field` | 容納 tag 與輸入框 |
| `.selkit__input` | 搜尋輸入框 |
| `.selkit__tag` / `.selkit__tag-remove` | 多選 tag |
| `.selkit__indicators` | 清除鈕與箭頭 |
| `.selkit__dropdown` | 浮層 |
| `.selkit__option` | 選項（`--active`、`--selected`、`--disabled`） |
| `.selkit__group` | 分組標頭 |
| `.selkit__empty` | 空 / 載入訊息 |

## RTL

RTL 是純 CSS，沒有任何 JavaScript 設定。在元件或任一祖先（通常是 `<html dir="rtl">`）
設定 `dir="rtl"`，版面即自動適配：

```html
<div dir="rtl">
  <!-- tag、清除鈕與箭頭會翻到正確的一側 -->
</div>
```

多數方向性由 flex 版面自動處理；主題只加了少數規則來翻轉非對稱的 tag 內距並對齊選項
文字。bs5 theme 則對齊 Bootstrap 5 本身的 `[dir=rtl]` 行為。
