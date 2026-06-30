---
'@selkit/core': minor
'@selkit/dom': minor
'@selkit/vue': minor
'@selkit/react': minor
'@selkit/themes': minor
'@selkit/floating': minor
---

Tree virtualization: tree mode now works with `virtualScroll`. Tree rows are
uniform-height, so they already routed through the flat `computeVirtualRange`
path (the adapter's `hasGroups === false` branch) — this adds test coverage and
documents it. Large trees render only the visible slice; collapsing and
searching re-flow the window. No new runtime code.

Also fix a pre-existing flexbox scroll-container bug: `.selkit__dropdown`
children now have `flex-shrink: 0`. Previously the flex column container
compressed virtual-scroll spacer divs (and overflow content) instead of
overflowing, silently disabling scrolling for flat/grouped/tree virtualization
in real browsers — jsdom tests missed it because `clientHeight` is 0 there.
