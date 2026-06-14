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

describe('templateSelection 自訂已選', () => {
  it('字串覆寫單值文字（走 textContent）', () => {
    const inst = createSelkitDom(host, {
      options: OPTIONS,
      value: 'b',
      templateSelection: (o) => `✓${o.label}`,
    })
    expect($(inst.element, '.selkit__single-value').textContent).toBe('✓Banana')
  })

  it('回傳 Node 可放 icon 等標記', () => {
    const inst = createSelkitDom(host, {
      options: OPTIONS,
      multiple: true,
      value: ['a'],
      templateSelection: (o) => {
        const span = document.createElement('span')
        span.className = 'icon'
        span.textContent = o.label
        return span
      },
    })
    expect($(inst.element, '.selkit__tag-label .icon')).toBeTruthy()
    expect($(inst.element, '.selkit__tag-label .icon').textContent).toBe('Apple')
  })

  it('meta 帶 index 與 multiple', () => {
    const seen: string[] = []
    createSelkitDom(host, {
      options: OPTIONS,
      multiple: true,
      value: ['a', 'b'],
      templateSelection: (o, m) => {
        seen.push(`${m.index}:${m.multiple}`)
        return o.label
      },
    })
    expect(seen).toEqual(['0:true', '1:true'])
  })
})

