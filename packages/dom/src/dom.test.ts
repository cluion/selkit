import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

const pointerdown = (el: Element): void => {
  el.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
}
const keydown = (el: Element, key: string): void => {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
}
const $ = (root: ParentNode, sel: string): HTMLElement =>
  root.querySelector(sel) as HTMLElement
const $$ = (root: ParentNode, sel: string): HTMLElement[] =>
  Array.from(root.querySelectorAll(sel))

describe('掛載結構', () => {
  it('建立 control 與隱藏的 dropdown', () => {
    const inst = createSelkitDom(host, { options: OPTIONS })
    expect($(inst.element, '.selkit__control')).toBeTruthy()
    const dropdown = $(inst.element, '.selkit__dropdown')
    expect((dropdown as HTMLElement & { hidden: boolean }).hidden).toBe(true)
    expect($(inst.element, '.selkit__input')).toBeTruthy()
  })

  it('control 帶 combobox a11y 屬性', () => {
    const inst = createSelkitDom(host, { options: OPTIONS })
    const control = $(inst.element, '.selkit__control')
    expect(control.getAttribute('role')).toBe('combobox')
    expect(control.getAttribute('aria-expanded')).toBe('false')
    expect(control.getAttribute('aria-haspopup')).toBe('listbox')
  })

  it('預設搜尋框可輸入', () => {
    const inst = createSelkitDom(host, { options: OPTIONS })
    const input = $(inst.element, '.selkit__input') as HTMLInputElement
    expect(input.readOnly).toBe(false)
  })

  it('選項數未達 minResultsForSearch 時搜尋框唯讀', () => {
    const inst = createSelkitDom(host, { options: OPTIONS, minResultsForSearch: 10 })
    const input = $(inst.element, '.selkit__input') as HTMLInputElement
    expect(input.readOnly).toBe(true)
  })

  it('searchable false 時搜尋框唯讀', () => {
    const inst = createSelkitDom(host, { options: OPTIONS, searchable: false })
    const input = $(inst.element, '.selkit__input') as HTMLInputElement
    expect(input.readOnly).toBe(true)
  })
})

describe('開關', () => {
  it('點擊 control 開啟並渲染選項', () => {
    const inst = createSelkitDom(host, { options: OPTIONS })
    pointerdown($(inst.element, '.selkit__control'))
    expect(inst.controller.getState().isOpen).toBe(true)
    expect($(inst.element, '.selkit__control').getAttribute('aria-expanded')).toBe('true')
    expect($$(inst.element, '.selkit__option')).toHaveLength(3)
  })

  it('disabled 選項帶 aria-disabled', () => {
    const inst = createSelkitDom(host, { options: OPTIONS })
    pointerdown($(inst.element, '.selkit__control'))
    const opts = $$(inst.element, '.selkit__option')
    expect(opts[2]?.getAttribute('aria-disabled')).toBe('true')
  })

  it('點擊外部關閉', () => {
    const inst = createSelkitDom(host, { options: OPTIONS })
    pointerdown($(inst.element, '.selkit__control'))
    pointerdown(document.body)
    expect(inst.controller.getState().isOpen).toBe(false)
  })
})

describe('單選', () => {
  it('點擊選項選取並關閉', () => {
    const inst = createSelkitDom(host, { options: OPTIONS })
    pointerdown($(inst.element, '.selkit__control'))
    const banana = $$(inst.element, '.selkit__option')[1]!
    pointerdown(banana)
    expect(inst.controller.getState().selected.map((o) => o.value)).toEqual(['b'])
    expect(inst.controller.getState().isOpen).toBe(false)
    expect($(inst.element, '.selkit__single-value').textContent).toBe('Banana')
  })

  it('點擊 disabled 選項無效', () => {
    const inst = createSelkitDom(host, { options: OPTIONS })
    pointerdown($(inst.element, '.selkit__control'))
    pointerdown($$(inst.element, '.selkit__option')[2]!) // Cherry
    expect(inst.controller.getState().selected).toEqual([])
  })

  it('clear 鈕清空選取', () => {
    const inst = createSelkitDom(host, { options: OPTIONS, value: 'a' })
    pointerdown($(inst.element, '.selkit__clear'))
    expect(inst.controller.getState().selected).toEqual([])
  })
})

describe('搜尋', () => {
  it('輸入過濾選項並開啟', () => {
    const inst = createSelkitDom(host, { options: OPTIONS })
    const input = $(inst.element, '.selkit__input') as HTMLInputElement
    input.value = 'ban'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    expect(inst.controller.getState().isOpen).toBe(true)
    const labels = $$(inst.element, '.selkit__option').map((o) => o.textContent)
    expect(labels).toEqual(['Banana'])
  })

  it('無結果顯示 empty', () => {
    const inst = createSelkitDom(host, { options: OPTIONS })
    const input = $(inst.element, '.selkit__input') as HTMLInputElement
    input.value = 'zzz'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    expect($(inst.element, '.selkit__empty')).toBeTruthy()
  })

  it('搜尋重繪後 input 仍保持焦點', () => {
    const inst = createSelkitDom(host, { options: OPTIONS })
    const input = $(inst.element, '.selkit__input') as HTMLInputElement
    input.focus()
    input.value = 'a'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    expect(document.activeElement).toBe(input)
  })
})

