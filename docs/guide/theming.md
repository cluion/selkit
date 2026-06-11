# Theming & RTL

`@selkit/themes` ships two stylesheets, both driven by CSS custom properties.

## Base theme

A neutral, framework-agnostic look:

```js
import '@selkit/themes/base.css'
```

Every color, radius and spacing is a CSS variable on `.selkit`. Override them on
the component or any ancestor to restyle without touching the markup:

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

The bs5 theme maps Selkit variables onto Bootstrap's `--bs-*` tokens. It is
**scoped** to a `.selkit-theme-bs5` container, so it only affects components
inside it:

```js
import '@selkit/themes/base.css' // structure
import '@selkit/themes/bs5.css' // bs5 variable mapping
```

```html
<div class="selkit-theme-bs5">
  <!-- Selkit here blends into Bootstrap 5 -->
</div>
```

On a page with Bootstrap loaded it picks up your theme automatically; otherwise
it falls back to sensible defaults baked into the CSS.

## Class names

Markup follows BEM with the `selkit` prefix (configurable via `classPrefix`):

| Class | Element |
| --- | --- |
| `.selkit` | Root |
| `.selkit__control` | The clickable trigger box |
| `.selkit__field` | Holds tags and the input |
| `.selkit__input` | Search input |
| `.selkit__tag` / `.selkit__tag-remove` | Multiple-select tags |
| `.selkit__indicators` | Clear button and arrow |
| `.selkit__dropdown` | The popup |
| `.selkit__option` | An option (`--active`, `--selected`, `--disabled`) |
| `.selkit__group` | A group header |
| `.selkit__empty` | Empty / loading message |

## RTL

RTL is pure CSS with no JavaScript config. Set `dir="rtl"` on the component or
any ancestor — typically `<html dir="rtl">` — and the layout adapts:

```html
<div dir="rtl">
  <!-- tags, clear button and arrow flip to the correct side -->
</div>
```

Most direction is handled by the flex layout automatically; the theme only adds
a few rules to flip the asymmetric tag padding and align option text. The bs5
theme mirrors Bootstrap 5's own `[dir=rtl]` behavior.
