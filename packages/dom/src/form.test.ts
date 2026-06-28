import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createSelkitDom } from './dom'
import type { SelkitItem } from '@selkit/core'

const OPTIONS: SelkitItem[] = [
  { value: 'a', label: 'Apple' },
  { value: 'b', label: 'Banana' },
]

let host: HTMLElement

beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
})

afterEach(() => {
  document.body.replaceChildren()
})

const hidden = (el: HTMLElement): HTMLInputElement[] =>
  Array.from(el.querySelectorAll('input[type=hidden]'))

describe('name → hidden input', () => {
  it('單選維護單一 hidden input', () => {
    const inst = createSelkitDom(host, {
      options: OPTIONS,
      name: 'fruit',
      value: 'a',
    })
    const inputs = hidden(inst.element)
    expect(inputs).toHaveLength(1)
    expect(inputs[0]!.name).toBe('fruit')
    expect(inputs[0]!.value).toBe('a')
  })

  it('多選用 name[] 維護多個 hidden input', () => {
    const inst = createSelkitDom(host, {
      options: OPTIONS,
      name: 'fruit',
      multiple: true,
      value: ['a', 'b'],
    })
    const inputs = hidden(inst.element)
    expect(inputs).toHaveLength(2)
    expect(inputs[0]!.name).toBe('fruit[]')
    expect(inputs.map((i) => i.value)).toEqual(['a', 'b'])
  })

  it('選取變更時更新 hidden input', () => {
    const inst = createSelkitDom(host, { options: OPTIONS, name: 'fruit' })
    inst.controller.select('b')
    expect(hidden(inst.element)[0]!.value).toBe('b')
  })

  it('未給 name 時不建立 hidden input', () => {
    const inst = createSelkitDom(host, { options: OPTIONS, value: 'a' })
    expect(hidden(inst.element)).toHaveLength(0)
  })
})

describe('增強現有 <select>', () => {
  const makeSelect = (html: string, multiple = false): HTMLSelectElement => {
    const select = document.createElement('select')
    select.name = 'fruit'
    if (multiple) select.multiple = true
    select.innerHTML = html
    host.append(select)
    return select
  }

  it('讀取 option 並隱藏原生 select 元件插在 select 後', () => {
    const select = makeSelect(
      '<option value="a">Apple</option><option value="b" selected>Banana</option>',
    )
    const inst = createSelkitDom(select)
    expect(inst.controller.getState().visibleOptions).toHaveLength(2)
    expect(inst.controller.getState().selected.map((o) => o.value)).toEqual(['b'])
    expect(select.style.display).toBe('none')
    expect(select.nextElementSibling).toBe(inst.element)
  })

  it('選取同步回原生 select', () => {
    const select = makeSelect(
      '<option value="a">Apple</option><option value="b">Banana</option>',
    )
    const inst = createSelkitDom(select)
    inst.controller.select('b')
    expect(select.value).toBe('b')
    expect(Array.from(select.options).find((o) => o.selected)?.value).toBe('b')
  })

  it('讀取 multiple 屬性與多個初始選中', () => {
    const select = makeSelect(
      '<option value="a" selected>Apple</option><option value="b" selected>Banana</option>',
      true,
    )
    const inst = createSelkitDom(select)
    expect(inst.controller.getState().selected.map((o) => o.value)).toEqual([
      'a',
      'b',
    ])
  })

  it('讀取 optgroup 分組', () => {
    const select = makeSelect(
      '<optgroup label="Fruit"><option value="a">Apple</option></optgroup>',
    )
    const view = createSelkitDom(select).controller.getGroupedView()
    expect(view.rows[0]).toEqual({ type: 'group', label: 'Fruit', depth: 0 })
  })

  it('destroy 後還原 select 顯示', () => {
    const select = makeSelect('<option value="a">Apple</option>')
    const inst = createSelkitDom(select)
    expect(select.style.display).toBe('none')
    inst.destroy()
    expect(select.style.display).toBe('')
  })
})
