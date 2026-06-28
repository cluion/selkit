import { describe, expect, it, vi } from 'vitest'
import { createSelkit } from './createSelkit'
import { hasTree, normalize, normalizeTree } from './utils'
import type { SelkitItem } from './types'

const OPTIONS: SelkitItem[] = [
  { value: 'a', label: 'Apple' },
  { value: 'b', label: 'Banana' },
  { value: 'c', label: 'Cherry', disabled: true },
  { value: 'd', label: 'Date' },
]

describe('createSelkit — 初始狀態', () => {
  it('預設為關閉、無選取、全部可見', () => {
    const s = createSelkit({ options: OPTIONS })
    const st = s.getState()
    expect(st.isOpen).toBe(false)
    expect(st.selected).toEqual([])
    expect(st.visibleOptions).toHaveLength(4)
    expect(st.activeIndex).toBe(-1)
    expect(st.noResults).toBe(false)
  })

  it('空選項時 noResults 為 true', () => {
    expect(createSelkit({ options: [] }).getState().noResults).toBe(true)
  })

  it('套用初始 value（單選）', () => {
    const s = createSelkit({ options: OPTIONS, value: 'b' })
    expect(s.getState().selected.map((o) => o.value)).toEqual(['b'])
  })

  it('套用初始 value（多選）', () => {
    const s = createSelkit({ options: OPTIONS, multiple: true, value: ['a', 'd'] })
    expect(s.getState().selected.map((o) => o.value)).toEqual(['a', 'd'])
  })
})

