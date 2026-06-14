# Changesets

This folder is managed by [Changesets](https://github.com/changesets/changesets).

- Run `pnpm changeset` to add a changeset describing your change (pick a bump
  level and write a summary).
- `pnpm version-packages` applies pending changesets: bumps versions and writes
  CHANGELOGs.
- `pnpm release` builds and publishes to npm (`changeset publish`).

All `@selkit/*` packages are versioned together (`fixed`), so they share one
version. `@selkit/docs` is ignored.
