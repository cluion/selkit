import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import axe from 'axe-core'
import { SelkitSelect } from './SelkitSelect'
import type { SelkitItem } from '@selkit/core'

const OPTIONS: SelkitItem[] = [
  { value: 'a', label: 'Apple' },
  { value: 'b', label: 'Banana' },
  { value: 'c', label: 'Cherry', disabled: true },
]

afterEach(cleanup)

/**
 * 對 el 跑 axe-core 回傳違規規則描述（空陣列代表通過）
 * jsdom 無排版/顏色計算 故關 color-contrast；元件片段非整頁 故關 region
 */
async function violations(el: Element): Promise<string[]> {
  const result = await axe.run(el, {
    rules: {
      'color-contrast': { enabled: false },
      region: { enabled: false },
    },
  })
  return result.violations.map((v) => `${v.id}: ${v.help}`)
}

describe('axe a11y（jsdom）', () => {
  it('關閉狀態無違規', async () => {
    const { container } = render(
      <SelkitSelect options={OPTIONS} placeholder="Pick a fruit" />,
    )
    expect(await violations(container)).toEqual([])
  })

  it('多選 + 已選 + checkboxes 無違規', async () => {
    const { container } = render(
      <SelkitSelect
        options={OPTIONS}
        multiple
        checkboxes
        value={['a']}
        placeholder="Pick fruits"
      />,
    )
    expect(await violations(container)).toEqual([])
  })

  it('disabled 無違規', async () => {
    const { container } = render(
      <SelkitSelect options={OPTIONS} disabled placeholder="Pick a fruit" />,
    )
    expect(await violations(container)).toEqual([])
  })

  it('明確 ariaLabel 無違規（無 placeholder）', async () => {
    const { container } = render(
      <SelkitSelect options={OPTIONS} ariaLabel="Fruit" />,
    )
    expect(await violations(container)).toEqual([])
  })
})
