import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import ExampleGallery from '../components/ExampleGallery.vue'
import '@selkit/themes/base.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('ExampleGallery', ExampleGallery)
  },
} satisfies Theme
