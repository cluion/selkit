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

describe('搜尋命中高亮', () => {
  it('query 命中以 <mark> 標示，整段文字不變', () => {
    const inst = createSelkitDom(host, { options: OPTIONS })
    inst.controller.setQuery('ap')
    const option = $(inst.element, '.selkit__option')
    const mark = option.querySelector('mark.selkit__match') as HTMLElement
    expect(mark.textContent).toBe('Ap')
    expect(option.textContent).toBe('Apple')
  })

  it('highlightMatches: false 時不渲染 mark', () => {
    const inst = createSelkitDom(host, {
      options: OPTIONS,
      highlightMatches: false,
    })
    inst.controller.setQuery('ap')
    expect($(inst.element, '.selkit__option').querySelector('mark')).toBeNull()
  })

  it('含標籤字元的 label 不被當 HTML 解析（防 XSS）', () => {
    const inst = createSelkitDom(host, {
      options: [{ value: 'x', label: '<b>Apple</b>' }],
    })
    inst.controller.setQuery('app')
    const option = $(inst.element, '.selkit__option')
    expect(option.querySelectorAll('b')).toHaveLength(0)
    expect(option.textContent).toBe('<b>Apple</b>')
    const mark = option.querySelector('mark.selkit__match') as HTMLElement
    expect(mark.textContent).toBe('App')
  })
})

describe('多實例互斥', () => {
  it('開第二個時自動關閉第一個', () => {
    const a = createSelkitDom(host, { options: OPTIONS })
    const b = createSelkitDom(host, { options: OPTIONS })
    pointerdown($(a.element, '.selkit__control'))
    expect(a.controller.getState().isOpen).toBe(true)
    pointerdown($(b.element, '.selkit__control'))
    expect(a.controller.getState().isOpen).toBe(false)
    expect(b.controller.getState().isOpen).toBe(true)
  })
})

const COLLAPSE_OPTS: SelkitItem[] = [
  { value: 1, label: 'One' },
  { value: 2, label: 'Two' },
  { value: 3, label: 'Three' },
  { value: 4, label: 'Four' },
]

describe('多選摺疊', () => {
  it('超過 maxSelectedDisplay 顯示前 N + +M', () => {
    const inst = createSelkitDom(host, {
      options: COLLAPSE_OPTS,
      multiple: true,
      value: [1, 2, 3, 4],
      maxSelectedDisplay: 2,
    })
    expect($$(inst.element, '.selkit__tag')).toHaveLength(2)
    expect($(inst.element, '.selkit__more').textContent).toBe('+2')
  })

  it('點 +M 展開全部 改顯示 -M', () => {
    const inst = createSelkitDom(host, {
      options: COLLAPSE_OPTS,
      multiple: true,
      value: [1, 2, 3, 4],
      maxSelectedDisplay: 2,
    })
    pointerdown($(inst.element, '.selkit__more'))
    expect($$(inst.element, '.selkit__tag')).toHaveLength(4)
    expect($(inst.element, '.selkit__more').textContent).toBe('-2')
  })

  it('未達上限不摺疊', () => {
    const inst = createSelkitDom(host, {
      options: COLLAPSE_OPTS,
      multiple: true,
      value: [1, 2],
      maxSelectedDisplay: 5,
    })
    expect($$(inst.element, '.selkit__tag')).toHaveLength(2)
    expect(inst.element.querySelector('.selkit__more')).toBeNull()
  })
})

