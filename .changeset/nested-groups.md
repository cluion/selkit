---
'@selkit/core': minor
'@selkit/dom': minor
'@selkit/vue': minor
'@selkit/react': minor
'@selkit/themes': minor
'@selkit/floating': minor
---

Nested groups: `SelkitGroup.options` now accepts a nested `SelkitGroup`, so
groups can nest to any depth with per-level indentation. Only leaf options are
selectable; a group's `disabled` propagates to all descendants; searching keeps
the ancestor headings of matching leaves (branches with no match collapse).
Each row carries a `--selkit-depth` CSS variable; themes indent by
`--selkit-level-indent` (default `16px`). One-level usage stays fully backward
compatible.
