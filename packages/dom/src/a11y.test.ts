import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import axe from 'axe-core'
import { createSelkitDom } from './dom'
import type { SelkitItem } from '@selkit/core'

const OPTIONS: SelkitItem[] = [
  { value: 'a', label: 'Apple' },
  { value: 'b', label: 'Banana' },
  { value: 'c', label: 'Cherry', disabled: true },
]

let host: HTMLElement

beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
})

afterEach(() => {
  document.body.replaceChildren()
})

/**
 * 對 el 跑 axe-core 回傳違規規則的精簡描述（空陣列代表通過）
 * jsdom 無排版/顏色計算 故關閉 color-contrast；元件片段非整頁 故關閉 region
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
    const inst = createSelkitDom(host, { options: OPTIONS, placeholder: 'Pick a fruit' })
    expect(await violations(inst.element)).toEqual([])
  })

  it('開啟狀態無違規', async () => {
    const inst = createSelkitDom(host, { options: OPTIONS, placeholder: 'Pick a fruit' })
    inst.controller.open()
    expect(await violations(inst.element)).toEqual([])
  })

  it('多選 + 已選 + checkboxes 開啟無違規', async () => {
    const inst = createSelkitDom(host, {
      options: OPTIONS,
      multiple: true,
      checkboxes: true,
      value: ['a'],
      placeholder: 'Pick fruits',
    })
    inst.controller.open()
    expect(await violations(inst.element)).toEqual([])
  })

  it('disabled 無違規', async () => {
    const inst = createSelkitDom(host, { options: OPTIONS, disabled: true, placeholder: 'Pick a fruit' })
    expect(await violations(inst.element)).toEqual([])
  })

  it('taggable 建立列開啟無違規', async () => {
    const inst = createSelkitDom(host, {
      options: OPTIONS,
      multiple: true,
      taggable: true,
      createTag: (q) => ({ value: q, label: q }),
      placeholder: 'Pick fruits',
    })
    inst.controller.open()
    inst.controller.setQuery('Mango')
    expect(await violations(inst.element)).toEqual([])
  })
})