describe('開關', () => {
  it('open / close / toggle 並觸發事件', () => {
    const s = createSelkit({ options: OPTIONS })
    const onOpen = vi.fn()
    const onClose = vi.fn()
    s.on('open', onOpen)
    s.on('close', onClose)

    s.open()
    expect(s.getState().isOpen).toBe(true)
    expect(onOpen).toHaveBeenCalledOnce()

    s.toggle()
    expect(s.getState().isOpen).toBe(false)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('open 時 highlight 落在第一個可用選項', () => {
    const s = createSelkit({ options: OPTIONS })
    s.open()
    expect(s.getState().activeIndex).toBe(0)
  })

  it('停用時無法開啟', () => {
    const s = createSelkit({ options: OPTIONS, disabled: true })
    s.open()
    expect(s.getState().isOpen).toBe(false)
  })
})

describe('搜尋命中高亮', () => {
  it('預設開啟 — 依 query 高亮命中片段', () => {
    const s = createSelkit({ options: OPTIONS })
    s.setQuery('ap')
    expect(s.highlightLabel('Apple')).toEqual([
      { text: 'Ap', match: true },
      { text: 'ple', match: false },
    ])
  })

  it('highlightMatches: false 時整段不 match', () => {
    const s = createSelkit({ options: OPTIONS, highlightMatches: false })
    s.setQuery('ap')
    expect(s.highlightLabel('Apple')).toEqual([
      { text: 'Apple', match: false },
    ])
  })

  it('query 為空時整段不 match', () => {
    const s = createSelkit({ options: OPTIONS })
    expect(s.highlightLabel('Apple')).toEqual([
      { text: 'Apple', match: false },
    ])
  })

  it('fuzzy 模式標子序列命中的字元', () => {
    const s = createSelkit({ options: OPTIONS, fuzzy: true })
    s.setQuery('ae')
    expect(s.highlightLabel('Apple')).toEqual([
      { text: 'A', match: true },
      { text: 'ppl', match: false },
      { text: 'e', match: true },
    ])
  })

  it('去變音符（café ↔ cafe）', () => {
    const s = createSelkit({ options: [{ value: 'x', label: 'café' }] })
    s.setQuery('cafe')
    expect(s.highlightLabel('café')).toEqual([
      { text: 'café', match: true },
    ])
  })
})

describe('搜尋過濾', () => {
  it('setQuery 依 label 過濾（大小寫不敏感）', () => {
    const s = createSelkit({ options: OPTIONS })
    s.setQuery('an')
    expect(s.getState().visibleOptions.map((o) => o.value)).toEqual(['b']) // Banana
  })

  it('無相符時 noResults 為 true', () => {
    const s = createSelkit({ options: OPTIONS })
    s.setQuery('zzz')
    expect(s.getState().visibleOptions).toHaveLength(0)
    expect(s.getState().noResults).toBe(true)
  })

  it('觸發 search 事件', () => {
    const s = createSelkit({ options: OPTIONS })
    const onSearch = vi.fn()
    s.on('search', onSearch)
    s.setQuery('a')
    expect(onSearch).toHaveBeenCalledWith({ query: 'a' })
  })
})

describe('sorter 自訂結果排序', () => {
  it('依 label 字母排序整個清單（空查詢）', () => {
    const s = createSelkit({
      options: OPTIONS,
      sorter: (a, b) => a.label.localeCompare(b.label),
    })
    // 原序 Apple, Banana, Cherry, Date → 字母序相同；用反向驗證
    const r = createSelkit({
      options: OPTIONS,
      sorter: (a, b) => b.label.localeCompare(a.label),
    })
    expect(r.getState().visibleOptions.map((o) => o.value)).toEqual([
      'd',
      'c',
      'b',
      'a',
    ])
    expect(s.getState().visibleOptions.map((o) => o.value)).toEqual([
      'a',
      'b',
      'c',
      'd',
    ])
  })

  it('相關度排序：label 以 query 開頭者優先', () => {
    const opts = [
      { value: 1, label: 'Pineapple' },
      { value: 2, label: 'Apple' },
      { value: 3, label: 'Crabapple' },
    ]
    const startsFirst = (a: { label: string }, b: { label: string }, q: string) => {
      const sa = a.label.toLowerCase().startsWith(q.toLowerCase()) ? 0 : 1
      const sb = b.label.toLowerCase().startsWith(q.toLowerCase()) ? 0 : 1
      return sa - sb
    }
    const s = createSelkit({ options: opts, sorter: startsFirst })
    s.setQuery('apple') // 全部都含 apple
    // 以 apple 開頭的 Apple 應排最前
    expect(s.getState().visibleOptions[0]!.value).toBe(2)
  })

  it('getGroupedView 反映排序順序（扁平）', () => {
    const s = createSelkit({
      options: OPTIONS,
      sorter: (a, b) => b.label.localeCompare(a.label),
    })
    const optionRows = s
      .getGroupedView()
      .rows.filter((r) => r.type === 'option')
    expect(optionRows.map((r) => (r as { option: { value: unknown } }).option.value)).toEqual(
      ['d', 'c', 'b', 'a'],
    )
    // index 對齊排序後的 visibleOptions
    expect(optionRows.map((r) => (r as { index: number }).index)).toEqual([
      0, 1, 2, 3,
    ])
  })

  it('分組時忽略 sorter（保留原組序）', () => {
    const grouped = [
      { label: 'G1', options: [{ value: 'a', label: 'Apple' }] },
      { label: 'G2', options: [{ value: 'b', label: 'Banana' }] },
    ]
    const s = createSelkit({
      options: grouped,
      sorter: (a, b) => b.label.localeCompare(a.label),
    })
    expect(s.getState().visibleOptions.map((o) => o.value)).toEqual(['a', 'b'])
  })
})

describe('多層分組（縮排階層）', () => {
  const NESTED: SelkitItem[] = [
    {
      label: '電子',
      options: [
        {
          label: '電腦',
          options: [
            { value: 'mbp', label: 'MacBook Pro' },
            { value: 'mba', label: 'MacBook Air' },
          ],
        },
        { value: 'ip15', label: 'iPhone 15' },
      ],
    },
    { label: '服裝', options: [{ value: 'tee', label: 'T-shirt' }] },
  ]

  const tag = (r: Record<string, unknown>) =>
    'option' in r
      ? `O${r.depth}:${(r as { option: { value: string } }).option.value}`
      : `G${r.depth}:${r.label as string}`

  it('normalize 遞迴攤平並標註每列 depth', () => {
    const { rows, flat } = normalize(NESTED)
    expect(rows.map((r) => tag(r as never))).toEqual([
      'G0:電子',
      'G1:電腦',
      'O2:mbp',
      'O2:mba',
      'O1:ip15',
      'G0:服裝',
      'O1:tee',
    ])
    expect(flat.map((o) => o.value)).toEqual(['mbp', 'mba', 'ip15', 'tee'])
  })

  it('分組 disabled 向下傳遞到所有子孫', () => {
    const { flat } = normalize([
      {
        label: 'G',
        disabled: true,
        options: [{ label: 'Sub', options: [{ value: 'x', label: 'X' }] }],
      },
    ])
    expect(flat[0]!.disabled).toBe(true)
  })

  it('getGroupedView 帶出每列 depth（未搜尋）', () => {
    const s = createSelkit({ options: NESTED })
    expect(s.getGroupedView().rows.map((r) => tag(r as never))).toEqual([
      'G0:電子',
      'G1:電腦',
      'O2:mbp',
      'O2:mba',
      'O1:ip15',
      'G0:服裝',
      'O1:tee',
    ])
  })

  it('搜尋命中深層葉時保留祖先標頭（無命中分支不顯示）', () => {
    const s = createSelkit({ options: NESTED })
    s.setQuery('pro')
    expect(s.getState().visibleOptions.map((o) => o.value)).toEqual(['mbp'])
    expect(s.getGroupedView().rows.map((r) => tag(r as never))).toEqual([
      'G0:電子',
      'G1:電腦',
      'O2:mbp',
    ])
  })

  it('一層舊資料向下相容（group depth 0、option depth 1）', () => {
    const { rows } = normalize([
      { label: '水果', options: [{ value: 'a', label: 'Apple' }] },
    ])
    expect(rows.map((r) => r.depth)).toEqual([0, 1])
  })
})

describe('樹狀模式（normalizeTree）', () => {
  const TREE = [
    {
      value: 'elec',
      label: '電子',
      children: [
        {
          value: 'pc',
          label: '電腦',
          children: [{ value: 'mbp', label: 'MacBook Pro' }],
        },
        { value: 'ip15', label: 'iPhone 15' },
      ],
    },
  ]

  it('正規化為 NormNode 樹（depth + children）', () => {
    const { tree } = normalizeTree(TREE)
    expect(tree).toHaveLength(1)
    const elec = tree[0]!
    expect(elec.option.value).toBe('elec')
    expect(elec.depth).toBe(0)
    expect(elec.children).toHaveLength(2)
    const pc = elec.children[0]!
    expect(pc.depth).toBe(1)
    expect(pc.children[0]!.option.value).toBe('mbp')
    expect(pc.children[0]!.depth).toBe(2)
    expect(elec.children[1]!.children).toEqual([]) // 葉
  })

  it('flat 為 DFS 父＋葉序列', () => {
    const { flat } = normalizeTree(TREE)
    expect(flat.map((o) => o.value)).toEqual(['elec', 'pc', 'mbp', 'ip15'])
  })

  it('disabled 沿祖先鏈向下傳遞', () => {
    const { flat, tree } = normalizeTree([
      { value: 'p', label: 'P', disabled: true, children: [{ value: 'c', label: 'C' }] },
    ])
    expect(flat.find((o) => o.value === 'c')!.disabled).toBe(true)
    expect(tree[0]!.children[0]!.disabled).toBe(true)
  })

  it('hasTree 偵測樹狀資料（option.children 區別於 group）', () => {
    expect(hasTree(TREE)).toBe(true)
    expect(hasTree([{ value: 'a', label: 'A' }])).toBe(false)
    expect(hasTree([{ label: 'G', options: [{ value: 'a', label: 'A' }] }])).toBe(false)
  })
})

describe('樹狀模式（tree）', () => {
  const TREE: SelkitItem[] = [
    {
      value: 'elec',
      label: '電子',
      children: [
        { value: 'pc', label: '電腦', children: [{ value: 'mbp', label: 'MacBook Pro' }] },
        { value: 'ip15', label: 'iPhone 15' },
      ],
    },
  ]

  const tag = (r: Record<string, unknown>) =>
    r.type === 'treeitem'
      ? `T${r.depth}:${(r as { option: { value: string } }).option.value}${
          (r as { hasChildren: boolean }).hasChildren ? '*' : ''
        }`
      : '?'

  it('全展開：getGroupedView 為 treeitem DFS 序列', () => {
    const s = createSelkit({ options: TREE })
    expect(s.getGroupedView().rows.map((r) => tag(r as never))).toEqual([
      'T0:elec*',
      'T1:pc*',
      'T2:mbp',
      'T1:ip15',
    ])
  })

  it('toggleExpanded 收合父 → 子樹不顯示', () => {
    const s = createSelkit({ options: TREE })
    s.toggleExpanded('elec')
    expect(
      s.getGroupedView().rows.map((r) => (r as { option: { value: string } }).option.value),
    ).toEqual(['elec'])
  })

  it('父可選、無 cascade（選父不連動子）', () => {
    const s = createSelkit({ options: TREE, multiple: true })
    s.select('elec')
    expect(s.getState().selected.map((o) => o.value)).toEqual(['elec'])
  })

  it('a11y 父節點為 treeitem + aria-expanded', () => {
    const s = createSelkit({ options: TREE })
    const a = s.a11y()
    expect(a.option(0).role).toBe('treeitem') // elec 父
    expect(a.option(0)['aria-expanded']).toBe(true)
    expect(a.option(2).role).toBe('treeitem') // mbp 葉
    expect(a.option(2)['aria-expanded']).toBeUndefined()
  })
})

describe('單選', () => {
  it('select 取代既有選取並觸發 change', () => {
    const s = createSelkit({ options: OPTIONS })
    const onChange = vi.fn()
    s.on('change', onChange)
    s.select('a')
    s.select('b')
    expect(s.getState().selected.map((o) => o.value)).toEqual(['b'])
    expect(onChange).toHaveBeenLastCalledWith({
      selected: [{ value: 'b', label: 'Banana' }],
      value: 'b',
    })
  })

  it('closeOnSelect 預設為 true，選後關閉', () => {
    const s = createSelkit({ options: OPTIONS })
    s.open()
    s.select('a')
    expect(s.getState().isOpen).toBe(false)
  })

  it('無法選取 disabled 選項', () => {
    const s = createSelkit({ options: OPTIONS })
    s.select('c')
    expect(s.getState().selected).toEqual([])
  })
})

describe('多選', () => {
  it('累加選取，預設選後不關閉', () => {
    const s = createSelkit({ options: OPTIONS, multiple: true })
    s.open()
    s.select('a')
    s.select('b')
    expect(s.getState().selected.map((o) => o.value)).toEqual(['a', 'b'])
    expect(s.getState().isOpen).toBe(true)
  })

  it('toggleSelect 可加可移除', () => {
    const s = createSelkit({ options: OPTIONS, multiple: true })
    s.toggleSelect('a')
    s.toggleSelect('a')
    expect(s.getState().selected).toEqual([])
  })

  it('backspace 刪除最後一個 tag（預設不回填）', () => {
    const s = createSelkit({ options: OPTIONS, multiple: true, value: ['a', 'b'] })
    s.backspace()
    expect(s.getState().selected.map((o) => o.value)).toEqual(['a'])
    expect(s.getState().query).toBe('')
  })

  it('restoreOnBackspace 刪除最後一個 tag 並回填 label 至 query', () => {
    const s = createSelkit({
      options: OPTIONS,
      multiple: true,
      value: ['a', 'b'],
      restoreOnBackspace: true,
    })
    s.backspace()
    expect(s.getState().selected.map((o) => o.value)).toEqual(['a'])
    expect(s.getState().query).toBe('Banana')
    expect(s.getState().isOpen).toBe(true)
  })

  it('query 非空時 backspace 不動作（讓一般刪字生效）', () => {
    const s = createSelkit({ options: OPTIONS, multiple: true, value: ['a'] })
    s.setQuery('x')
    s.backspace()
    expect(s.getState().selected.map((o) => o.value)).toEqual(['a'])
  })

  it('無已選時 backspace 無作用', () => {
    const s = createSelkit({ options: OPTIONS, multiple: true })
    s.backspace()
    expect(s.getState().selected).toEqual([])
  })

  it('單選 backspace 不動作', () => {
    const s = createSelkit({ options: OPTIONS, value: 'a' })
    s.backspace()
    expect(s.getState().selected.map((o) => o.value)).toEqual(['a'])
  })

  it('maxSelections 達上限後不再加入', () => {
    const s = createSelkit({ options: OPTIONS, multiple: true, maxSelections: 1 })
    s.select('a')
    s.select('b')
    expect(s.getState().selected.map((o) => o.value)).toEqual(['a'])
  })

  it('value 為陣列', () => {
    const s = createSelkit({ options: OPTIONS, multiple: true })
    const onChange = vi.fn()
    s.on('change', onChange)
    s.select('a')
    expect(onChange).toHaveBeenLastCalledWith({
      selected: [{ value: 'a', label: 'Apple' }],
      value: ['a'],
    })
  })
})

describe('highlight 移動（不 wrap、跳過 disabled）', () => {
  it('moveActive 跳過 disabled 選項', () => {
    const s = createSelkit({ options: OPTIONS })
    s.open() // active = 0 (Apple)
    s.moveActive(1) // -> 1 (Banana)
    s.moveActive(1) // 跳過 2 (Cherry disabled) -> 3 (Date)
    expect(s.getState().activeIndex).toBe(3)
  })

  it('到底不 wrap', () => {
    const s = createSelkit({ options: OPTIONS })
    s.open()
    s.moveActiveToEnd() // -> 3
    s.moveActive(1) // 已到底，維持
    expect(s.getState().activeIndex).toBe(3)
  })

  it('到頂不 wrap', () => {
    const s = createSelkit({ options: OPTIONS })
    s.open() // active = 0
    s.moveActive(-1) // 已到頂，維持
    expect(s.getState().activeIndex).toBe(0)
  })

  it('moveActiveToStart / End 落在可用選項', () => {
    const s = createSelkit({ options: OPTIONS })
    s.open()
    s.moveActiveToEnd()
    expect(s.getState().activeIndex).toBe(3)
    s.moveActiveToStart()
    expect(s.getState().activeIndex).toBe(0)
  })

  it('selectActive 選取目前 highlight', () => {
    const s = createSelkit({ options: OPTIONS, multiple: true })
    s.open()
    s.moveActive(1) // Banana
    s.selectActive()
    expect(s.getState().selected.map((o) => o.value)).toEqual(['b'])
  })

  it('多選 selectActive 對已選項目再觸發即取消（toggle）', () => {
    const s = createSelkit({ options: OPTIONS, multiple: true })
    s.open()
    s.moveActive(1) // Banana
    s.selectActive() // 選取
    s.selectActive() // 再次 → 取消
    expect(s.getState().selected).toEqual([])
  })

  it('單選 selectActive 不 toggle（再觸發維持選取）', () => {
    const s = createSelkit({ options: OPTIONS })
    s.open()
    s.selectActive() // Apple
    s.open()
    s.selectActive()
    expect(s.getState().selected.map((o) => o.value)).toEqual(['a'])
  })
})

describe('clear / 動態更新', () => {
  it('clear 清空選取', () => {
    const s = createSelkit({ options: OPTIONS, multiple: true, value: ['a', 'b'] })
    s.clear()
    expect(s.getState().selected).toEqual([])
  })

  it('setOptions 替換選項並重算可見', () => {
    const s = createSelkit({ options: OPTIONS })
    s.setOptions([{ value: 'x', label: 'Xenon' }])
    expect(s.getState().visibleOptions.map((o) => o.value)).toEqual(['x'])
  })

  it('setDisabled(true) 會關閉開啟中的下拉', () => {
    const s = createSelkit({ options: OPTIONS })
    s.open()
    s.setDisabled(true)
    expect(s.getState().disabled).toBe(true)
    expect(s.getState().isOpen).toBe(false)
  })
})

describe('aria-live 公告 announce', () => {
  const capture = (s: ReturnType<typeof createSelkit>) => {
    const msgs: string[] = []
    s.on('announce', (p) => msgs.push(p.message))
    return msgs
  }

  it('選取觸發 selected 公告', () => {
    const s = createSelkit({ options: OPTIONS, multiple: true })
    const msgs = capture(s)
    s.select('a')
    expect(msgs).toContain('Apple selected')
  })

  it('取消選取觸發 removed 公告', () => {
    const s = createSelkit({ options: OPTIONS, multiple: true, value: ['a'] })
    const msgs = capture(s)
    s.deselect('a')
    expect(msgs).toContain('Apple removed')
  })

  it('clear 觸發 cleared 公告', () => {
    const s = createSelkit({ options: OPTIONS, multiple: true, value: ['a', 'b'] })
    const msgs = capture(s)
    s.clear()
    expect(msgs).toContain('Selection cleared')
  })

  it('開啟後搜尋公告結果數（複數）', () => {
    const s = createSelkit({ options: OPTIONS })
    const msgs = capture(s)
    s.open()
    s.setQuery('a') // Apple / Banana / Date
    expect(msgs).toContain('3 results available')
  })

  it('結果為 1 用單數', () => {
    const s = createSelkit({ options: OPTIONS })
    const msgs = capture(s)
    s.open()
    s.setQuery('Banana')
    expect(msgs).toContain('1 result available')
  })

  it('搜尋無相符公告 No results available', () => {
    const s = createSelkit({ options: OPTIONS })
    const msgs = capture(s)
    s.open()
    s.setQuery('zzz')
    expect(msgs).toContain('No results available')
  })

  it('未開啟時不公告結果數', () => {
    const s = createSelkit({ options: OPTIONS })
    const msgs = capture(s)
    s.setQuery('a')
    expect(msgs).toEqual([])
  })

  it('公告文字可自訂 (i18n)', () => {
    const s = createSelkit({
      options: OPTIONS,
      multiple: true,
      messages: { selected: (l) => `已選 ${l}` },
    })
    const msgs = capture(s)
    s.select('a')
    expect(msgs).toContain('已選 Apple')
  })
})

describe('subscribe', () => {
  it('狀態變更時通知，unsubscribe 後停止', () => {
    const s = createSelkit({ options: OPTIONS })
    const listener = vi.fn()
    const unsub = s.subscribe(listener)
    s.open()
    expect(listener).toHaveBeenCalled()
    unsub()
    listener.mockClear()
    s.close()
    expect(listener).not.toHaveBeenCalled()
  })
})

describe('a11y', () => {
  it('trigger / listbox 屬性', () => {
    const s = createSelkit({ options: OPTIONS, multiple: true })
    s.open()
    const a = s.a11y()
    expect(a.trigger.role).toBe('combobox')
    expect(a.trigger['aria-expanded']).toBe(true)
    expect(a.trigger['aria-activedescendant']).toBe(a.listbox.id.replace('-listbox', '-opt-0'))
    expect(a.listbox['aria-multiselectable']).toBe(true)
  })

  it('option 屬性反映 selected / disabled', () => {
    const s = createSelkit({ options: OPTIONS, value: 'a' })
    const a = s.a11y()
    expect(a.option(0)['aria-selected']).toBe(true)
    expect(a.option(2)['aria-disabled']).toBe(true) // Cherry
  })
})

describe('getGroupedView', () => {
  const GROUPED: SelkitItem[] = [
    { label: 'Fruit', options: [{ value: 'a', label: 'Apple' }, { value: 'b', label: 'Banana' }] },
    { label: 'Veg', options: [{ value: 'c', label: 'Carrot' }] },
  ]

  it('輸出分組標頭與選項交錯，index 對齊 visibleOptions', () => {
    const s = createSelkit({ options: GROUPED })
    const view = s.getGroupedView()
    expect(view.rows).toEqual([
      { type: 'group', label: 'Fruit', depth: 0 },
      { type: 'option', index: 0, option: { value: 'a', label: 'Apple' }, depth: 1 },
      { type: 'option', index: 1, option: { value: 'b', label: 'Banana' }, depth: 1 },
      { type: 'group', label: 'Veg', depth: 0 },
      { type: 'option', index: 2, option: { value: 'c', label: 'Carrot' }, depth: 1 },
    ])
  })

  it('過濾後只保留有可見選項的分組', () => {
    const s = createSelkit({ options: GROUPED })
    s.setQuery('carrot')
    const view = s.getGroupedView()
    expect(view.rows).toEqual([
      { type: 'group', label: 'Veg', depth: 0 },
      { type: 'option', index: 0, option: { value: 'c', label: 'Carrot' }, depth: 1 },
    ])
  })
})

describe('非同步 loadOptions', () => {
  const remote: SelkitItem[] = [
    { value: 'x', label: 'Xenon' },
    { value: 'y', label: 'Yttrium' },
  ]

  it('debounce 後才呼叫 loadOptions 並更新可見選項', async () => {
    vi.useFakeTimers()
    const loadOptions = vi.fn(async () => remote)
    const s = createSelkit({ loadOptions, debounce: 100 })
    s.open()
    s.setQuery('xy')
    expect(s.getState().query).toBe('xy')
    expect(loadOptions).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(100)
    expect(loadOptions).toHaveBeenCalledWith(
      'xy',
      1,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
    expect(s.getState().visibleOptions.map((o) => o.value)).toEqual(['x', 'y'])
    expect(s.getState().loading).toBe(false)
    vi.useRealTimers()
  })

  it('載入時 loading 為 true 並觸發 load:start / load:end', async () => {
    vi.useFakeTimers()
    const loadOptions = vi.fn(async () => remote)
    const s = createSelkit({ loadOptions, debounce: 0 })
    const start = vi.fn()
    const end = vi.fn()
    s.on('load:start', start)
    s.on('load:end', end)
    s.setQuery('x')
    await vi.advanceTimersByTimeAsync(0)
    expect(start).toHaveBeenCalledWith({ query: 'x' })
    expect(end).toHaveBeenCalledWith({ options: remote })
    vi.useRealTimers()
  })

  it('連續查詢只保留最後一次結果', async () => {
    vi.useFakeTimers()
    const loadOptions = vi.fn(async (q: string) =>
      q === 'fast'
        ? [{ value: 'new', label: 'New' }]
        : [{ value: 'old', label: 'Old' }],
    )
    const s = createSelkit({ loadOptions, debounce: 50 })
    s.setQuery('slow')
    s.setQuery('fast')
    await vi.advanceTimersByTimeAsync(50)
    expect(loadOptions).toHaveBeenCalledTimes(1)
    expect(s.getState().visibleOptions.map((o) => o.value)).toEqual(['new'])
    vi.useRealTimers()
  })

  it('filterRemote 為 true 時對遠端結果再套本地過濾', async () => {
    vi.useFakeTimers()
    const loadOptions = vi.fn(async () => remote)
    const s = createSelkit({ loadOptions, debounce: 0, filterRemote: true })
    s.setQuery('xen')
    await vi.advanceTimersByTimeAsync(0)
    expect(s.getState().visibleOptions.map((o) => o.value)).toEqual(['x'])
    vi.useRealTimers()
  })

  it('載入失敗觸發 load:error 並關閉 loading', async () => {
    vi.useFakeTimers()
    const err = new Error('boom')
    const loadOptions = vi.fn(async () => {
      throw err
    })
    const s = createSelkit({ loadOptions, debounce: 0 })
    const onError = vi.fn()
    s.on('load:error', onError)
    s.setQuery('x')
    await vi.advanceTimersByTimeAsync(0)
    expect(onError).toHaveBeenCalledWith({ error: err })
    expect(s.getState().loading).toBe(false)
    vi.useRealTimers()
  })
})

describe('非同步 abort 取消', () => {
  it('新搜尋取消前一個進行中請求的 signal 且不誤觸 load:error', async () => {
    vi.useFakeTimers()
    const signals: AbortSignal[] = []
    const loadOptions = vi.fn(
      (q: string, _p: number, opts: { signal: AbortSignal }) => {
        signals.push(opts.signal)
        // 第一次（slow）永不解析模擬慢請求 第二次（fast）才回結果
        return new Promise<SelkitItem[]>((resolve) => {
          if (q === 'fast') resolve([{ value: 'new', label: 'New' }])
        })
      },
    )
    const onError = vi.fn()
    const s = createSelkit({ loadOptions, debounce: 0 })
    s.on('load:error', onError)
    s.setQuery('slow')
    await vi.advanceTimersByTimeAsync(0)
    s.setQuery('fast')
    await vi.advanceTimersByTimeAsync(0)
    expect(signals[0]!.aborted).toBe(true) // 前一個被取消
    expect(signals[1]!.aborted).toBe(false) // 最新的仍有效
    expect(onError).not.toHaveBeenCalled() // 自家取消不算錯誤
    vi.useRealTimers()
  })

  it('未達 minInputLength 時取消進行中的請求', async () => {
    vi.useFakeTimers()
    const signals: AbortSignal[] = []
    const loadOptions = vi.fn(
      (_q: string, _p: number, opts: { signal: AbortSignal }) => {
        signals.push(opts.signal)
        return new Promise<SelkitItem[]>(() => {}) // 永不解析
      },
    )
    const s = createSelkit({ loadOptions, debounce: 0, minInputLength: 2 })
    s.setQuery('abc')
    await vi.advanceTimersByTimeAsync(0)
    s.setQuery('a') // 退回未達字數
    expect(signals[0]!.aborted).toBe(true)
    vi.useRealTimers()
  })
})

describe('遠端結果快取 cache', () => {
  it('開啟時同 query 命中快取不重打 API', async () => {
    vi.useFakeTimers()
    const loadOptions = vi.fn(async (q: string) => [{ value: q, label: q }])
    const s = createSelkit({ loadOptions, debounce: 0, cache: true })
    s.setQuery('xy')
    await vi.advanceTimersByTimeAsync(0)
    s.setQuery('ab')
    await vi.advanceTimersByTimeAsync(0)
    s.setQuery('xy') // 命中快取
    await vi.advanceTimersByTimeAsync(0)
    expect(loadOptions.mock.calls.filter((c) => c[0] === 'xy')).toHaveLength(1)
    expect(s.getState().visibleOptions.map((o) => o.value)).toEqual(['xy'])
    vi.useRealTimers()
  })

  it('cacheTTL 過期後重打', async () => {
    vi.useFakeTimers()
    const loadOptions = vi.fn(async (q: string) => [{ value: q, label: q }])
    const s = createSelkit({ loadOptions, debounce: 0, cache: true, cacheTTL: 1000 })
    s.setQuery('xy')
    await vi.advanceTimersByTimeAsync(0)
    expect(loadOptions).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(2000) // 超過 TTL
    s.setQuery('xy')
    await vi.advanceTimersByTimeAsync(0)
    expect(loadOptions).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
  })

  it('setOptions 清空快取', async () => {
    vi.useFakeTimers()
    const loadOptions = vi.fn(async (q: string) => [{ value: q, label: q }])
    const s = createSelkit({ loadOptions, debounce: 0, cache: true })
    s.setQuery('xy')
    await vi.advanceTimersByTimeAsync(0)
    s.setOptions([{ value: 'z', label: 'Z' }])
    s.setQuery('xy')
    await vi.advanceTimersByTimeAsync(0)
    expect(loadOptions).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
  })

  it('cache 關閉時每次都重打', async () => {
    vi.useFakeTimers()
    const loadOptions = vi.fn(async (q: string) => [{ value: q, label: q }])
    const s = createSelkit({ loadOptions, debounce: 0 })
    s.setQuery('xy')
    await vi.advanceTimersByTimeAsync(0)
    s.setQuery('ab')
    await vi.advanceTimersByTimeAsync(0)
    s.setQuery('xy')
    await vi.advanceTimersByTimeAsync(0)
    expect(loadOptions.mock.calls.filter((c) => c[0] === 'xy')).toHaveLength(2)
    vi.useRealTimers()
  })
})

describe('isValidToken tag 驗證', () => {
  const opts: SelkitItem[] = [{ value: 'a', label: 'Apple' }]
  const cfg = {
    options: opts,
    multiple: true,
    taggable: true,
    createTag: (q: string) => ({ value: q, label: q }),
    isValidToken: (q: string) => q.length >= 3,
  }

  it('無效 query 不顯示建立列且 createTag 不建立', () => {
    const onCreate = vi.fn()
    const s = createSelkit(cfg)
    s.on('create', onCreate)
    s.open()
    s.setQuery('ab') // 長度 2 無效
    expect(s.getGroupedView().rows.some((r) => r.type === 'create')).toBe(false)
    s.createTag()
    expect(onCreate).not.toHaveBeenCalled()
    expect(s.getState().selected).toHaveLength(0)
  })

  it('有效 query 顯示建立列且可建立', () => {
    const s = createSelkit(cfg)
    s.open()
    s.setQuery('abc')
    expect(s.getGroupedView().rows.some((r) => r.type === 'create')).toBe(true)
    s.createTag()
    expect(s.getState().selected.map((o) => o.value)).toEqual(['abc'])
  })

  it('tokenSeparator 對無效 token 略過、有效 token 建立', () => {
    const s = createSelkit({
      multiple: true,
      taggable: true,
      tokenSeparators: [','],
      createTag: (q: string) => ({ value: q, label: q }),
      isValidToken: (q: string) => q.length >= 3,
    })
    s.setQuery('ab,abcd,') // ab 無效略過 abcd 有效建立
    expect(s.getState().selected.map((o) => o.value)).toEqual(['abcd'])
  })
})

describe('遠端分頁 / 無限捲動', () => {
  const page1: SelkitItem[] = [
    { value: 1, label: 'One' },
    { value: 2, label: 'Two' },
  ]
  const page2: SelkitItem[] = [{ value: 3, label: 'Three' }]

  it('回傳 { items, hasMore } 時記錄 hasMore 與 page', async () => {
    const loadOptions = vi.fn(async () => ({ items: page1, hasMore: true }))
    const s = createSelkit({ loadOptions, debounce: 0 })
    s.setQuery('o')
    await vi.waitFor(() => expect(s.getState().visibleOptions).toHaveLength(2))
    expect(s.getState().hasMore).toBe(true)
    expect(s.getState().page).toBe(1)
  })

  it('loadMore 追加下一頁且 page 遞增', async () => {
    const loadOptions = vi.fn(async (_q: string, p: number) =>
      p === 1 ? { items: page1, hasMore: true } : { items: page2, hasMore: false },
    )
    const s = createSelkit({ loadOptions, debounce: 0 })
    s.setQuery('o')
    await vi.waitFor(() => expect(s.getState().visibleOptions).toHaveLength(2))
    s.loadMore()
    await vi.waitFor(() => expect(s.getState().visibleOptions).toHaveLength(3))
    expect(s.getState().visibleOptions.map((o) => o.value)).toEqual([1, 2, 3])
    expect(s.getState().page).toBe(2)
    expect(s.getState().hasMore).toBe(false)
  })

  it('hasMore 為 false 時 loadMore 不觸發載入', async () => {
    const loadOptions = vi.fn(async () => ({ items: page1, hasMore: false }))
    const s = createSelkit({ loadOptions, debounce: 0 })
    s.setQuery('o')
    await vi.waitFor(() => expect(s.getState().visibleOptions).toHaveLength(2))
    loadOptions.mockClear()
    s.loadMore()
    await new Promise((r) => setTimeout(r, 10))
    expect(loadOptions).not.toHaveBeenCalled()
  })

  it('回傳純陣列時 hasMore 為 false 相容舊用法', async () => {
    const loadOptions = vi.fn(async () => page1)
    const s = createSelkit({ loadOptions, debounce: 0 })
    s.setQuery('o')
    await vi.waitFor(() => expect(s.getState().visibleOptions).toHaveLength(2))
    expect(s.getState().hasMore).toBe(false)
  })

  it('新搜尋重置分頁並取代而非追加', async () => {
    const loadOptions = vi.fn(async (_q: string, p: number) =>
      p === 1 ? { items: page1, hasMore: true } : { items: page2, hasMore: false },
    )
    const s = createSelkit({ loadOptions, debounce: 0 })
    s.setQuery('o')
    await vi.waitFor(() => expect(s.getState().visibleOptions).toHaveLength(2))
    s.loadMore()
    await vi.waitFor(() => expect(s.getState().visibleOptions).toHaveLength(3))
    s.setQuery('x')
    await vi.waitFor(() => expect(s.getState().page).toBe(1))
    expect(s.getState().visibleOptions).toHaveLength(2)
  })

  it('載入下一頁期間 loadingMore 為 true', async () => {
    let resolveSecond!: (v: { items: SelkitItem[]; hasMore: boolean }) => void
    const loadOptions = vi.fn((_q: string, p: number) =>
      p === 1
        ? Promise.resolve({ items: page1, hasMore: true })
        : new Promise<{ items: SelkitItem[]; hasMore: boolean }>(
            (r) => (resolveSecond = r),
          ),
    )
    const s = createSelkit({ loadOptions, debounce: 0 })
    s.setQuery('o')
    await vi.waitFor(() => expect(s.getState().visibleOptions).toHaveLength(2))
    s.loadMore()
    await vi.waitFor(() => expect(s.getState().loadingMore).toBe(true))
    resolveSecond({ items: page2, hasMore: false })
    await vi.waitFor(() => expect(s.getState().loadingMore).toBe(false))
  })
})

describe('tagging', () => {
  it('createTag 建立並選取新選項 觸發 create 事件', () => {
    const onCreate = vi.fn()
    const s = createSelkit({
      options: OPTIONS,
      taggable: true,
      createTag: (q) => ({ value: q.toLowerCase(), label: q }),
    })
    s.on('create', onCreate)
    s.setQuery('Mango')
    s.createTag()
    expect(onCreate).toHaveBeenCalledWith({
      option: { value: 'mango', label: 'Mango' },
    })
    expect(s.getState().selected.map((o) => o.value)).toContain('mango')
  })

  it('selectActive 在無相符選項時自動建立 tag', () => {
    const s = createSelkit({
      options: OPTIONS,
      multiple: true,
      taggable: true,
      createTag: (q) => ({ value: q, label: q }),
    })
    s.open()
    s.setQuery('Zzz')
    s.selectActive()
    expect(s.getState().selected.map((o) => o.value)).toContain('Zzz')
  })

  it('已有同名選項則改選既有 不重複建立', () => {
    const create = vi.fn((q: string) => ({ value: q, label: q }))
    const s = createSelkit({ options: OPTIONS, taggable: true, createTag: create })
    s.setQuery('apple')
    s.createTag()
    expect(create).not.toHaveBeenCalled()
    expect(s.getState().selected.map((o) => o.value)).toEqual(['a'])
  })

  it('非 taggable 時 createTag 無效', () => {
    const s = createSelkit({ options: OPTIONS })
    s.setQuery('Mango')
    s.createTag()
    expect(s.getState().selected).toEqual([])
  })
})

describe('tokenSeparators 自動切 tag', () => {
  const ms = (extra = {}) =>
    createSelkit({
      options: OPTIONS,
      multiple: true,
      tokenSeparators: [','],
      ...extra,
    })

  it('分隔符前的 token 選取既有選項 剩餘留在 query', () => {
    const s = ms()
    s.setQuery('apple,banana,ch')
    expect(s.getState().selected.map((o) => o.value)).toEqual(['a', 'b'])
    expect(s.getState().query).toBe('ch')
  })

  it('結尾即分隔符時 query 清空', () => {
    const s = ms()
    s.setQuery('apple,')
    expect(s.getState().selected.map((o) => o.value)).toEqual(['a'])
    expect(s.getState().query).toBe('')
  })

  it('taggable 時無相符 token 建立新 tag 並觸發 create', () => {
    const onCreate = vi.fn()
    const s = ms({ taggable: true, createTag: (q: string) => ({ value: q, label: q }) })
    s.on('create', onCreate)
    s.setQuery('apple,Mango,')
    expect(s.getState().selected.map((o) => o.value)).toEqual(['a', 'Mango'])
    expect(onCreate).toHaveBeenCalledWith({ option: { value: 'Mango', label: 'Mango' } })
  })

  it('非 taggable 時無相符 token 丟棄', () => {
    const s = ms()
    s.setQuery('apple,zzz,')
    expect(s.getState().selected.map((o) => o.value)).toEqual(['a'])
    expect(s.getState().query).toBe('')
  })

  it('空 token 與前後空白皆忽略', () => {
    const s = ms()
    s.setQuery(' apple , , banana ,')
    expect(s.getState().selected.map((o) => o.value)).toEqual(['a', 'b'])
  })

  it('支援多個分隔符（逗號與空白）', () => {
    const s = ms({ tokenSeparators: [',', ' '] })
    s.setQuery('apple banana c')
    expect(s.getState().selected.map((o) => o.value)).toEqual(['a', 'b'])
    expect(s.getState().query).toBe('c')
  })

  it('已選不重複 disabled 不選', () => {
    const s = ms({ value: ['a'] })
    s.setQuery('apple,cherry,date,')
    // apple 已選略過 cherry disabled 略過 date 選取
    expect(s.getState().selected.map((o) => o.value)).toEqual(['a', 'd'])
  })

  it('單選時不啟用 tokenization', () => {
    const s = createSelkit({ options: OPTIONS, tokenSeparators: [','] })
    s.setQuery('apple,banana')
    expect(s.getState().query).toBe('apple,banana')
    expect(s.getState().selected).toEqual([])
  })

  it('無分隔符的一般輸入照舊', () => {
    const s = ms()
    s.setQuery('ch')
    expect(s.getState().selected).toEqual([])
    expect(s.getState().query).toBe('ch')
  })
})

describe('可見的建立列 (create row)', () => {
  const tg = (extra = {}) =>
    createSelkit({
      options: OPTIONS,
      taggable: true,
      createTag: (q: string) => ({ value: q, label: q }),
      ...extra,
    })

  it('taggable + 無精確相符時 view 末尾有 create 列', () => {
    const s = tg()
    s.open()
    s.setQuery('Mango')
    const rows = s.getGroupedView().rows
    const last = rows[rows.length - 1]
    expect(last).toMatchObject({
      type: 'create',
      query: 'Mango',
      label: 'Add "Mango"',
    })
  })

  it('create 列 index 對齊 activedescendant（接在實選項之後）', () => {
    const s = tg({ multiple: true })
    s.open()
    s.setQuery('a') // Apple / Banana / Date 三項
    const createRow = s
      .getGroupedView()
      .rows.find((r) => r.type === 'create') as { index: number }
    expect(createRow.index).toBe(3)
  })

  it('精確同名選項存在時不顯示 create 列', () => {
    const s = tg()
    s.open()
    s.setQuery('Apple')
    expect(s.getGroupedView().rows.some((r) => r.type === 'create')).toBe(false)
  })

  it('query 為空時不顯示', () => {
    const s = tg()
    s.open()
    expect(s.getGroupedView().rows.some((r) => r.type === 'create')).toBe(false)
  })

  it('非 taggable 不顯示', () => {
    const s = createSelkit({ options: OPTIONS })
    s.open()
    s.setQuery('Mango')
    expect(s.getGroupedView().rows.some((r) => r.type === 'create')).toBe(false)
  })

  it('未達 minInputLength 不顯示', () => {
    const s = tg({ minInputLength: 3 })
    s.open()
    s.setQuery('Ma')
    expect(s.getGroupedView().rows.some((r) => r.type === 'create')).toBe(false)
  })

  it('無相符時 highlight 落在 create 列 selectActive 即建立', () => {
    const s = tg({ multiple: true })
    s.open()
    s.setQuery('Mango')
    expect(s.getState().activeIndex).toBe(0) // visibleOptions 為空 create 列在 0
    s.selectActive()
    expect(s.getState().selected.map((o) => o.value)).toContain('Mango')
  })

  it('鍵盤 End 可移到 create 列', () => {
    const s = tg({ multiple: true })
    s.open()
    s.setQuery('a')
    expect(s.getState().visibleOptions).toHaveLength(3)
    s.moveActiveToEnd()
    expect(s.getState().activeIndex).toBe(3)
  })

  it('create 訊息可自訂 (i18n)', () => {
    const s = tg({ messages: { create: (q: string) => `新增「${q}」` } })
    s.open()
    s.setQuery('Mango')
    const row = s.getGroupedView().rows.find((r) => r.type === 'create') as {
      label: string
    }
    expect(row.label).toBe('新增「Mango」')
  })

  it('createTag 後 create 列消失', () => {
    const s = tg({ multiple: true })
    s.open()
    s.setQuery('Mango')
    s.createTag()
    expect(s.getGroupedView().rows.some((r) => r.type === 'create')).toBe(false)
  })

  it('達 maxSelections 時不顯示 create 列', () => {
    const s = tg({ multiple: true, maxSelections: 1, value: ['a'] })
    s.open()
    s.setQuery('Mango')
    expect(s.getGroupedView().rows.some((r) => r.type === 'create')).toBe(false)
  })
})

describe('diacritics 不敏感搜尋', () => {
  it('cafe 能搜到 café', () => {
    const s = createSelkit({
      options: [
        { value: 1, label: 'Café' },
        { value: 2, label: 'Tea' },
      ],
    })
    s.setQuery('cafe')
    expect(s.getState().visibleOptions.map((o) => o.value)).toEqual([1])
  })

  it('café 也能搜到 Café', () => {
    const s = createSelkit({ options: [{ value: 1, label: 'Café' }] })
    s.setQuery('café')
    expect(s.getState().visibleOptions).toHaveLength(1)
  })
})

describe('fuzzy 模糊搜尋', () => {
  it('子序列比對：apl 能搜到 Apple', () => {
    const s = createSelkit({ options: OPTIONS, fuzzy: true })
    s.setQuery('apl')
    expect(s.getState().visibleOptions.map((o) => o.value)).toEqual(['a'])
  })

  it('非連續字元依序出現即相符：bnn 搜到 Banana', () => {
    const s = createSelkit({ options: OPTIONS, fuzzy: true })
    s.setQuery('bnn')
    expect(s.getState().visibleOptions.map((o) => o.value)).toEqual(['b'])
  })

  it('順序不符則不相符：lpa 搜不到 Apple', () => {
    const s = createSelkit({ options: OPTIONS, fuzzy: true })
    s.setQuery('lpa')
    expect(s.getState().visibleOptions).toHaveLength(0)
  })

  it('未開 fuzzy 時維持子字串比對：apl 搜不到 Apple', () => {
    const s = createSelkit({ options: OPTIONS })
    s.setQuery('apl')
    expect(s.getState().visibleOptions).toHaveLength(0)
  })

  it('fuzzy 同樣不敏感變音符號：cf 搜到 Café', () => {
    const s = createSelkit({
      options: [{ value: 1, label: 'Café' }],
      fuzzy: true,
    })
    s.setQuery('cf')
    expect(s.getState().visibleOptions).toHaveLength(1)
  })
})

describe('minInputLength 最少輸入字數', () => {
  it('未達字數時不顯示任何選項', () => {
    const s = createSelkit({ options: OPTIONS, minInputLength: 2 })
    s.setQuery('a')
    expect(s.getState().visibleOptions).toHaveLength(0)
  })

  it('未達字數時 noResults 為 false 區別於真的無相符', () => {
    const s = createSelkit({ options: OPTIONS, minInputLength: 2 })
    s.setQuery('a')
    expect(s.getState().noResults).toBe(false)
  })

  it('達到字數即正常過濾', () => {
    const s = createSelkit({ options: OPTIONS, minInputLength: 2 })
    s.setQuery('an')
    expect(s.getState().visibleOptions.map((o) => o.value)).toEqual(['b'])
  })

  it('初始未達字數時 visibleOptions 為空且 noResults 為 false', () => {
    const s = createSelkit({ options: OPTIONS, minInputLength: 2 })
    expect(s.getState().visibleOptions).toHaveLength(0)
    expect(s.getState().noResults).toBe(false)
  })

  it('async 未達字數時不觸發 loadOptions', async () => {
    const loadOptions = vi.fn(async () => OPTIONS)
    const s = createSelkit({ minInputLength: 2, loadOptions, debounce: 0 })
    s.setQuery('a')
    await new Promise((r) => setTimeout(r, 10))
    expect(loadOptions).not.toHaveBeenCalled()
  })
})

describe('isSearchable / minResultsForSearch', () => {
  it('預設可搜尋', () => {
    const s = createSelkit({ options: OPTIONS })
    expect(s.isSearchable()).toBe(true)
  })

  it('searchable false 時不可搜尋', () => {
    const s = createSelkit({ options: OPTIONS, searchable: false })
    expect(s.isSearchable()).toBe(false)
  })

  it('選項數未達 minResultsForSearch 時不可搜尋', () => {
    const s = createSelkit({ options: OPTIONS, minResultsForSearch: 10 })
    expect(s.isSearchable()).toBe(false)
  })

  it('選項數達到 minResultsForSearch 時可搜尋', () => {
    const s = createSelkit({ options: OPTIONS, minResultsForSearch: 4 })
    expect(s.isSearchable()).toBe(true)
  })

  it('setOptions 後依新選項數重新判定', () => {
    const s = createSelkit({ options: OPTIONS, minResultsForSearch: 4 })
    expect(s.isSearchable()).toBe(true)
    s.setOptions([{ value: 'x', label: 'X' }])
    expect(s.isSearchable()).toBe(false)
  })
})

describe('hideSelected 隱藏已選', () => {
  it('多選且開啟時已選項從可見清單移除', () => {
    const s = createSelkit({
      options: OPTIONS,
      multiple: true,
      hideSelected: true,
    })
    s.select('a')
    expect(s.getState().visibleOptions.map((o) => o.value)).not.toContain('a')
  })

  it('deselect 後該項回到可見清單', () => {
    const s = createSelkit({
      options: OPTIONS,
      multiple: true,
      hideSelected: true,
    })
    s.select('a')
    s.deselect('a')
    expect(s.getState().visibleOptions.map((o) => o.value)).toContain('a')
  })

  it('預設不隱藏 已選項仍在清單', () => {
    const s = createSelkit({ options: OPTIONS, multiple: true })
    s.select('a')
    expect(s.getState().visibleOptions.map((o) => o.value)).toContain('a')
  })

  it('初始值即隱藏', () => {
    const s = createSelkit({
      options: OPTIONS,
      multiple: true,
      hideSelected: true,
      value: ['a'],
    })
    expect(s.getState().visibleOptions.map((o) => o.value)).not.toContain('a')
  })

  it('搭配搜尋時仍隱藏已選', () => {
    const s = createSelkit({
      options: OPTIONS,
      multiple: true,
      hideSelected: true,
    })
    s.select('b')
    s.setQuery('a')
    expect(s.getState().visibleOptions.map((o) => o.value)).not.toContain('b')
  })
})

describe('moveSelected 重排已選', () => {
  const ms = () =>
    createSelkit({ options: OPTIONS, multiple: true, value: ['a', 'b', 'd'] })

  it('將項目往後移', () => {
    const s = ms()
    s.moveSelected(0, 2)
    expect(s.getState().selected.map((o) => o.value)).toEqual(['b', 'd', 'a'])
  })

  it('將項目往前移', () => {
    const s = ms()
    s.moveSelected(2, 0)
    expect(s.getState().selected.map((o) => o.value)).toEqual(['d', 'a', 'b'])
  })

  it('觸發 change 事件帶新順序', () => {
    const s = ms()
    const onChange = vi.fn()
    s.on('change', onChange)
    s.moveSelected(0, 1)
    expect(onChange).toHaveBeenCalledWith({
      selected: s.getState().selected,
      value: ['b', 'a', 'd'],
    })
  })

  it('索引越界或相同時不動作', () => {
    const s = ms()
    const onChange = vi.fn()
    s.on('change', onChange)
    s.moveSelected(0, 0)
    s.moveSelected(-1, 2)
    s.moveSelected(0, 5)
    expect(s.getState().selected.map((o) => o.value)).toEqual(['a', 'b', 'd'])
    expect(onChange).not.toHaveBeenCalled()
  })
})

describe('getEmptyMessage 可自訂訊息 (i18n)', () => {
  it('預設無相符回傳 No results', () => {
    const s = createSelkit({ options: [] })
    expect(s.getEmptyMessage()).toBe('No results')
  })

  it('載入中回傳 Loading…', async () => {
    const loadOptions = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 5))
      return OPTIONS
    })
    const s = createSelkit({ loadOptions, debounce: 0 })
    s.setQuery('a')
    await new Promise((r) => setTimeout(r, 0)) // 等 debounce 計時器觸發 runLoad
    expect(s.getState().loading).toBe(true)
    expect(s.getEmptyMessage()).toBe('Loading…')
  })

  it('未達 minInputLength 時提示還需輸入字數', () => {
    const s = createSelkit({ options: OPTIONS, minInputLength: 3 })
    // 初始 query 為空 還差 3 字
    expect(s.getEmptyMessage()).toBe('Please enter 3 or more characters')
    s.setQuery('ab') // 還差 1 字
    expect(s.getEmptyMessage()).toBe('Please enter 1 or more character')
  })

  it('可用字串覆寫 loading / noResults', () => {
    const s = createSelkit({
      options: [],
      messages: { loading: '載入中…', noResults: '查無資料' },
    })
    expect(s.getEmptyMessage()).toBe('查無資料')
  })

  it('可用函式覆寫 minInputLength 並收到剩餘字數', () => {
    const s = createSelkit({
      options: OPTIONS,
      minInputLength: 2,
      messages: { minInputLength: (n) => `再輸入 ${n} 個字` },
    })
    expect(s.getEmptyMessage()).toBe('再輸入 2 個字')
    s.setQuery('a')
    expect(s.getEmptyMessage()).toBe('再輸入 1 個字')
  })

  it('部分覆寫時其餘維持預設', () => {
    const s = createSelkit({ options: [], messages: { loading: '載入中…' } })
    expect(s.getEmptyMessage()).toBe('No results')
  })
})

