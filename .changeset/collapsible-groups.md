---
"@selkit/core": minor
"@selkit/dom": minor
"@selkit/vue": minor
"@selkit/react": minor
"@selkit/themes": minor
"@selkit/floating": minor
---

Collapsible groups: add `collapsible` and `defaultCollapsed` to `SelkitGroup`
so a heading becomes clickable — collapsing hides the group's options while the
heading stays visible (and non-selectable). Searching temporarily expands every
group so matches stay reachable; clearing the query restores the previous
collapsed state. New `controller.toggleGroup(groupKey)` toggles a heading, and
each group row from `getGroupedView()` now carries `collapsible`, `expanded`,
and an opaque `groupKey`. Unlike tree mode, a collapsed group is a pure heading
and can never be selected.
