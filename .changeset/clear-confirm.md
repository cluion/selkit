---
'@selkit/core': minor
'@selkit/dom': minor
'@selkit/vue': minor
'@selkit/react': minor
'@selkit/themes': minor
---

clear 二次確認：`clearConfirm` 點第一次進入待確認、再點才真正清空（2.5s 未點自動復原）；`clearConfirmText` 自訂確認按鈕文字（預設 "Confirm"，顯示與 aria-label 同步）。三框架 adapter 本地狀態；themes 新增 `.selkit__clear--confirm` 與 `--selkit-danger` 變數（base + bs5）。
