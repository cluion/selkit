---
'@selkit/dom': patch
'@selkit/vue': patch
'@selkit/react': patch
---

開啟一個 select 時自動關閉其他：outside-click 改 capture 階段，繞過 control 的 stopPropagation。三框架各加多實例測試。