describe('templateOption 自訂選項', () => {
  it('字串覆寫選項文字（走 textContent）', () => {
    const inst = createSelkitDom(host, {
      options: OPTIONS,
      templateOption: (o) => `★${o.label}`,
    })
    pointerdown($(inst.element, '.selkit__control'))
    expect($$(inst.element, '.selkit__option')[0]!.textContent).toBe('★Apple')
  })

  it('回傳 Node 可放 icon 等標記', () => {
    const inst = createSelkitDom(host, {
      options: OPTIONS,
      templateOption: (o) => {
        const span = document.createElement('span')
        span.className = 'icon'
        span.textContent = o.label
        return span
      },
    })
    pointerdown($(inst.element, '.selkit__control'))
    expect($(inst.element, '.selkit__option .icon').textContent).toBe('Apple')
  })

  it('meta 帶 index / active / selected', () => {
    const inst = createSelkitDom(host, {
      options: OPTIONS,
      value: 'b',
      templateOption: (o, m) =>
        `${m.index}:${m.active}:${m.selected}:${o.label}`,
    })
    pointerdown($(inst.element, '.selkit__control'))
    const texts = $$(inst.element, '.selkit__option').map((e) => e.textContent)
    // 開啟後 activeIndex 落在已選且可見的項目（Banana, index 1）
    expect(texts[0]).toBe('0:false:false:Apple')
    expect(texts[1]).toBe('1:true:true:Banana')
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

describe('tokenSeparators 自動切 tag', () => {
  it('輸入含分隔符自動切成多個 tag 剩餘回寫輸入框', () => {
    const inst = createSelkitDom(host, {
      options: OPTIONS,
      multiple: true,
      taggable: true,
      createTag: (q) => ({ value: q, label: q }),
      tokenSeparators: [','],
    })
    const input = $(inst.element, '.selkit__input') as HTMLInputElement
    input.value = 'apple,Mango,ba'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    const tags = $$(inst.element, '.selkit__tag').map((t) => t.textContent)
    expect(tags.some((t) => t?.includes('Apple'))).toBe(true)
    expect(tags.some((t) => t?.includes('Mango'))).toBe(true)
    expect(input.value).toBe('ba')
  })
})

describe('可見的建立列 create row', () => {
  const tg = () =>
    createSelkitDom(host, {
      options: OPTIONS,
      multiple: true,
      taggable: true,
      createTag: (q) => ({ value: q, label: q }),
    })

  it('無相符時顯示可點的建立列 點擊建立 tag 並清空輸入', () => {
    const inst = tg()
    pointerdown($(inst.element, '.selkit__control'))
    const input = $(inst.element, '.selkit__input') as HTMLInputElement
    input.value = 'Mango'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    const createRow = $(inst.element, '.selkit__create')
    expect(createRow.textContent).toBe('Add "Mango"')
    pointerdown(createRow)
    expect(inst.controller.getState().selected.map((o) => o.value)).toContain(
      'Mango',
    )
    expect(input.value).toBe('')
  })

  it('精確同名時不顯示建立列', () => {
    const inst = tg()
    pointerdown($(inst.element, '.selkit__control'))
    const input = $(inst.element, '.selkit__input') as HTMLInputElement
    input.value = 'Apple'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    expect($(inst.element, '.selkit__create')).toBeFalsy()
  })

  it('建立列文字可由 messages.create 自訂', () => {
    const inst = createSelkitDom(host, {
      options: OPTIONS,
      multiple: true,
      taggable: true,
      createTag: (q) => ({ value: q, label: q }),
      messages: { create: (q) => `新增「${q}」` },
    })
    pointerdown($(inst.element, '.selkit__control'))
    const input = $(inst.element, '.selkit__input') as HTMLInputElement
    input.value = 'Mango'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    expect($(inst.element, '.selkit__create').textContent).toBe('新增「Mango」')
  })
})

describe('i18n 可自訂訊息', () => {
  it('無結果套用自訂 noResults', () => {
    const inst = createSelkitDom(host, {
      options: OPTIONS,
      messages: { noResults: '查無資料' },
    })
    const input = $(inst.element, '.selkit__input') as HTMLInputElement
    input.value = 'zzz'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    expect($(inst.element, '.selkit__empty').textContent).toBe('查無資料')
  })

  it('未達 minInputLength 顯示自訂提示與剩餘字數', () => {
    const inst = createSelkitDom(host, {
      options: OPTIONS,
      minInputLength: 3,
      messages: { minInputLength: (n) => `再輸入 ${n} 個字` },
    })
    inst.controller.open()
    expect($(inst.element, '.selkit__empty').textContent).toBe('再輸入 3 個字')
    const input = $(inst.element, '.selkit__input') as HTMLInputElement
    input.value = 'ab'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    expect($(inst.element, '.selkit__empty').textContent).toBe('再輸入 1 個字')
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

  it('再點已選項即取消（toggle）', () => {
    const inst = createSelkitDom(host, { options: OPTIONS, multiple: true })
    pointerdown($(inst.element, '.selkit__control'))
    pointerdown($$(inst.element, '.selkit__option')[0]!)
    expect(inst.controller.getState().selected.map((o) => o.value)).toEqual(['a'])
    pointerdown($$(inst.element, '.selkit__option')[0]!)
    expect(inst.controller.getState().selected).toEqual([])
  })
})

describe('checkboxes 多選打勾', () => {
  it('多選 + checkboxes 加上 root modifier class', () => {
    const inst = createSelkitDom(host, {
      options: OPTIONS,
      multiple: true,
      checkboxes: true,
    })
    expect(inst.element.classList.contains('selkit--checkboxes')).toBe(true)
  })

  it('已選選項帶 aria-selected=true 供樣式打勾', () => {
    const inst = createSelkitDom(host, {
      options: OPTIONS,
      multiple: true,
      checkboxes: true,
      value: ['a'],
    })
    pointerdown($(inst.element, '.selkit__control'))
    expect(
      $$(inst.element, '.selkit__option')[0]!.getAttribute('aria-selected'),
    ).toBe('true')
  })

  it('單選時不加 checkboxes class', () => {
    const inst = createSelkitDom(host, { options: OPTIONS, checkboxes: true })
    expect(inst.element.classList.contains('selkit--checkboxes')).toBe(false)
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

describe('dropdownParent 浮層 portal', () => {
  it('下拉掛到指定容器而非元件內', () => {
    const inst = createSelkitDom(host, {
      options: OPTIONS,
      dropdownParent: document.body,
    })
    const dd = document.querySelector('.selkit__dropdown') as HTMLElement
    expect(dd.parentElement).toBe(document.body)
    expect(inst.element.contains(dd)).toBe(false)
  })

  it('portal 下拉帶上 prefix class 讓 CSS 變數能解析', () => {
    const inst = createSelkitDom(host, {
      options: OPTIONS,
      dropdownParent: document.body,
    })
    const dd = document.querySelector('.selkit__dropdown') as HTMLElement
    expect(dd.classList.contains('selkit')).toBe(true)
    inst.destroy()
  })

  it('接受選擇器字串', () => {
    const portal = document.createElement('div')
    portal.id = 'portal'
    document.body.append(portal)
    createSelkitDom(host, { options: OPTIONS, dropdownParent: '#portal' })
    expect(portal.querySelector('.selkit__dropdown')).toBeTruthy()
  })

  it('點 portal 下拉內部不觸發 outside-click 關閉', () => {
    const inst = createSelkitDom(host, {
      options: OPTIONS,
      dropdownParent: document.body,
    })
    inst.controller.open()
    const dd = document.querySelector('.selkit__dropdown') as HTMLElement
    dd.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
    expect(inst.controller.getState().isOpen).toBe(true)
  })

  it('destroy 後從 portal 容器移除下拉', () => {
    const inst = createSelkitDom(host, {
      options: OPTIONS,
      dropdownParent: document.body,
    })
    expect(document.querySelector('.selkit__dropdown')).toBeTruthy()
    inst.destroy()
    expect(document.querySelector('.selkit__dropdown')).toBeFalsy()
  })

  it('找不到選擇器時拋錯', () => {
    expect(() =>
      createSelkitDom(host, { options: OPTIONS, dropdownParent: '#nope' }),
    ).toThrow()
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
