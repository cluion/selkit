# @selkit/themes

CSS themes for [Selkit](https://github.com/cluion/selkit) — the
framework-agnostic select toolkit. Lightweight, CSS-variable-driven styles shared
by all adapters (`@selkit/dom`, `@selkit/vue`, `@selkit/react`).

## Install

```bash
pnpm add @selkit/themes
```

## Usage

```js
// Base theme (always)
import '@selkit/themes/base.css'

// Optional Bootstrap 5 look — wrap the control in class="selkit-theme-bs5"
import '@selkit/themes/bs5.css'
```

Restyle via CSS variables (`--selkit-border`, `--selkit-bg`,
`--selkit-border-focus`, `--selkit-active-bg`, …) or target the BEM classes
(`.selkit__control`, `.selkit__option`, `.selkit__tag`, …). Modifier classes like
`.selkit--checkboxes`, `.selkit--autogrow` and `.selkit--auto-width` style the
matching features. See the
[theming guide](https://cluion.github.io/selkit/guide/theming).

## Docs

📖 [cluion.github.io/selkit](https://cluion.github.io/selkit/) · [繁體中文](https://cluion.github.io/selkit/zh/)

## License

[MIT](https://github.com/cluion/selkit/blob/main/LICENSE)