describe('clear 兩段確認', () => {
  it('clearConfirm 點第一次不清 進入待確認', () => {
    const inst = createSelkitDom(host, {
      options: COLLAPSE_OPTS,
      value: 1,
      clearConfirm: true,
    })
    expect($(inst.element, '.selkit__clear').getAttribute('aria-label')).toBe(
      'Clear',
    )
    pointerdown($(inst.element, '.selkit__clear'))
    expect(inst.controller.getState().selected).toHaveLength(1)
    const confirming = $(inst.element, '.selkit__clear')
    expect(confirming.classList.contains('selkit__clear--confirm')).toBe(true)
    expect(confirming.getAttribute('aria-label')).toBe('Confirm')
  })

  it('待確認時再點才清空', () => {
    const inst = createSelkitDom(host, {
      options: COLLAPSE_OPTS,
      value: 1,
      clearConfirm: true,
    })
    pointerdown($(inst.element, '.selkit__clear'))
    pointerdown($(inst.element, '.selkit__clear'))
    expect(inst.controller.getState().selected).toHaveLength(0)
  })

  it('未開 clearConfirm 點一下即清', () => {
    const inst = createSelkitDom(host, { options: COLLAPSE_OPTS, value: 1 })
    pointerdown($(inst.element, '.selkit__clear'))
    expect(inst.controller.getState().selected).toHaveLength(0)
  })

  it('逾時自動復原', () => {
    vi.useFakeTimers()
    try {
      const inst = createSelkitDom(host, {
        options: COLLAPSE_OPTS,
        value: 1,
        clearConfirm: true,
      })
      pointerdown($(inst.element, '.selkit__clear'))
      vi.advanceTimersByTime(2500)
      expect(
        $(inst.element, '.selkit__clear').classList.contains(
          'selkit__clear--confirm',
        ),
      ).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  it('clearConfirmText 自訂確認文字', () => {
    const inst = createSelkitDom(host, {
      options: COLLAPSE_OPTS,
      value: 1,
      clearConfirm: true,
      clearConfirmText: '確認清空',
    })
    pointerdown($(inst.element, '.selkit__clear'))
    const clear = $(inst.element, '.selkit__clear')
    expect(clear.textContent).toBe('確認清空')
    expect(clear.getAttribute('aria-label')).toBe('確認清空')
  })
})

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

describe('多層分組縮排', () => {
  const NESTED: SelkitItem[] = [
    {
      label: '電子',
      options: [
        { label: '電腦', options: [{ value: 'mbp', label: 'MacBook Pro' }] },
        { value: 'ip15', label: 'iPhone 15' },
      ],
    },
  ]

  it('group 與 option 帶 --selkit-depth 反映層級', () => {
    const inst = createSelkitDom(host, { options: NESTED })
    inst.controller.open()
    const groups = $$(inst.element, '.selkit__group')
    const options = $$(inst.element, '.selkit__option')
    expect(groups.map((g) => g.style.getPropertyValue('--selkit-depth'))).toEqual([
      '0',
      '1',
    ])
    expect(options.map((o) => o.style.getPropertyValue('--selkit-depth'))).toEqual([
      '2',
      '1',
    ])
  })

  it('搜尋深層命中保留祖先標頭', () => {
    const inst = createSelkitDom(host, { options: NESTED })
    inst.controller.open()
    inst.controller.setQuery('pro')
    expect($$(inst.element, '.selkit__group').map((g) => g.textContent)).toEqual([
      '電子',
      '電腦',
    ])
    expect($$(inst.element, '.selkit__option').length).toBe(1)
  })
})

describe('樹狀模式 tree', () => {
  const TREE: SelkitItem[] = [
    {
      label: '電子',
      value: 'elec',
      children: [
        { value: 'pc', label: '電腦', children: [{ value: 'mbp', label: 'MacBook Pro' }] },
      ],
    },
  ]

  it('渲染 treeitem 帶展開箭頭與 depth', () => {
    const inst = createSelkitDom(host, { options: TREE })
    inst.controller.open()
    const items = $$(inst.element, '.selkit__treeitem')
    expect(items.map((el) => el.style.getPropertyValue('--selkit-depth'))).toEqual([
      '0',
      '1',
      '2',
    ])
    expect($(inst.element, '.selkit__toggle[data-toggle]')).toBeTruthy()
    expect(items[0]!.getAttribute('aria-expanded')).toBe('true')
  })

  it('點擊展開箭頭收合父', () => {
    const inst = createSelkitDom(host, { options: TREE })
    inst.controller.open()
    const toggle = $(inst.element, '.selkit__toggle[data-toggle]') as HTMLElement
    pointerdown(toggle)
    expect($$(inst.element, '.selkit__treeitem').length).toBe(1)
    expect($(inst.element, '.selkit__treeitem').getAttribute('aria-expanded')).toBe(
      'false',
    )
  })

  it('父可選（cascade 勾子孫葉）', () => {
    const inst = createSelkitDom(host, { options: TREE, multiple: true })
    inst.controller.open()
    pointerdown($$(inst.element, '.selkit__treeitem')[0]!)
    expect(inst.controller.getState().selected.map((o) => o.value)).toEqual(['mbp'])
  })
})

describe('樹狀模式 cascade', () => {
  const TREE: SelkitItem[] = [
    {
      value: 'elec',
      label: '電子',
      children: [
        {
          value: 'pc',
          label: '電腦',
          children: [
            { value: 'mbp', label: 'MacBook Pro' },
            { value: 'mba', label: 'MacBook Air' },
          ],
        },
        { value: 'ip15', label: 'iPhone 15' },
      ],
    },
  ]

  it('select(父) → 全部 checkbox checked', () => {
    const inst = createSelkitDom(host, { options: TREE, multiple: true })
    inst.controller.open()
    pointerdown($$(inst.element, '.selkit__treeitem')[0]!)
    const cbs = $$(inst.element, '.selkit__checkbox')
    expect(cbs.length).toBeGreaterThan(0)
    expect(cbs.every((c) => c.className.includes('--checked'))).toBe(true)
  })

  it('半選 → 父 checkbox mixed', () => {
    const inst = createSelkitDom(host, { options: TREE, multiple: true })
    inst.controller.open()
    const mbp = $$(inst.element, '.selkit__treeitem').find((el) =>
      el.textContent?.includes('MacBook Pro'),
    )!
    pointerdown(mbp)
    const elec = $$(inst.element, '.selkit__treeitem')[0]!
    expect(elec.querySelector('.selkit__checkbox')?.className).toContain('--mixed')
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

describe('可換元件 template* 自訂結構零件', () => {
  const GROUPED: SelkitItem[] = [
    { label: 'Fruit', options: [{ value: 'a', label: 'Apple' }] },
  ]

  it('templateArrow 覆寫箭頭內容並帶 open meta', () => {
    const inst = createSelkitDom(host, {
      options: OPTIONS,
      templateArrow: (m) => (m.open ? 'OPEN' : 'CLOSED'),
    })
    expect($(inst.element, '.selkit__arrow').textContent).toBe('CLOSED')
    pointerdown($(inst.element, '.selkit__control'))
    expect($(inst.element, '.selkit__arrow').textContent).toBe('OPEN')
  })

  it('templateArrow 回傳 Node', () => {
    const inst = createSelkitDom(host, {
      options: OPTIONS,
      templateArrow: () => {
        const i = document.createElement('i')
        i.className = 'chevron'
        return i
      },
    })
    expect($(inst.element, '.selkit__arrow .chevron')).toBeTruthy()
  })

  it('templateClear 覆寫清除鈕內容 點擊仍清除', () => {
    const inst = createSelkitDom(host, {
      options: OPTIONS,
      value: 'a',
      templateClear: () => '✗',
    })
    const clear = $(inst.element, '.selkit__clear')
    expect(clear.textContent).toBe('✗')
    pointerdown(clear)
    expect(inst.controller.getState().selected).toEqual([])
  })

  it('templateTagRemove 覆寫移除鈕內容 點擊仍刪 tag 並帶 meta', () => {
    const seen: number[] = []
    const inst = createSelkitDom(host, {
      options: OPTIONS,
      multiple: true,
      value: ['a', 'b'],
      templateTagRemove: (_o, m) => {
        seen.push(m.index)
        return 'del'
      },
    })
    expect(seen).toEqual([0, 1])
    const remove = $$(inst.element, '.selkit__tag-remove')[0]!
    expect(remove.textContent).toBe('del')
    pointerdown(remove)
    expect(inst.controller.getState().selected.map((o) => o.value)).toEqual(['b'])
  })

  it('templateGroup 覆寫分組標題內容並帶 meta', () => {
    const inst = createSelkitDom(host, {
      options: GROUPED,
      templateGroup: (m) => `# ${m.label}`,
    })
    pointerdown($(inst.element, '.selkit__control'))
    expect($(inst.element, '.selkit__group').textContent).toBe('# Fruit')
  })

  it('templateEmpty no-results：reason 與預設 message 傳入', () => {
    const seen: Array<{ reason: string; message: string; query: string }> = []
    const inst = createSelkitDom(host, {
      options: OPTIONS,
      templateEmpty: (m) => {
        seen.push({ reason: m.reason, message: m.message, query: m.query })
        return `自訂：${m.message}`
      },
    })
    const input = $(inst.element, '.selkit__input') as HTMLInputElement
    input.value = 'zzz'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    expect($(inst.element, '.selkit__empty').textContent).toBe('自訂：No results')
    expect(seen.at(-1)).toEqual({
      reason: 'no-results',
      message: 'No results',
      query: 'zzz',
    })
  })

  it('templateEmpty min-input：reason 為 min-input', () => {
    const inst = createSelkitDom(host, {
      options: OPTIONS,
      minInputLength: 3,
      templateEmpty: (m) => m.reason,
    })
    pointerdown($(inst.element, '.selkit__control'))
    expect($(inst.element, '.selkit__empty').textContent).toBe('min-input')
  })
})

describe('作用中選項捲入視窗 scrollIntoView', () => {
  const many = Array.from({ length: 100 }, (_, i) => ({
    value: i,
    label: `Item ${i}`,
  }))

  it('鍵盤導航時對作用中選項呼叫 scrollIntoView({ block: nearest })', () => {
    const spy = vi.fn()
    // jsdom 未實作 scrollIntoView 補上以便偵測呼叫
    ;(Element.prototype as unknown as { scrollIntoView: unknown }).scrollIntoView = spy
    const inst = createSelkitDom(host, { options: OPTIONS })
    pointerdown($(inst.element, '.selkit__control'))
    spy.mockClear()
    keydown($(inst.element, '.selkit__control'), 'ArrowDown')
    expect(spy).toHaveBeenCalledWith({ block: 'nearest' })
  })

  it('手動捲動下拉不會觸發 scrollIntoView（不跟使用者打架）', () => {
    const spy = vi.fn()
    ;(Element.prototype as unknown as { scrollIntoView: unknown }).scrollIntoView = spy
    const inst = createSelkitDom(host, { options: OPTIONS })
    pointerdown($(inst.element, '.selkit__control'))
    keydown($(inst.element, '.selkit__control'), 'ArrowDown')
    spy.mockClear()
    $(inst.element, '.selkit__dropdown').dispatchEvent(new Event('scroll'))
    expect(spy).not.toHaveBeenCalled()
  })

  it('虛擬捲動：導航到視窗外的作用列會調整 scrollTop', () => {
    const inst = createSelkitDom(host, {
      options: many,
      virtualScroll: true,
      itemHeight: 20,
      optionGap: 0,
    })
    const dropdown = $(inst.element, '.selkit__dropdown')
    // jsdom 無 layout 會夾 scrollTop 且 clientHeight=0；自行接管以觀察計算結果
    let scrollTop = 0
    Object.defineProperty(dropdown, 'scrollTop', {
      configurable: true,
      get: () => scrollTop,
      set: (v: number) => {
        scrollTop = v
      },
    })
    Object.defineProperty(dropdown, 'clientHeight', {
      configurable: true,
      value: 100,
    })

    pointerdown($(inst.element, '.selkit__control'))
    // 開啟時作用列為 index 0，落在可視區（0~100）內 → 不捲
    expect(scrollTop).toBe(0)
    keydown($(inst.element, '.selkit__control'), 'End') // 跳到 index 99（視窗外）
    // index 99：itemBottom=2000 超出可視底 → 對齊底 2000-100 = 1900
    expect(scrollTop).toBe(1900)
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

describe('autogrow 輸入框寬度', () => {
  it('未啟用時不設 size', () => {
    const inst = createSelkitDom(host, { options: OPTIONS })
    expect(($(inst.element, '.selkit__input') as HTMLInputElement).getAttribute('size')).toBeNull()
  })

  it('啟用時 size 隨輸入字數變化並加 root class', () => {
    const inst = createSelkitDom(host, { options: OPTIONS, autogrow: true })
    expect(inst.element.classList.contains('selkit--autogrow')).toBe(true)
    const input = $(inst.element, '.selkit__input') as HTMLInputElement
    input.value = 'abcd'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    expect(input.size).toBe(4)
  })
})

describe('dropdownAutoWidth 下拉寬度', () => {
  it('加 root class 並以 min-width 取代固定寬度', () => {
    const inst = createSelkitDom(host, {
      options: OPTIONS,
      dropdownAutoWidth: true,
    })
    expect(inst.element.classList.contains('selkit--auto-width')).toBe(true)
    inst.controller.open()
    const dd = $(inst.element, '.selkit__dropdown')
    expect(dd.style.minWidth).not.toBe('')
    expect(dd.style.width).toBe('max-content')
  })

  it('未啟用時下拉以固定 px 寬度', () => {
    const inst = createSelkitDom(host, { options: OPTIONS })
    inst.controller.open()
    const dd = $(inst.element, '.selkit__dropdown')
    expect(dd.style.width.endsWith('px')).toBe(true)
  })
})

describe('sorter 自訂排序', () => {
  it('依 sorter 反向排序渲染選項', () => {
    const inst = createSelkitDom(host, {
      options: OPTIONS,
      sorter: (a, b) => b.label.localeCompare(a.label),
    })
    pointerdown($(inst.element, '.selkit__control'))
    const labels = $$(inst.element, '.selkit__option').map((o) => o.textContent)
    expect(labels).toEqual(['Cherry', 'Banana', 'Apple'])
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

  it('空輸入 Backspace 刪最後一個 tag', () => {
    const inst = createSelkitDom(host, {
      options: OPTIONS,
      multiple: true,
      value: ['a', 'b'],
    })
    keydown($(inst.element, '.selkit__control'), 'Backspace')
    expect(inst.controller.getState().selected.map((o) => o.value)).toEqual(['a'])
  })

  it('restoreOnBackspace 把刪除的 label 回填輸入框', () => {
    const inst = createSelkitDom(host, {
      options: OPTIONS,
      multiple: true,
      value: ['a', 'b'],
      restoreOnBackspace: true,
    })
    keydown($(inst.element, '.selkit__control'), 'Backspace')
    expect(inst.controller.getState().selected.map((o) => o.value)).toEqual(['a'])
    expect(($(inst.element, '.selkit__input') as HTMLInputElement).value).toBe(
      'Banana',
    )
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

describe('aria-live 公告', () => {
  it('掛載 polite live region', () => {
    const inst = createSelkitDom(host, { options: OPTIONS })
    const live = $(inst.element, '.selkit__live')
    expect(live).toBeTruthy()
    expect(live.getAttribute('aria-live')).toBe('polite')
    expect(live.getAttribute('role')).toBe('status')
  })

  it('選取後寫入公告文字', () => {
    const inst = createSelkitDom(host, { options: OPTIONS, multiple: true })
    pointerdown($(inst.element, '.selkit__control'))
    pointerdown($$(inst.element, '.selkit__option')[0]!)
    expect($(inst.element, '.selkit__live').textContent).toBe('Apple selected')
  })

  it('搜尋後公告結果數', () => {
    const inst = createSelkitDom(host, { options: OPTIONS })
    const input = $(inst.element, '.selkit__input') as HTMLInputElement
    input.value = 'Banana'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    expect($(inst.element, '.selkit__live').textContent).toBe(
      '1 result available',
    )
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

  const bigGrouped: SelkitItem[] = [
    {
      label: 'A',
      options: Array.from({ length: 50 }, (_, i) => ({
        value: `a${i}`,
        label: `A ${i}`,
      })),
    },
    {
      label: 'B',
      options: Array.from({ length: 50 }, (_, i) => ({
        value: `b${i}`,
        label: `B ${i}`,
      })),
    },
  ]

  it('分組 + 虛擬：只渲染切片（含 group header）', () => {
    const inst = createSelkitDom(host, {
      options: bigGrouped,
      virtualScroll: true,
      itemHeight: 36,
      groupHeight: 28,
      optionGap: 0,
    })
    inst.controller.open()
    const opts = $$(inst.element, '.selkit__option')
    expect(opts.length).toBeGreaterThan(0)
    expect(opts.length).toBeLessThan(100) // 沒有整份渲染
    expect($(inst.element, '.selkit__group')).toBeTruthy() // 切片含標題
  })

  it('分組 + 虛擬：導航到視窗外的作用列會調整 scrollTop（用變高累積）', () => {
    const inst = createSelkitDom(host, {
      options: bigGrouped,
      virtualScroll: true,
      itemHeight: 36,
      groupHeight: 28,
      optionGap: 0,
    })
    const dropdown = $(inst.element, '.selkit__dropdown')
    let scrollTop = 0
    Object.defineProperty(dropdown, 'scrollTop', {
      configurable: true,
      get: () => scrollTop,
      set: (v: number) => {
        scrollTop = v
      },
    })
    Object.defineProperty(dropdown, 'clientHeight', {
      configurable: true,
      value: 100,
    })
    pointerdown($(inst.element, '.selkit__control'))
    expect(scrollTop).toBe(0) // 開啟時作用列在頂端可視內
    keydown($(inst.element, '.selkit__control'), 'End') // 跳到最後一個 option（視窗外）
    expect(scrollTop).toBeGreaterThan(0)
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
    expect(loadOptions).toHaveBeenLastCalledWith(
      'o',
      2,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
  })
})

describe('resolveSelected — 回顯渲染', () => {
  const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0))

  it('初始 value 以 resolveSelected 回顯 label 並切換 --resolving class', async () => {
    const inst = createSelkitDom(host, {
      options: [],
      value: 'x',
      resolveSelected: async () => [{ value: 'x', label: 'Label-x' }],
    })
    const root = inst.element
    // resolving 中：fallback label + --resolving class
    expect(root.className).toContain('selkit--resolving')
    expect($(root, '.selkit__single-value').textContent).toBe('x')
    await flush()
    // 完成：正確 label + class 移除
    expect(root.className).not.toContain('selkit--resolving')
    expect($(root, '.selkit__single-value').textContent).toBe('Label-x')
  })
})
