---
'@selkit/core': minor
'@selkit/dom': minor
'@selkit/vue': minor
'@selkit/react': minor
'@selkit/themes': minor
'@selkit/floating': minor
---

Tree search: in tree mode, searching filters the tree and auto-expands the
ancestor chain of any matching node (branches with no match collapse away);
clearing the query restores the original expand state. core `#treeVisible` takes
a query; no adapter changes needed (visibleOptions already drives rendering).
