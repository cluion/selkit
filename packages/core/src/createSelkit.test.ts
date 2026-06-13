import { describe, expect, it, vi } from 'vitest'
import { createSelkit } from './createSelkit'
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
      { type: 'group', label: 'Fruit' },
      { type: 'option', index: 0, option: { value: 'a', label: 'Apple' } },
      { type: 'option', index: 1, option: { value: 'b', label: 'Banana' } },
      { type: 'group', label: 'Veg' },
      { type: 'option', index: 2, option: { value: 'c', label: 'Carrot' } },
    ])
  })

  it('過濾後只保留有可見選項的分組', () => {
    const s = createSelkit({ options: GROUPED })
    s.setQuery('carrot')
    const view = s.getGroupedView()
    expect(view.rows).toEqual([
      { type: 'group', label: 'Veg' },
      { type: 'option', index: 0, option: { value: 'c', label: 'Carrot' } },
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
    expect(loadOptions).toHaveBeenCalledWith('xy', 1)
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
