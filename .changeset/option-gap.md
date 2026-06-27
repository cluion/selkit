---
'@selkit/core': minor
'@selkit/dom': minor
'@selkit/vue': minor
'@selkit/react': minor
'@selkit/themes': minor
---

下拉選項列間 gap：`optionGap`（預設 4）。dropdown 改 flex column + gap（CSS 變數 `--selkit-option-gap`）；虛擬捲動的 `computeVirtualRange`/`Window` + `scrollIntoView` 皆帶 gap（`stride = itemHeight + gap`），捲動不錯位。option padding 7→9px；`itemHeight` 預設 36→38 對齊新選項高度。
