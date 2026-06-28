---
'@selkit/core': minor
'@selkit/dom': minor
'@selkit/vue': minor
'@selkit/react': minor
'@selkit/themes': minor
'@selkit/floating': minor
---

Tree mode (Phase 1): `SelkitOption.children` switches the select into tree mode,
where every node (parent or leaf) carries a value and is selectable, and parents
expand/collapse via `controller.toggleExpanded(value)`. Selection is independent
(no cascade yet — planned for a later phase); all nodes are expanded by default;
tree mode does not virtualize. `SelkitViewRow` gains a `treeitem` variant and
a11y emits `role=treeitem` + `aria-expanded`; dom/vue/react render a toggle and
indent by depth; themes add `.selkit__toggle`. Distinct from `SelkitGroup`
(non-selectable heading).
