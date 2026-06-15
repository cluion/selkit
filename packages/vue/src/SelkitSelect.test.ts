import { describe, expect, it, vi } from 'vitest'
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

  it('再點已選項即取消（toggle）', async () => {
    const w = mount(SelkitSelect, {
      props: { options: OPTIONS, multiple: true },
    })
    await w.find('.selkit__control').trigger('pointerdown')
    await w.findAll('.selkit__option')[0]!.trigger('pointerdown')
    expect(w.findAll('.selkit__tag')).toHaveLength(1)
    await w.findAll('.selkit__option')[0]!.trigger('pointerdown')
    expect(w.findAll('.selkit__tag')).toHaveLength(0)
  })

  it('restoreOnBackspace 把刪除的 label 回填輸入框', async () => {
    const w = mount(SelkitSelect, {
      props: {
        options: OPTIONS,
        multiple: true,
        modelValue: ['a', 'b'],
        restoreOnBackspace: true,
      },
    })
    await w.find('.selkit__control').trigger('keydown', { key: 'Backspace' })
    expect(w.findAll('.selkit__tag')).toHaveLength(1)
    expect((w.find('.selkit__input').element as HTMLInputElement).value).toBe(
      'Banana',
    )
  })
})

describe('aria-live 公告', () => {
  it('掛載 polite live region 並於選取後更新', async () => {
    const w = mount(SelkitSelect, {
      props: { options: OPTIONS, multiple: true },
    })
    const live = w.find('.selkit__live')
    expect(live.attributes('aria-live')).toBe('polite')
    await w.find('.selkit__control').trigger('pointerdown')
    await w.findAll('.selkit__option')[0]!.trigger('pointerdown')
    expect(w.find('.selkit__live').text()).toBe('Apple selected')
  })

  it('搜尋後公告結果數', async () => {
    const w = mount(SelkitSelect, { props: { options: OPTIONS } })
    await w.find('.selkit__control').trigger('pointerdown')
    await w.find('.selkit__input').setValue('Banana')
    expect(w.find('.selkit__live').text()).toBe('1 result available')
  })
})

