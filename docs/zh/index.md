---
layout: home
hero:
  name: Selkit
  text: 跨框架的 select 工具組
  tagline: 給原生 JS、Vue 與 React 的 headless select 與 combobox — 不依賴 jQuery，共用同一顆核心。
  actions:
    - theme: brand
      text: 快速開始
      link: /zh/guide/getting-started
    - theme: alt
      text: 核心概念
      link: /zh/guide/concepts
    - theme: alt
      text: GitHub
      link: https://github.com/cluion/selkit
features:
  - title: 真正的 headless
    details: 純 TypeScript 狀態機，零 DOM、零框架依賴。行為只寫一次，adapter 只負責渲染 state。
  - title: 一顆核心，三個 adapter
    details: 同一顆 @selkit/core 驅動 @selkit/dom、@selkit/vue 與 @selkit/react，API 統一。學一次，到處用。
  - title: 無 jQuery、零執行期依賴
    details: select2 與 Tom Select 的替代品，沒有 jQuery 包袱。預設定位器內建於核心。
  - title: 功能齊備
    details: 搜尋（子字串、不分變音符號、fuzzy）、多選、tagging、含分頁的非同步載入、虛擬捲動、表單與 RTL。
  - title: 預設就無障礙
    details: ARIA combobox/listbox 角色、active-descendant 管理與完整鍵盤導航皆由核心提供。
  - title: 易於換膚
    details: 中性 base theme 加上 scoped 的 Bootstrap 5 theme，皆以 CSS 變數驅動，改幾個變數即可重新換膚。
---
