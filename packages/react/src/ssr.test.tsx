// @vitest-environment node
/**
 * SSR 安全網 smoke test —— 在「無 document」的純 node 環境下用
 * react-dom/server renderToStaticMarkup 渲染元件，驗證 render 期不會碰 browser 全域。
 *
 * react-dom/server 不會執行 useEffect（client-only），但會執行 render + useMemo，
 * 因此能精準抓出「render 期存取 document」的 SSR 缺口。
 */
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { SelkitSelect } from './SelkitSelect'
import type { SelkitItem } from '@selkit/core'

const OPTIONS: SelkitItem[] = [
  { value: 'a', label: 'Apple' },
  { value: 'b', label: 'Banana' },
]

describe('SSR safety (no document available)', () => {
  it('runs in a document-free environment', () => {
    // 防呆：確定這支測試真的沒有 document（否則下面的斷言失去意義）
    expect(typeof document).toBe('undefined')
  })

  it('renders default markup server-side without throwing', () => {
    // SSR 時 dropdown 預設關閉，選項不會進 html；只驗外殼與不拋
    const html = renderToStaticMarkup(<SelkitSelect options={OPTIONS} />)
    expect(html).toContain('combobox')
  })

  it('does not throw when dropdownParent is a selector string', () => {
    // SSR 時 document 不存在；portal target 解析應延後到 client（client-only portal）
    expect(() =>
      renderToStaticMarkup(
        <SelkitSelect options={OPTIONS} dropdownParent="body" />,
      ),
    ).not.toThrow()
  })

  it('does not throw with virtualScroll + multiple', () => {
    expect(() =>
      renderToStaticMarkup(
        <SelkitSelect options={OPTIONS} virtualScroll multiple />,
      ),
    ).not.toThrow()
  })
})