describe('getEmptyReason 與 getEmptyMessage 同優先序', () => {
  it('無相符回傳 no-results', () => {
    const s = createSelkit({ options: [] })
    expect(s.getEmptyReason()).toBe('no-results')
  })

  it('未達 minInputLength 回傳 min-input', () => {
    const s = createSelkit({ options: OPTIONS, minInputLength: 3 })
    expect(s.getEmptyReason()).toBe('min-input')
    s.setQuery('abc') // 達標後改回 no-results 或有結果
    expect(s.getEmptyReason()).toBe('no-results')
  })

  it('載入中回傳 loading', async () => {
    const loadOptions = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 5))
      return OPTIONS
    })
    const s = createSelkit({ loadOptions, debounce: 0 })
    s.setQuery('a')
    await new Promise((r) => setTimeout(r, 0))
    expect(s.getEmptyReason()).toBe('loading')
  })
})

describe('resolveSelected — 初始值回顯', () => {
  /** 清空 microtask 佇列 讓 fire-and-forget 的 #runResolve 跑完  */
  const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0))

  it('未設 resolveSelected 時 missing value 不納入 selected（向後相容）', () => {
    const s = createSelkit({ options: [], value: 'x' })
    expect(s.getState().selected).toEqual([])
    expect(s.getState().resolving).toBe(false)
  })

  it('value 皆在 options 中則不呼叫 resolveSelected（短路）', () => {
    const resolveSelected = vi.fn(() => [])
    const s = createSelkit({ options: OPTIONS, value: 'b', resolveSelected })
    expect(resolveSelected).not.toHaveBeenCalled()
    expect(s.getState().resolving).toBe(false)
  })

  it('同步 hook：先以 fallback 佔位、回傳後補正 label、不進 flat、不發 change', async () => {
    const onChange = vi.fn()
    const resolveSelected = vi.fn((vals: Array<string | number>) =>
      vals.map((v) => ({ value: v, label: `Label-${v}` })),
    )
    const s = createSelkit({ options: [], value: 'x', resolveSelected })
    s.on('change', onChange)

    expect(resolveSelected).toHaveBeenCalledWith(['x'])
    expect(s.getState().resolving).toBe(true)
    expect(s.getState().selected[0]).toEqual({ value: 'x', label: 'x' }) // fallback

    await flush()
    expect(s.getState().resolving).toBe(false)
    expect(s.getState().selected[0]).toEqual({ value: 'x', label: 'Label-x' })
    expect(s.getState().visibleOptions).toEqual([]) // 不進可見選項池
    expect(onChange).not.toHaveBeenCalled() // value 未變 不發 change
  })

  it('非同步 hook：resolving 期間顯示 fallback、回傳後補正', async () => {
    const s = createSelkit({
      options: [],
      value: 'y',
      resolveSelected: async () => [{ value: 'y', label: 'Yacht' }],
    })
    expect(s.getState().resolving).toBe(true)
    expect(s.getState().selected[0]!.label).toBe('y') // fallback
    await flush()
    expect(s.getState().resolving).toBe(false)
    expect(s.getState().selected[0]!.label).toBe('Yacht')
  })

  it('混合 static 與 async value：只查 missing、靜態 option 不被覆蓋', async () => {
    const resolveSelected = vi.fn((vals: Array<string | number>) =>
      vals.map((v) => ({ value: v, label: `Remote-${v}` })),
    )
    const s = createSelkit({
      options: OPTIONS,
      value: ['b', 'z'],
      multiple: true,
      resolveSelected,
    })
    expect(resolveSelected).toHaveBeenCalledWith(['z']) // 只查 missing
    await flush()
    const sel = s.getState().selected
    expect(sel.map((o) => o.value)).toEqual(['b', 'z'])
    expect(sel[0]).toEqual({ value: 'b', label: 'Banana' }) // 靜態原樣
    expect(sel[1]!.label).toBe('Remote-z') // missing 補上
  })

  it('hook 漏回的 value 維持 fallback label', async () => {
    const s = createSelkit({
      options: [],
      value: ['a', 'b'],
      multiple: true,
      resolveSelected: async () => [{ value: 'a', label: 'Alpha' }], // 漏 b
    })
    await flush()
    const sel = s.getState().selected
    expect(sel[0]!.label).toBe('Alpha')
    expect(sel[1]).toEqual({ value: 'b', label: 'b' }) // 維持 fallback
  })

  it('hook 回傳非 selected 的 option 不影響 selected', async () => {
    const s = createSelkit({
      options: [],
      value: 'z',
      resolveSelected: async () => [
        { value: 'z', label: 'Zebra' },
        { value: 'extra', label: 'Extra' }, // 不在 selected 應忽略
      ],
    })
    await flush()
    expect(s.getState().selected).toEqual([{ value: 'z', label: 'Zebra' }])
  })

  it('hook 失敗時維持 fallback、發 load:error、resolving 復原', async () => {
    const onError = vi.fn()
    const s = createSelkit({
      options: [],
      value: 'x',
      resolveSelected: async () => {
        throw new Error('boom')
      },
    })
    s.on('load:error', onError)
    await flush()
    expect(s.getState().resolving).toBe(false)
    expect(s.getState().selected[0]).toEqual({ value: 'x', label: 'x' })
    expect(onError).toHaveBeenCalledOnce()
  })

  it('destroy 後回傳的結果被丟棄、不覆蓋 selected', async () => {
    let release!: (v: { value: string; label: string }[]) => void
    const s = createSelkit({
      options: [],
      value: 'x',
      resolveSelected: () =>
        new Promise<{ value: string; label: string }[]>((r) => {
          release = r
        }),
    })
    expect(s.getState().selected[0]!.label).toBe('x') // destroy 前 fallback
    s.destroy()
    release([{ value: 'x', label: 'NO' }])
    await flush()
    expect(s.getState().selected[0]!.label).toBe('x') // 仍 fallback 未被覆蓋
  })

  it('多選：一次 batch 查詢、保留 value 順序', async () => {
    const resolveSelected = vi.fn((vals: Array<string | number>) =>
      vals.map((v) => ({ value: v, label: `L-${v}` })),
    )
    const s = createSelkit({
      options: [],
      value: ['c', 'a', 'b'],
      multiple: true,
      resolveSelected,
    })
    expect(resolveSelected).toHaveBeenCalledWith(['c', 'a', 'b'])
    await flush()
    expect(s.getState().selected.map((o) => o.label)).toEqual([
      'L-c',
      'L-a',
      'L-b',
    ])
  })

  it('resolve 的 option 不出現在可見選項池', async () => {
    const s = createSelkit({
      options: OPTIONS,
      value: 'z',
      resolveSelected: async () => [{ value: 'z', label: 'Zebra' }],
    })
    await flush()
    expect(s.getState().visibleOptions.map((o) => o.value)).not.toContain('z')
  })
})
