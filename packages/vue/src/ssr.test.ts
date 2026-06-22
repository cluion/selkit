// @vitest-environment node
/**
 * SSR 安全網 smoke test —— 在「無 document」的純 node 環境下用
 * @vue/server-renderer 的 renderToString 渲染元件，驗證 SSR 不碰 browser 全域。
 *
 * Vue 的 setup() 在 SSR 會跑，但 onMounted / 非 immediate 的 watch 不跑，
 * 因此能驗證「setup + render 期」不會存取 document/window。
 */
import { describe, expect, it } from 'vitest'
import { h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { SelkitSelect } from './SelkitSelect'
import type { SelkitItem } from '@selkit/core'

const OPTIONS: SelkitItem[] = [
  { value: 'a', label: 'Apple' },
  { value: 'b', label: 'Banana' },
]

describe('SSR safety (no document available)', () => {
  it('runs in a document-free environment', () => {
    // 防呆：確定這支測試真的沒有 document
    expect(typeof document).toBe('undefined')
  })

  it('renders default markup server-side without throwing', async () => {
    // SSR 時 dropdown 預設關閉，選項不會進 html；只驗外殼與不拋
    const html = await renderToString(h(SelkitSelect, { options: OPTIONS }))
    expect(html).toContain('combobox')
  })

  it('does not throw when dropdownParent is a selector string', async () => {
    // Vue 的 <Teleport to="..."> 在 SSR 不解析選擇器，延後到 client
    await expect(
      renderToString(
        h(SelkitSelect, { options: OPTIONS, dropdownParent: 'body' }),
      ),
    ).resolves.toBeDefined()
  })

  it('does not throw with virtualScroll + multiple', async () => {
    await expect(
      renderToString(
        h(SelkitSelect, {
          options: OPTIONS,
          virtualScroll: true,
          multiple: true,
        }),
      ),
    ).resolves.toBeDefined()
  })
})
