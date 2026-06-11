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
    expect(loadOptions).toHaveBeenCalledWith('xy')
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
