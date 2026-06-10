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
