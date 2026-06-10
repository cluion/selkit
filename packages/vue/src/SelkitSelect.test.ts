import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { SelkitSelect } from './SelkitSelect'
import type { SelkitItem, SelkitOption } from '@selkit/core'

const OPTIONS: SelkitItem[] = [
  { value: 'a', label: 'Apple' },
  { value: 'b', label: 'Banana' },
  { value: 'c', label: 'Cherry', disabled: true },
]

describe('SelkitSelect — 渲染', () => {
  it('初始渲染 control 且無 dropdown', () => {
    const w = mount(SelkitSelect, { props: { options: OPTIONS } })
    expect(w.find('.selkit__control').exists()).toBe(true)
    expect(w.find('.selkit__dropdown').exists()).toBe(false)
  })

  it('control 帶 combobox a11y 屬性', () => {
    const w = mount(SelkitSelect, { props: { options: OPTIONS } })
    const c = w.find('.selkit__control')
    expect(c.attributes('role')).toBe('combobox')
    expect(c.attributes('aria-expanded')).toBe('false')
  })
})

describe('開關與選取', () => {
  it('點 control 開啟並渲染選項', async () => {
    const w = mount(SelkitSelect, { props: { options: OPTIONS } })
    await w.find('.selkit__control').trigger('pointerdown')
    expect(w.find('.selkit__dropdown').exists()).toBe(true)
    expect(w.findAll('.selkit__option')).toHaveLength(3)
  })

  it('點選項 emit update:modelValue 與 change', async () => {
    const w = mount(SelkitSelect, { props: { options: OPTIONS } })
    await w.find('.selkit__control').trigger('pointerdown')
    await w.findAll('.selkit__option')[1]!.trigger('pointerdown')
    expect(w.emitted('update:modelValue')).toEqual([['b']])
    expect(w.emitted('change')).toBeTruthy()
  })

  it('disabled 選項不可選', async () => {
    const w = mount(SelkitSelect, { props: { options: OPTIONS } })
    await w.find('.selkit__control').trigger('pointerdown')
    await w.findAll('.selkit__option')[2]!.trigger('pointerdown')
    expect(w.emitted('update:modelValue')).toBeFalsy()
  })
})

describe('v-model', () => {
  it('初始 modelValue 顯示選中值', () => {
    const w = mount(SelkitSelect, {
      props: { options: OPTIONS, modelValue: 'b' },
    })
    expect(w.find('.selkit__single-value').text()).toBe('Banana')
  })

  it('外部 modelValue 變更同步到內部', async () => {
    const w = mount(SelkitSelect, {
      props: { options: OPTIONS, modelValue: 'a' },
    })
    await w.setProps({ modelValue: 'b' })
    expect(w.find('.selkit__single-value').text()).toBe('Banana')
  })
})

describe('多選', () => {
  it('累加 tags 且選後不關閉', async () => {
    const w = mount(SelkitSelect, {
      props: { options: OPTIONS, multiple: true },
    })
    await w.find('.selkit__control').trigger('pointerdown')
    await w.findAll('.selkit__option')[0]!.trigger('pointerdown')
    await w.findAll('.selkit__option')[1]!.trigger('pointerdown')
    expect(w.findAll('.selkit__tag')).toHaveLength(2)
    expect(w.find('.selkit__dropdown').exists()).toBe(true)
  })
})

describe('搜尋', () => {
  it('輸入過濾選項', async () => {
    const w = mount(SelkitSelect, { props: { options: OPTIONS } })
    await w.find('.selkit__input').setValue('ban')
    const labels = w.findAll('.selkit__option').map((o) => o.text())
    expect(labels).toEqual(['Banana'])
  })
})

describe('option slot', () => {
  it('可自訂選項內容', async () => {
    const w = mount(SelkitSelect, {
      props: { options: OPTIONS },
      slots: {
        option: (p: { option: SelkitOption }) => `★${p.option.label}`,
      },
    })
    await w.find('.selkit__control').trigger('pointerdown')
    expect(w.findAll('.selkit__option')[0]!.text()).toBe('★Apple')
  })
})
