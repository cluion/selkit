# Selkit

> The framework-agnostic select toolkit — headless select for JS, Vue & React.

[![CI](https://github.com/cluion/selkit/actions/workflows/ci.yml/badge.svg)](https://github.com/cluion/selkit/actions/workflows/ci.yml)
[![Deploy Docs](https://github.com/cluion/selkit/actions/workflows/docs.yml/badge.svg)](https://github.com/cluion/selkit/actions/workflows/docs.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

一套 headless core，支援原生 JS / Vue / React，統一 API，零 jQuery、零必要依賴。對標 Select2 與 Tom Select 的現代化、TypeScript-first 替代方案。

📖 **文件站：[cluion.github.io/selkit](https://cluion.github.io/selkit/)** · [繁體中文](https://cluion.github.io/selkit/zh/)

## 套件 (Packages)

| 套件 | 說明 |
|------|------|
| `@selkit/core` | 純 TS 狀態機，零 DOM、零框架依賴（行為單一來源） |
| `@selkit/dom` | 原生 JS 渲染層 + 浮層 |
| `@selkit/vue` | Vue 3 adapter |
| `@selkit/react` | React adapter |
| `@selkit/themes` | base / bs5 樣式（CSS 變數驅動） |

## 文件 (Documentation)

完整指南、功能說明與 API 參考見文件站：

- English — [cluion.github.io/selkit](https://cluion.github.io/selkit/)
- 繁體中文 — [cluion.github.io/selkit/zh](https://cluion.github.io/selkit/zh/)

三框架的可執行 demo 在 [`examples/`](./examples/)（`vanilla` / `vue` / `react`）。

## 開發

```bash
pnpm install        # 安裝相依
pnpm build          # 建置所有套件
pnpm test           # 跑測試
pnpm typecheck      # 型別檢查
pnpm --filter @selkit/docs docs:dev   # 本地預覽文件站
```

## 規劃文件

設計與路線圖見 [`plan/`](./plan/)。

## 授權

[MIT](./LICENSE) © cluion
