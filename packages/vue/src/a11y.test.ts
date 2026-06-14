import { afterEach, describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import axe from 'axe-core'
import { SelkitSelect } from './SelkitSelect'
import type { SelkitItem } from '@selkit/core'

const OPTIONS: SelkitItem[] = [
  { value: 'a', label: 'Apple' },
  { value: 'b', label: 'Banana' },
  { value: 'c', label: 'Cherry', disabled: true },
]

let wrapper: VueWrapper | null = null

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  document.body.replaceChildren()
})

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

// axe 需元素在 document 內 故 attachTo
const open = (props: Record<string, unknown>): Element => {
  wrapper = mount(SelkitSelect, { props, attachTo: document.body })
  return wrapper.element
}

describe('axe a11y（jsdom）', () => {
  it('關閉狀態無違規', async () => {
    expect(
      await violations(open({ options: OPTIONS, placeholder: 'Pick a fruit' })),
    ).toEqual([])
  })

  it('多選 + 已選 + checkboxes 無違規', async () => {
    expect(
      await violations(
        open({
          options: OPTIONS,
          multiple: true,
          checkboxes: true,
          modelValue: ['a'],
          placeholder: 'Pick fruits',
        }),
      ),
    ).toEqual([])
  })

  it('disabled 無違規', async () => {
    expect(
      await violations(
        open({ options: OPTIONS, disabled: true, placeholder: 'Pick a fruit' }),
      ),
    ).toEqual([])
  })

  it('明確 ariaLabel 無違規（無 placeholder）', async () => {
    expect(
      await violations(open({ options: OPTIONS, ariaLabel: 'Fruit' })),
    ).toEqual([])
  })
})