describe('鍵盤', () => {
  it('ArrowDown 開啟並移動 highlight，Enter 選取', () => {
    const inst = createSelkitDom(host, { options: OPTIONS })
    const control = $(inst.element, '.selkit__control')
    keydown(control, 'ArrowDown') // open, active 0
    keydown(control, 'ArrowDown') // -> 1 (Banana)
    keydown(control, 'Enter')
    expect(inst.controller.getState().selected.map((o) => o.value)).toEqual(['b'])
  })

  it('Escape 關閉', () => {
    const inst = createSelkitDom(host, { options: OPTIONS })
    const control = $(inst.element, '.selkit__control')
    keydown(control, 'ArrowDown')
    keydown(control, 'Escape')
    expect(inst.controller.getState().isOpen).toBe(false)
  })
})

describe('多選', () => {
  it('累加 tags 且選後不關閉', () => {
    const inst = createSelkitDom(host, { options: OPTIONS, multiple: true })
    pointerdown($(inst.element, '.selkit__control'))
    pointerdown($$(inst.element, '.selkit__option')[0]!) // Apple
    pointerdown($$(inst.element, '.selkit__option')[1]!) // Banana
    expect(inst.controller.getState().selected.map((o) => o.value)).toEqual(['a', 'b'])
    expect(inst.controller.getState().isOpen).toBe(true)
    expect($$(inst.element, '.selkit__tag')).toHaveLength(2)
  })

  it('tag remove 鈕移除該選取', () => {
    const inst = createSelkitDom(host, {
      options: OPTIONS,
      multiple: true,
      value: ['a', 'b'],
    })
    pointerdown($$(inst.element, '.selkit__tag-remove')[0]!) // remove Apple
    expect(inst.controller.getState().selected.map((o) => o.value)).toEqual(['b'])
  })

  it('listbox 帶 aria-multiselectable', () => {
    const inst = createSelkitDom(host, { options: OPTIONS, multiple: true })
    expect($(inst.element, '.selkit__dropdown').getAttribute('aria-multiselectable')).toBe('true')
  })
})

describe('destroy', () => {
  it('移除元素並解除訂閱', () => {
    const inst = createSelkitDom(host, { options: OPTIONS })
    inst.destroy()
    expect(host.contains(inst.element)).toBe(false)
  })
})

describe('虛擬捲動 virtualScroll', () => {
  const many: SelkitItem[] = Array.from({ length: 100 }, (_, i) => ({
    value: i,
    label: `Item ${i}`,
  }))

  it('未啟用時渲染全部選項', () => {
    const inst = createSelkitDom(host, { options: many })
    inst.controller.open()
    expect($$(inst.element, '.selkit__option')).toHaveLength(100)
  })

  it('啟用時只渲染可視切片', () => {
    const inst = createSelkitDom(host, {
      options: many,
      virtualScroll: true,
      itemHeight: 36,
    })
    inst.controller.open()
    const opts = $$(inst.element, '.selkit__option')
    expect(opts.length).toBeGreaterThan(0)
    expect(opts.length).toBeLessThan(100)
  })

  it('有分組時退回完整渲染 不虛擬化', () => {
    const grouped: SelkitItem[] = [
      {
        label: 'G',
        options: Array.from({ length: 50 }, (_, i) => ({
          value: i,
          label: `Item ${i}`,
        })),
      },
    ]
    const inst = createSelkitDom(host, { options: grouped, virtualScroll: true })
    inst.controller.open()
    expect($$(inst.element, '.selkit__option')).toHaveLength(50)
  })
})

describe('tag 拖曳排序', () => {
  it('拖曳 tag 放到另一個 tag 上呼叫 moveSelected 重排', () => {
    const inst = createSelkitDom(host, {
      options: OPTIONS,
      multiple: true,
      value: ['a', 'b'],
    })
    const tags = $$(inst.element, '.selkit__tag')
    expect(tags).toHaveLength(2)
    tags[0]!.dispatchEvent(new Event('dragstart', { bubbles: true }))
    tags[1]!.dispatchEvent(new Event('drop', { bubbles: true }))
    expect(inst.controller.getState().selected.map((o) => o.value)).toEqual([
      'b',
      'a',
    ])
  })
})

describe('無限捲動 loadMore', () => {
  it('dropdown 捲到底觸發 loadMore 載入下一頁', async () => {
    const loadOptions = vi.fn(async (_q: string, p: number) =>
      p === 1
        ? { items: [{ value: 1, label: 'One' }], hasMore: true }
        : { items: [{ value: 2, label: 'Two' }], hasMore: false },
    )
    const inst = createSelkitDom(host, { loadOptions, debounce: 0 })
    inst.controller.open()
    inst.controller.setQuery('o')
    await vi.waitFor(() =>
      expect(inst.controller.getState().visibleOptions).toHaveLength(1),
    )
    const dropdown = $(inst.element, '.selkit__dropdown')
    dropdown.dispatchEvent(new Event('scroll'))
    await vi.waitFor(() =>
      expect(inst.controller.getState().visibleOptions).toHaveLength(2),
    )
    expect(loadOptions).toHaveBeenLastCalledWith('o', 2)
  })
})
