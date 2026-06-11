import { defineConfig } from 'vitepress'

// 英文 sidebar root locale
const sidebarEn = [
  {
    text: 'Guide',
    items: [
      { text: 'Getting Started', link: '/guide/getting-started' },
      { text: 'Core Concepts', link: '/guide/concepts' },
      { text: 'Vanilla JS', link: '/guide/vanilla' },
      { text: 'Vue', link: '/guide/vue' },
      { text: 'React', link: '/guide/react' },
      { text: 'Theming & RTL', link: '/guide/theming' },
    ],
  },
  {
    text: 'Features',
    items: [
      { text: 'Searching', link: '/features/searching' },
      { text: 'Selection & Tagging', link: '/features/selection' },
      { text: 'Async & Pagination', link: '/features/async' },
      { text: 'Virtual Scroll', link: '/features/virtual-scroll' },
      { text: 'Forms', link: '/features/forms' },
    ],
  },
  {
    text: 'API Reference',
    items: [
      { text: 'Config', link: '/api/config' },
      { text: 'Controller', link: '/api/controller' },
      { text: 'State & Events', link: '/api/events' },
    ],
  },
]

// 繁中 sidebar zh locale 連結加上 /zh/ 前綴
const sidebarZh = [
  {
    text: '指南',
    items: [
      { text: '快速開始', link: '/zh/guide/getting-started' },
      { text: '核心概念', link: '/zh/guide/concepts' },
      { text: '原生 JS', link: '/zh/guide/vanilla' },
      { text: 'Vue', link: '/zh/guide/vue' },
      { text: 'React', link: '/zh/guide/react' },
      { text: '主題與 RTL', link: '/zh/guide/theming' },
    ],
  },
  {
    text: '功能',
    items: [
      { text: '搜尋', link: '/zh/features/searching' },
      { text: '選取與 tagging', link: '/zh/features/selection' },
      { text: '非同步與分頁', link: '/zh/features/async' },
      { text: '虛擬捲動', link: '/zh/features/virtual-scroll' },
      { text: '表單', link: '/zh/features/forms' },
    ],
  },
  {
    text: 'API 參考',
    items: [
      { text: 'Config', link: '/zh/api/config' },
      { text: 'Controller', link: '/zh/api/controller' },
      { text: 'State 與 Events', link: '/zh/api/events' },
    ],
  },
]

// Selkit 文件站雙語 root 為英文 zh 子路徑為繁體中文
export default defineConfig({
  title: 'Selkit',
  description:
    'The framework-agnostic select toolkit — headless select for JS, Vue & React.',
  // 本地預覽用根路徑 GitHub Pages project site 由 CI 注入 DOCS_BASE=/selkit/
  base: process.env.DOCS_BASE || '/',
  cleanUrls: true,
  themeConfig: {
    socialLinks: [{ icon: 'github', link: 'https://github.com/cluion/selkit' }],
    search: { provider: 'local' },
  },
  locales: {
    root: {
      label: 'English',
      lang: 'en-US',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/guide/getting-started' },
          { text: 'Features', link: '/features/searching' },
          { text: 'API', link: '/api/config' },
        ],
        sidebar: sidebarEn,
        footer: {
          message: 'Released under the MIT License.',
          copyright: 'Copyright © 2026 Selkit',
        },
      },
    },
    zh: {
      label: '繁體中文',
      lang: 'zh-Hant',
      themeConfig: {
        nav: [
          { text: '指南', link: '/zh/guide/getting-started' },
          { text: '功能', link: '/zh/features/searching' },
          { text: 'API', link: '/zh/api/config' },
        ],
        sidebar: sidebarZh,
        footer: {
          message: '依 MIT 授權釋出。',
          copyright: 'Copyright © 2026 Selkit',
        },
        docFooter: { prev: '上一頁', next: '下一頁' },
        outline: { label: '本頁目錄' },
        lastUpdated: { text: '最後更新' },
        returnToTopLabel: '回到頂端',
        sidebarMenuLabel: '選單',
        darkModeSwitchLabel: '外觀',
      },
    },
  },
})