describe('checkboxes 多選打勾', () => {
  it('多選 + checkboxes 加上 root modifier class', () => {
    const w = mount(SelkitSelect, {
      props: { options: OPTIONS, multiple: true, checkboxes: true },
    })
    expect(w.find('.selkit').classes()).toContain('selkit--checkboxes')
  })

  it('單選時不加 checkboxes class', () => {
    const w = mount(SelkitSelect, {
      props: { options: OPTIONS, checkboxes: true },
    })
    expect(w.find('.selkit').classes()).not.toContain('selkit--checkboxes')
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

describe('autogrow / dropdownAutoWidth', () => {
  it('autogrow 設 root class 且 input size 隨字數', async () => {
    const w = mount(SelkitSelect, {
      props: { options: OPTIONS, autogrow: true, placeholder: 'Pick' },
    })
    expect(w.find('.selkit').classes()).toContain('selkit--autogrow')
    await w.find('.selkit__input').setValue('abcd')
    expect(w.find('.selkit__input').attributes('size')).toBe('4')
  })

  it('dropdownAutoWidth 設 root class 且下拉用 max-content', async () => {
    const w = mount(SelkitSelect, {
      props: { options: OPTIONS, dropdownAutoWidth: true },
    })
    expect(w.find('.selkit').classes()).toContain('selkit--auto-width')
    await w.find('.selkit__control').trigger('pointerdown')
    const dd = w.find('.selkit__dropdown').element as HTMLElement
    expect(dd.style.width).toBe('max-content')
  })
})

describe('sorter', () => {
  it('依 sorter 反向排序渲染選項', async () => {
    const w = mount(SelkitSelect, {
      props: {
        options: OPTIONS,
        sorter: (a: { label: string }, b: { label: string }) =>
          b.label.localeCompare(a.label),
      },
    })
    await w.find('.selkit__control').trigger('pointerdown')
    expect(w.findAll('.selkit__option').map((o) => o.text())).toEqual([
      'Cherry',
      'Banana',
      'Apple',
    ])
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

describe('selection slot', () => {
  it('可自訂單值顯示', () => {
    const w = mount(SelkitSelect, {
      props: { options: OPTIONS, modelValue: 'b' },
      slots: {
        selection: (p: { option: SelkitOption }) => `✓${p.option.label}`,
      },
    })
    expect(w.find('.selkit__single-value').text()).toBe('✓Banana')
  })

  it('可自訂 tag 顯示且收到 index / multiple', () => {
    const w = mount(SelkitSelect, {
      props: { options: OPTIONS, multiple: true, modelValue: ['a', 'b'] },
      slots: {
        selection: (p: { option: SelkitOption; index: number; multiple: boolean }) =>
          `${p.index}:${p.option.label}:${p.multiple}`,
      },
    })
    const labels = w.findAll('.selkit__tag-label').map((e) => e.text())
    expect(labels).toEqual(['0:Apple:true', '1:Banana:true'])
  })
})

describe('可換元件 slot 自訂結構零件', () => {
  const GROUPED: SelkitItem[] = [
    { label: 'Fruit', options: [{ value: 'a', label: 'Apple' }] },
  ]

  it('arrow slot 覆寫箭頭內容並帶 open', async () => {
    const w = mount(SelkitSelect, {
      props: { options: OPTIONS },
      slots: { arrow: (p: { open: boolean }) => (p.open ? 'OPEN' : 'CLOSED') },
    })
    expect(w.find('.selkit__arrow').text()).toBe('CLOSED')
    await w.find('.selkit__control').trigger('pointerdown')
    expect(w.find('.selkit__arrow').text()).toBe('OPEN')
  })

  it('clear slot 覆寫清除鈕內容', () => {
    const w = mount(SelkitSelect, {
      props: { options: OPTIONS, modelValue: 'a' },
      slots: { clear: () => '✗' },
    })
    expect(w.find('.selkit__clear').text()).toBe('✗')
  })

  it('tag-remove slot 覆寫移除鈕內容並帶 index', () => {
    const w = mount(SelkitSelect, {
      props: { options: OPTIONS, multiple: true, modelValue: ['a', 'b'] },
      slots: {
        'tag-remove': (p: { option: SelkitOption; index: number }) =>
          `del${p.index}`,
      },
    })
    const texts = w.findAll('.selkit__tag-remove').map((e) => e.text())
    expect(texts).toEqual(['del0', 'del1'])
  })

  it('group slot 覆寫分組標題並帶 meta', async () => {
    const w = mount(SelkitSelect, {
      props: { options: GROUPED },
      slots: { group: (p: { label: string }) => `# ${p.label}` },
    })
    await w.find('.selkit__control').trigger('pointerdown')
    expect(w.find('.selkit__group').text()).toBe('# Fruit')
  })

  it('empty slot 覆寫空狀態並帶 reason / message', async () => {
    const w = mount(SelkitSelect, {
      props: { options: OPTIONS },
      slots: {
        empty: (p: { reason: string; message: string }) =>
          `${p.reason}:${p.message}`,
      },
    })
    const input = w.find('.selkit__input')
    await input.setValue('zzz')
    expect(w.find('.selkit__empty').text()).toBe('no-results:No results')
  })
})

describe('作用中選項捲入視窗 scrollIntoView', () => {
  it('鍵盤導航時對作用中選項呼叫 scrollIntoView', async () => {
    const spy = vi.fn()
    ;(Element.prototype as unknown as { scrollIntoView: unknown }).scrollIntoView = spy
    const w = mount(SelkitSelect, { props: { options: OPTIONS }, attachTo: document.body })
    await w.find('.selkit__control').trigger('pointerdown')
    spy.mockClear()
    await w.find('.selkit__control').trigger('keydown', { key: 'ArrowDown' })
    expect(spy).toHaveBeenCalledWith({ block: 'nearest' })
    w.unmount()
  })
})

describe('虛擬捲動', () => {
  const many: SelkitItem[] = Array.from({ length: 100 }, (_, i) => ({
    value: i,
    label: `Item ${i}`,
  }))

  it('未啟用時渲染全部選項', async () => {
    const w = mount(SelkitSelect, { props: { options: many } })
    await w.find('.selkit__control').trigger('pointerdown')
    expect(w.findAll('.selkit__option')).toHaveLength(100)
  })

  it('啟用時只渲染可視切片', async () => {
    const w = mount(SelkitSelect, {
      props: { options: many, virtualScroll: true, itemHeight: 36 },
    })
    await w.find('.selkit__control').trigger('pointerdown')
    const count = w.findAll('.selkit__option').length
    expect(count).toBeGreaterThan(0)
    expect(count).toBeLessThan(100)
  })
})

describe('dropdownParent 浮層 portal', () => {
  it('下拉 teleport 到指定容器外於元件', async () => {
    const w = mount(SelkitSelect, {
      props: { options: OPTIONS, dropdownParent: document.body },
      attachTo: document.body,
    })
    await w.find('.selkit__control').trigger('pointerdown')
    const dd = document.querySelector('.selkit__dropdown') as HTMLElement
    expect(dd).toBeTruthy()
    expect(w.element.contains(dd)).toBe(false)
    expect(dd.classList.contains('selkit')).toBe(true)
    w.unmount()
  })
})
