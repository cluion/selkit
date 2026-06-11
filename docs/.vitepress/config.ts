import { defineConfig } from 'vitepress'

// Selkit documentation site config
// Single sidebar shown across all pages keeps navigation predictable
export default defineConfig({
  title: 'Selkit',
  description:
    'The framework-agnostic select toolkit — headless select for JS, Vue & React.',
  lang: 'en-US',
  cleanUrls: true,
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Features', link: '/features/searching' },
      { text: 'API', link: '/api/config' },
    ],
    sidebar: [
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
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/cluion/selkit' },
    ],
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 Selkit',
    },
    search: { provider: 'local' },
  },
})
