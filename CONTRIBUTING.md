# Contributing to Selkit

Thanks for your interest in improving Selkit! This guide covers local
development and how to get a change merged.

## Prerequisites

- **Node.js** ≥ 18
- **pnpm** ≥ 9 (`corepack enable` will set it up from `packageManager`)

## Setup

```bash
git clone https://github.com/cluion/selkit.git
cd selkit
pnpm install
```

## Common commands

```bash
pnpm build          # build all packages (tsup)
pnpm test           # run all tests (Vitest, incl. axe-core a11y checks)
pnpm typecheck      # tsc --noEmit across packages
pnpm --filter @selkit/docs docs:dev   # preview the docs site locally
```

Run a single package's tests while iterating:

```bash
pnpm --filter @selkit/core test:watch
```

## Repository layout

```
packages/
  core      @selkit/core   — framework-agnostic state machine (no DOM)
  dom       @selkit/dom     — vanilla JS renderer + positioner
  vue       @selkit/vue     — Vue 3 adapter
  react     @selkit/react   — React adapter
  themes    @selkit/themes  — base / bs5 CSS (CSS-variable driven)
docs/       VitePress site (en + zh)
examples/   runnable vanilla / vue / react demos
```

## Design principles

- **Behavior lives in `@selkit/core`.** The core is the single source of truth
  for state, keyboard logic, filtering/sorting, a11y attribute computation, and
  the `announce` / view derivation. It must stay DOM- and framework-free.
- **Adapters only render and bind.** `@selkit/dom`, `@selkit/vue` and
  `@selkit/react` translate core state into markup and forward events back to the
  controller. When adding a feature, prefer putting the logic in core and having
  all three adapters consume it, so behavior stays identical across frameworks.
- **Keep parity.** A user-facing feature should generally work the same in all
  three adapters (and be documented in both English and 繁體中文 under `docs/`).

## Tests

- Write tests first where practical. New behavior in core needs unit tests; new
  adapter wiring needs an adapter test.
- Accessibility matters: the adapters are checked against
  [axe-core](https://github.com/dequelabs/axe-core) — keep `pnpm test` green.

## Submitting a change

1. Branch from `main`.
2. Make your change with tests; ensure `pnpm test`, `pnpm typecheck` and
   `pnpm build` all pass.
3. **Add a changeset** describing the change:
   ```bash
   pnpm changeset
   ```
   Pick the bump level (patch / minor / major) and write a short summary. All
   `@selkit/*` packages are versioned together, so one changeset covers the set.
   Commit the generated file under `.changeset/`.
4. Open a pull request. Use [conventional commit](https://www.conventionalcommits.org/)
   style for messages (`feat:`, `fix:`, `docs:`, …).

Publishing to npm is handled by the maintainer — you don't need npm credentials
to contribute.

## License

By contributing you agree that your contributions are licensed under the
[MIT License](./LICENSE).
