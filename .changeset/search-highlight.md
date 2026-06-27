---
'@selkit/core': minor
'@selkit/dom': minor
'@selkit/vue': minor
'@selkit/react': minor
'@selkit/themes': minor
---

搜尋命中高亮：option label 的命中片段以 `<mark class="selkit__match">` 標示，三框架一致。

- core 新增純函式 `highlightMatches(label, query, fuzzy)` 與 controller `highlightLabel(label)`；比對與 filter 一致（去變音符 + 大小寫不敏感，fuzzy 標子序列）。預組／分解變音符皆標對位置。
- dom / vue / react 預設渲染高亮；文字一律走框架內建 escape，標籤字元不會被當 HTML（防 XSS）。
- 新增 `highlightMatches` config（預設 `true`），可關閉。
- themes 新增 `.selkit__match` 樣式與 `--selkit-match-bg` 變數（base + bs5）。
