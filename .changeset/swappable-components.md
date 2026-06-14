---
"@selkit/core": minor
"@selkit/dom": minor
"@selkit/vue": minor
"@selkit/react": minor
---

feat: swappable components for structural chrome

Replace the inner content of the dropdown arrow, clear button, tag remove button,
group heading and the empty/loading row, while keeping each part's wrapper, classes
and behavior (click handling, event delegation) intact.

- DOM: `templateArrow`, `templateClear`, `templateTagRemove`, `templateGroup`, `templateEmpty`
- Vue: `arrow`, `clear`, `tag-remove`, `group`, `empty` slots
- React: `renderArrow`, `renderClear`, `renderTagRemove`, `renderGroup`, `renderEmpty` props

Adds `controller.getEmptyReason()` (`'loading' | 'min-input' | 'no-results'`) so the
`empty` hook can branch on state (e.g. show a spinner only while loading).
