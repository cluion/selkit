# Selkit

> The framework-agnostic select toolkit — headless select for JS, Vue & React.

[![CI](https://github.com/cluion/selkit/actions/workflows/ci.yml/badge.svg)](https://github.com/cluion/selkit/actions/workflows/ci.yml)
[![Deploy Docs](https://github.com/cluion/selkit/actions/workflows/docs.yml/badge.svg)](https://github.com/cluion/selkit/actions/workflows/docs.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

English | [繁體中文](./README.zh-Hant.md)

A headless core for native JS / Vue / React with one unified API — no jQuery, no
required dependencies. A modern, TypeScript-first alternative to Select2 and
Tom Select.

📖 **Docs: [cluion.github.io/selkit](https://cluion.github.io/selkit/)** · [繁體中文](https://cluion.github.io/selkit/zh/)

## Packages

| Package | Description |
|------|------|
| `@selkit/core` | Pure TS state machine — zero DOM, zero framework deps (single source of behavior) |
| `@selkit/dom` | Vanilla JS renderer + dropdown positioner |
| `@selkit/vue` | Vue 3 adapter |
| `@selkit/react` | React adapter |
| `@selkit/themes` | base / bs5 styles (CSS-variable driven) |
| `@selkit/floating` | Optional advanced positioner — flip / shift / size collision handling via floating-ui |

## Install

```bash
# Vanilla JS
pnpm add @selkit/dom @selkit/themes
# Vue 3
pnpm add @selkit/vue @selkit/themes
# React
pnpm add @selkit/react @selkit/themes

# Optional — advanced positioning (flip / shift / size)
pnpm add @selkit/floating
```

`@selkit/core` is installed automatically as a dependency; `@selkit/themes`
provides the base / bs5 styles. `@selkit/floating` is optional — install it only
when you need collision-aware dropdown positioning (see
[Positioning](https://cluion.github.io/selkit/features/positioning)).

## Documentation

Full guides, feature docs and API reference are on the docs site:

- English — [cluion.github.io/selkit](https://cluion.github.io/selkit/)
- 繁體中文 — [cluion.github.io/selkit/zh](https://cluion.github.io/selkit/zh/)

Runnable demos for all three frameworks live in [`examples/`](./examples/)
(`vanilla` / `vue` / `react`).

## Development

```bash
pnpm install        # install dependencies
pnpm build          # build all packages
pnpm test           # run tests (incl. axe-core a11y checks)
pnpm typecheck      # type-check
pnpm --filter @selkit/docs docs:dev   # preview the docs site locally
```

## Contributing

Issues and PRs welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

[MIT](./LICENSE) © cluion
