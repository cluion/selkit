# Selkit

> The framework-agnostic select toolkit — headless select for JS, Vue & React.

一套 headless core，支援原生 JS / Vue / React，統一 API，零 jQuery、零必要依賴。對標 Select2 與 Tom Select 的現代化、TypeScript-first 替代方案。

## 套件 (Packages)

| 套件 | 說明 |
|------|------|
| `@selkit/core` | 純 TS 狀態機，零 DOM、零框架依賴（行為單一來源） |
| `@selkit/dom` | 原生 JS 渲染層 + 浮層 |
| `@selkit/vue` | Vue 3 adapter |
| `@selkit/react` | React adapter |
| `@selkit/themes` | base / bs5 樣式（CSS 變數驅動） |

## 開發

```bash
pnpm install
pnpm build
pnpm test
```

## 規劃文件

設計與路線圖見 [`plan/`](./plan/)。

## 授權

[MIT](./LICENSE) © cluion
