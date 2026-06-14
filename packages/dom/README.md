# @selkit/dom

Vanilla-JS renderer for [Selkit](https://github.com/cluion/selkit) — the
framework-agnostic select toolkit. Mounts a fully-featured select (search,
multiple, tagging, keyboard, a11y, dropdown positioning) on top of
[`@selkit/core`](https://www.npmjs.com/package/@selkit/core), with no framework
required.

## Install

```bash
pnpm add @selkit/dom @selkit/themes
```

## Usage

```js
import { createSelkitDom } from '@selkit/dom'
import '@selkit/themes/base.css'

const instance = createSelkitDom(document.getElementById('host'), {
  options: [
    { value: 'a', label: 'Apple' },
    { value: 'b', label: 'Banana' },
  ],
  multiple: true,
  placeholder: 'Pick fruits…',
})

instance.controller.on('change', ({ value }) => console.log(value))

// later
instance.destroy()
```

It can also enhance an existing native `<select>`. See the
[vanilla guide](https://cluion.github.io/selkit/guide/vanilla) for enhancement
mode, `dropdownParent`, virtual scroll, templates and more.

## Docs

📖 [cluion.github.io/selkit](https://cluion.github.io/selkit/) · [繁體中文](https://cluion.github.io/selkit/zh/)

## License

[MIT](https://github.com/cluion/selkit/blob/main/LICENSE)
