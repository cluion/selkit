import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { SelkitSelect } from './SelkitSelect'
import type { SelkitItem } from '@selkit/core'

const OPTIONS: SelkitItem[] = [
  { value: 'a', label: 'Apple' },
  { value: 'b', label: 'Banana' },
]

describe('taggable prop 透傳', () => {
  it('Enter 在無相符選項時建立 tag', async () => {
    const w = mount(SelkitSelect, {
      props: {
        options: OPTIONS,
        multiple: true,
        taggable: true,
        createTag: (q: string) => ({ value: q, label: q }),
      },
    })
    await w.find('.selkit__input').setValue('Mango')
    await w.find('.selkit__control').trigger('keydown', { key: 'Enter' })
    const tags = w.findAll('.selkit__tag').map((t) => t.text())
    expect(tags.some((t) => t.includes('Mango'))).toBe(true)
  })
})

describe('可見的建立列 create row', () => {
  it('無相符時顯示建立列 點擊建立 tag', async () => {
    const w = mount(SelkitSelect, {
      props: {
        options: OPTIONS,
        multiple: true,
        taggable: true,
        createTag: (q: string) => ({ value: q, label: q }),
      },
    })
    await w.find('.selkit__control').trigger('pointerdown')
    await w.find('.selkit__input').setValue('Mango')
    const createRow = w.find('.selkit__create')
    expect(createRow.text()).toBe('Add "Mango"')
    await createRow.trigger('pointerdown')
    const tags = w.findAll('.selkit__tag').map((t) => t.text())
    expect(tags.some((t) => t.includes('Mango'))).toBe(true)
  })
})

describe('tokenSeparators 透傳', () => {
  it('輸入含分隔符自動切成多個 tag 剩餘留在輸入框', async () => {
    const w = mount(SelkitSelect, {
      props: {
        options: OPTIONS,
        multiple: true,
        taggable: true,
        createTag: (q: string) => ({ value: q, label: q }),
        tokenSeparators: [','],
      },
    })
    const input = w.find('.selkit__input')
    await input.setValue('apple,Mango,ba')
    const tags = w.findAll('.selkit__tag').map((t) => t.text())
    expect(tags.some((t) => t.includes('Apple'))).toBe(true)
    expect(tags.some((t) => t.includes('Mango'))).toBe(true)
    expect((input.element as HTMLInputElement).value).toBe('ba')
  })
})

describe('isValidToken 透傳', () => {
  it('無效 query 不顯示建立列', async () => {
    const w = mount(SelkitSelect, {
      props: {
        options: OPTIONS,
        multiple: true,
        taggable: true,
        createTag: (q: string) => ({ value: q, label: q }),
        isValidToken: (q: string) => q.length >= 3,
      },
    })
    await w.find('.selkit__control').trigger('pointerdown')
    await w.find('.selkit__input').setValue('ab') // 長度 2 無效
    expect(w.find('.selkit__create').exists()).toBe(false)
    await w.find('.selkit__input').setValue('abc') // 有效
    expect(w.find('.selkit__create').exists()).toBe(true)
  })
})
