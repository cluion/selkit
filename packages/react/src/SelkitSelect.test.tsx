import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, waitFor } from '@testing-library/react'
import { SelkitSelect } from './SelkitSelect'
import type { SelkitItem } from '@selkit/core'

const OPTIONS: SelkitItem[] = [
  { value: 'a', label: 'Apple' },
  { value: 'b', label: 'Banana' },
  { value: 'c', label: 'Cherry', disabled: true },
]

const control = (c: HTMLElement) =>
  c.querySelector('.selkit__control') as HTMLElement
const options = (c: HTMLElement) =>
  Array.from(c.querySelectorAll('.selkit__option')) as HTMLElement[]

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
    const { container } = render(<SelkitSelect options={NESTED} />)
    fireEvent.pointerDown(control(container))
    const groups = Array.from(
      container.querySelectorAll('.selkit__group'),
    ) as HTMLElement[]
    const opts = options(container)
    expect(groups.map((g) => g.style.getPropertyValue('--selkit-depth'))).toEqual([
      '0',
      '1',
    ])
    expect(opts.map((o) => o.style.getPropertyValue('--selkit-depth'))).toEqual([
      '2',
      '1',
    ])
  })
})

describe('樹狀模式 tree', () => {
  const TREE: SelkitItem[] = [
    {
      value: 'elec',
      label: '電子',
      children: [
        { value: 'pc', label: '電腦', children: [{ value: 'mbp', label: 'MacBook Pro' }] },
      ],
    },
  ]

  it('渲染 treeitem 帶展開箭頭與 depth', () => {
    const { container } = render(<SelkitSelect options={TREE} />)
    fireEvent.pointerDown(control(container))
    const items = Array.from(
      container.querySelectorAll('.selkit__treeitem'),
    ) as HTMLElement[]
    expect(items.map((el) => el.style.getPropertyValue('--selkit-depth'))).toEqual([
      '0',
      '1',
      '2',
    ])
    expect(container.querySelector('.selkit__toggle')).toBeTruthy()
    expect(items[0]!.getAttribute('aria-expanded')).toBe('true')
  })

  it('點擊展開箭頭收合父', () => {
    const { container } = render(<SelkitSelect options={TREE} />)
    fireEvent.pointerDown(control(container))
    fireEvent.pointerDown(container.querySelector('.selkit__toggle')!)
    expect(container.querySelectorAll('.selkit__treeitem')).toHaveLength(1)
  })

  it('父可選（cascade 勾子孫葉）', () => {
    const { container } = render(<SelkitSelect options={TREE} multiple />)
    fireEvent.pointerDown(control(container))
    fireEvent.pointerDown(container.querySelectorAll('.selkit__treeitem')[0]!)
    expect(
      (container.querySelectorAll('.selkit__treeitem')[0] as HTMLElement).getAttribute(
        'aria-checked',
      ),
    ).toBe('true')
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
      ],
    },
  ]

  it('select(父) → checkbox checked', () => {
    const { container } = render(<SelkitSelect options={TREE} multiple />)
    fireEvent.pointerDown(control(container))
    fireEvent.pointerDown(container.querySelectorAll('.selkit__treeitem')[0]!)
    expect(container.querySelectorAll('.selkit__checkbox--checked').length).toBeGreaterThan(0)
  })
})

describe('搜尋命中高亮', () => {
  it('query 命中以 <mark> 標示，整段文字不變', () => {
    const { container } = render(<SelkitSelect options={OPTIONS} />)
    fireEvent.pointerDown(control(container as HTMLElement))
    const input = container.querySelector('.selkit__input') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'ban' } })
    const option = document.querySelector('.selkit__option') as HTMLElement
    expect(option.querySelector('mark.selkit__match')?.textContent).toBe('Ban')
    expect(option.textContent).toBe('Banana')
  })

  it('highlightMatches false 時不渲染 mark', () => {
    const { container } = render(
      <SelkitSelect options={OPTIONS} highlightMatches={false} />,
    )
    fireEvent.pointerDown(control(container as HTMLElement))
    const input = container.querySelector('.selkit__input') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'ban' } })
    const option = document.querySelector('.selkit__option') as HTMLElement
    expect(option.querySelector('mark')).toBeNull()
  })

  it('含標籤字元的 label 不被當 HTML 解析（防 XSS）', () => {
    const { container } = render(
      <SelkitSelect options={[{ value: 'x', label: '<b>Apple</b>' }]} />,
    )
    fireEvent.pointerDown(control(container as HTMLElement))
    const input = container.querySelector('.selkit__input') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'app' } })
    const option = document.querySelector('.selkit__option') as HTMLElement
    expect(option.querySelectorAll('b')).toHaveLength(0)
    expect(option.textContent).toBe('<b>Apple</b>')
    expect(option.querySelector('mark.selkit__match')?.textContent).toBe('App')
  })
})

describe('多實例互斥', () => {
  it('開第二個時關閉第一個（同時只有一個 dropdown）', () => {
    const { container: ca } = render(<SelkitSelect options={OPTIONS} />)
    const { container: cb } = render(<SelkitSelect options={OPTIONS} />)
    fireEvent.pointerDown(ca.querySelector('.selkit__control')!)
    expect(document.querySelectorAll('.selkit__dropdown')).toHaveLength(1)
    fireEvent.pointerDown(cb.querySelector('.selkit__control')!)
    expect(document.querySelectorAll('.selkit__dropdown')).toHaveLength(1)
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
    const { container } = render(
      <SelkitSelect
        options={COLLAPSE_OPTS}
        multiple
        value={[1, 2, 3, 4]}
        maxSelectedDisplay={2}
      />,
    )
    expect(container.querySelectorAll('.selkit__tag')).toHaveLength(2)
    expect(container.querySelector('.selkit__more')?.textContent).toBe('+2')
  })

  it('點 +M 展開全部', () => {
    const { container } = render(
      <SelkitSelect
        options={COLLAPSE_OPTS}
        multiple
        value={[1, 2, 3, 4]}
        maxSelectedDisplay={2}
      />,
    )
    fireEvent.pointerDown(container.querySelector('.selkit__more')!)
    expect(container.querySelectorAll('.selkit__tag')).toHaveLength(4)
  })
})

describe('clear 兩段確認', () => {
  it('clearConfirm 點第一次不清 進入待確認', () => {
    const { container } = render(
      <SelkitSelect options={COLLAPSE_OPTS} value={1} clearConfirm />,
    )
    const clear = container.querySelector('.selkit__clear')!
    fireEvent.pointerDown(clear)
    expect(container.querySelector('.selkit__single-value')).toBeTruthy()
    expect(
      container.querySelector('.selkit__clear')?.className,
    ).toContain('selkit__clear--confirm')
  })

  it('待確認時再點才清空', () => {
    const { container } = render(
      <SelkitSelect options={COLLAPSE_OPTS} value={1} clearConfirm />,
    )
    const clear = container.querySelector('.selkit__clear')!
    fireEvent.pointerDown(clear)
    fireEvent.pointerDown(clear)
    expect(container.querySelector('.selkit__single-value')).toBeNull()
  })

  it('未開 clearConfirm 點一下即清', () => {
    const { container } = render(
      <SelkitSelect options={COLLAPSE_OPTS} value={1} />,
    )
    fireEvent.pointerDown(container.querySelector('.selkit__clear')!)
    expect(container.querySelector('.selkit__single-value')).toBeNull()
  })
})

describe('SelkitSelect — 渲染', () => {
  it('初始渲染 control 且無 dropdown', () => {
    const { container } = render(<SelkitSelect options={OPTIONS} />)
    expect(container.querySelector('.selkit__control')).toBeTruthy()
    expect(container.querySelector('.selkit__dropdown')).toBeFalsy()
  })

  it('control 帶 combobox a11y', () => {
    const { container } = render(<SelkitSelect options={OPTIONS} />)
    const c = control(container as HTMLElement)
    expect(c.getAttribute('role')).toBe('combobox')
    expect(c.getAttribute('aria-expanded')).toBe('false')
  })
})

describe('dropdownParent 浮層 portal', () => {
  it('下拉用 createPortal 送到指定容器外於元件', () => {
    const { container } = render(
      <SelkitSelect options={OPTIONS} dropdownParent={document.body} />,
    )
    fireEvent.pointerDown(control(container as HTMLElement))
    const dd = document.querySelector('.selkit__dropdown') as HTMLElement
    expect(dd).toBeTruthy()
    expect(container.contains(dd)).toBe(false)
    expect(dd.classList.contains('selkit')).toBe(true)
  })
})

describe('開關與選取', () => {
  it('點 control 開啟並渲染選項', () => {
    const { container } = render(<SelkitSelect options={OPTIONS} />)
    fireEvent.pointerDown(control(container as HTMLElement))
    expect(container.querySelector('.selkit__dropdown')).toBeTruthy()
    expect(options(container as HTMLElement)).toHaveLength(3)
  })

  it('點選項觸發 onChange', () => {
    const onChange = vi.fn()
    const { container } = render(
      <SelkitSelect options={OPTIONS} onChange={onChange} />,
    )
    fireEvent.pointerDown(control(container as HTMLElement))
    fireEvent.pointerDown(options(container as HTMLElement)[1]!)
    expect(onChange).toHaveBeenCalledWith('b', expect.objectContaining({ value: 'b' }))
  })

  it('disabled 選項不可選', () => {
    const onChange = vi.fn()
    const { container } = render(
      <SelkitSelect options={OPTIONS} onChange={onChange} />,
    )
    fireEvent.pointerDown(control(container as HTMLElement))
    fireEvent.pointerDown(options(container as HTMLElement)[2]!)
    expect(onChange).not.toHaveBeenCalled()
  })
})

describe('受控 value', () => {
  it('初始 value 顯示選中', () => {
    const { container } = render(<SelkitSelect options={OPTIONS} value="b" />)
    expect(container.querySelector('.selkit__single-value')?.textContent).toBe('Banana')
  })

  it('外部 value 變更同步', () => {
    const { container, rerender } = render(
      <SelkitSelect options={OPTIONS} value="a" />,
    )
    rerender(<SelkitSelect options={OPTIONS} value="b" />)
    expect(container.querySelector('.selkit__single-value')?.textContent).toBe('Banana')
  })
})

describe('多選', () => {
  it('累加 tags 且選後不關閉', () => {
    const { container } = render(<SelkitSelect options={OPTIONS} multiple />)
    fireEvent.pointerDown(control(container as HTMLElement))
    fireEvent.pointerDown(options(container as HTMLElement)[0]!)
    fireEvent.pointerDown(options(container as HTMLElement)[1]!)
    expect(container.querySelectorAll('.selkit__tag')).toHaveLength(2)
    expect(container.querySelector('.selkit__dropdown')).toBeTruthy()
  })

  it('再點已選項即取消（toggle）', () => {
    const { container } = render(<SelkitSelect options={OPTIONS} multiple />)
    fireEvent.pointerDown(control(container as HTMLElement))
    fireEvent.pointerDown(options(container as HTMLElement)[0]!)
    expect(container.querySelectorAll('.selkit__tag')).toHaveLength(1)
    fireEvent.pointerDown(options(container as HTMLElement)[0]!)
    expect(container.querySelectorAll('.selkit__tag')).toHaveLength(0)
  })

  it('restoreOnBackspace 把刪除的 label 回填輸入框', () => {
    const { container } = render(
      <SelkitSelect options={OPTIONS} multiple value={['a', 'b']} restoreOnBackspace />,
    )
    fireEvent.keyDown(control(container as HTMLElement), { key: 'Backspace' })
    expect(container.querySelectorAll('.selkit__tag')).toHaveLength(1)
    expect(
      (container.querySelector('.selkit__input') as HTMLInputElement).value,
    ).toBe('Banana')
  })
})

describe('aria-live 公告', () => {
  it('掛載 polite live region 並於選取後更新', () => {
    const { container } = render(<SelkitSelect options={OPTIONS} multiple />)
    const live = container.querySelector('.selkit__live')
    expect(live?.getAttribute('aria-live')).toBe('polite')
    fireEvent.pointerDown(control(container as HTMLElement))
    fireEvent.pointerDown(options(container as HTMLElement)[0]!)
    expect(live?.textContent).toBe('Apple selected')
  })

  it('搜尋後公告結果數', () => {
    const { container } = render(<SelkitSelect options={OPTIONS} />)
    fireEvent.pointerDown(control(container as HTMLElement))
    fireEvent.change(
      container.querySelector('.selkit__input') as HTMLInputElement,
      { target: { value: 'Banana' } },
    )
    expect(container.querySelector('.selkit__live')?.textContent).toBe(
      '1 result available',
    )
  })
})

describe('checkboxes 多選打勾', () => {
  it('多選 + checkboxes 加上 root modifier class', () => {
    const { container } = render(
      <SelkitSelect options={OPTIONS} multiple checkboxes />,
    )
    expect(
      container.querySelector('.selkit')?.classList.contains('selkit--checkboxes'),
    ).toBe(true)
  })

  it('已選選項以 aria-selected 標記供樣式打勾', () => {
    const { container } = render(
      <SelkitSelect options={OPTIONS} multiple checkboxes value={['a']} />,
    )
    fireEvent.pointerDown(control(container as HTMLElement))
    const first = options(container as HTMLElement)[0]!
    expect(first.getAttribute('aria-selected')).toBe('true')
  })

  it('單選時不加 checkboxes class', () => {
    const { container } = render(<SelkitSelect options={OPTIONS} checkboxes />)
    expect(
      container.querySelector('.selkit')?.classList.contains('selkit--checkboxes'),
    ).toBe(false)
  })
})

describe('搜尋', () => {
  it('輸入過濾選項', () => {
    const { container } = render(<SelkitSelect options={OPTIONS} />)
    const input = container.querySelector('.selkit__input') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'ban' } })
    const labels = options(container as HTMLElement).map((o) => o.textContent)
    expect(labels).toEqual(['Banana'])
  })
})

describe('renderOption', () => {
  it('可自訂選項內容', () => {
    const { container } = render(
      <SelkitSelect
        options={OPTIONS}
        renderOption={(o) => `★${o.label}`}
      />,
    )
    fireEvent.pointerDown(control(container as HTMLElement))
    expect(options(container as HTMLElement)[0]!.textContent).toBe('★Apple')
  })
})

describe('autogrow / dropdownAutoWidth', () => {
  it('autogrow 設 root class 且 input size 隨字數', () => {
    const { container } = render(
      <SelkitSelect options={OPTIONS} autogrow placeholder="Pick" />,
    )
    expect(
      container.querySelector('.selkit')?.classList.contains('selkit--autogrow'),
    ).toBe(true)
    const input = container.querySelector('.selkit__input') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'abcd' } })
    expect(input.getAttribute('size')).toBe('4')
  })

  it('dropdownAutoWidth 設 root class 且下拉用 max-content', () => {
    const { container } = render(
      <SelkitSelect options={OPTIONS} dropdownAutoWidth />,
    )
    expect(
      container
        .querySelector('.selkit')
        ?.classList.contains('selkit--auto-width'),
    ).toBe(true)
    fireEvent.pointerDown(control(container as HTMLElement))
    const dd = container.querySelector('.selkit__dropdown') as HTMLElement
    expect(dd.style.width).toBe('max-content')
  })
})

describe('sorter', () => {
  it('依 sorter 反向排序渲染選項', () => {
    const { container } = render(
      <SelkitSelect
        options={OPTIONS}
        sorter={(a, b) => b.label.localeCompare(a.label)}
      />,
    )
    fireEvent.pointerDown(control(container as HTMLElement))
    expect(options(container as HTMLElement).map((o) => o.textContent)).toEqual([
      'Cherry',
      'Banana',
      'Apple',
    ])
  })
})

describe('renderSelection', () => {
  it('可自訂單值顯示', () => {
    const { container } = render(
      <SelkitSelect
        options={OPTIONS}
        value="b"
        renderSelection={(o) => `✓${o.label}`}
      />,
    )
    expect(container.querySelector('.selkit__single-value')?.textContent).toBe(
      '✓Banana',
    )
  })

  it('可自訂 tag 顯示且收到 index / multiple', () => {
    const { container } = render(
      <SelkitSelect
        options={OPTIONS}
        multiple
        value={['a', 'b']}
        renderSelection={(o, m) => `${m.index}:${o.label}:${m.multiple}`}
      />,
    )
    const labels = Array.from(
      container.querySelectorAll('.selkit__tag-label'),
    ).map((e) => e.textContent)
    expect(labels).toEqual(['0:Apple:true', '1:Banana:true'])
  })
})

describe('可換元件 render* 自訂結構零件', () => {
  const GROUPED: SelkitItem[] = [
    { label: 'Fruit', options: [{ value: 'a', label: 'Apple' }] },
  ]

  it('renderArrow 覆寫箭頭內容並帶 open', () => {
    const { container } = render(
      <SelkitSelect
        options={OPTIONS}
        renderArrow={(m) => (m.open ? 'OPEN' : 'CLOSED')}
      />,
    )
    const arrow = () => container.querySelector('.selkit__arrow') as HTMLElement
    expect(arrow().textContent).toBe('CLOSED')
    fireEvent.pointerDown(control(container as HTMLElement))
    expect(arrow().textContent).toBe('OPEN')
  })

  it('renderClear 覆寫清除鈕內容', () => {
    const { container } = render(
      <SelkitSelect options={OPTIONS} value="a" renderClear={() => '✗'} />,
    )
    expect(container.querySelector('.selkit__clear')?.textContent).toBe('✗')
  })

  it('renderTagRemove 覆寫移除鈕內容並帶 index', () => {
    const { container } = render(
      <SelkitSelect
        options={OPTIONS}
        multiple
        value={['a', 'b']}
        renderTagRemove={(_o, m) => `del${m.index}`}
      />,
    )
    const texts = Array.from(
      container.querySelectorAll('.selkit__tag-remove'),
    ).map((e) => e.textContent)
    expect(texts).toEqual(['del0', 'del1'])
  })

  it('renderGroup 覆寫分組標題並帶 meta', () => {
    const { container } = render(
      <SelkitSelect options={GROUPED} renderGroup={(m) => `# ${m.label}`} />,
    )
    fireEvent.pointerDown(control(container as HTMLElement))
    expect(container.querySelector('.selkit__group')?.textContent).toBe(
      '# Fruit',
    )
  })

  it('renderEmpty 覆寫空狀態並帶 reason / message', () => {
    const { container } = render(
      <SelkitSelect
        options={OPTIONS}
        renderEmpty={(m) => `${m.reason}:${m.message}`}
      />,
    )
    const input = container.querySelector('.selkit__input') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'zzz' } })
    expect(container.querySelector('.selkit__empty')?.textContent).toBe(
      'no-results:No results',
    )
  })
})

describe('作用中選項捲入視窗 scrollIntoView', () => {
  it('鍵盤導航時對作用中選項呼叫 scrollIntoView', () => {
    const spy = vi.fn()
    ;(Element.prototype as unknown as { scrollIntoView: unknown }).scrollIntoView = spy
    const { container } = render(<SelkitSelect options={OPTIONS} />)
    fireEvent.pointerDown(control(container as HTMLElement))
    spy.mockClear()
    fireEvent.keyDown(control(container as HTMLElement), { key: 'ArrowDown' })
    expect(spy).toHaveBeenCalledWith({ block: 'nearest' })
  })
})

describe('虛擬捲動', () => {
  const many: SelkitItem[] = Array.from({ length: 100 }, (_, i) => ({
    value: i,
    label: `Item ${i}`,
  }))

  it('未啟用時渲染全部選項', () => {
    const { container } = render(<SelkitSelect options={many} />)
    fireEvent.pointerDown(control(container as HTMLElement))
    expect(options(container as HTMLElement)).toHaveLength(100)
  })

  it('啟用時只渲染可視切片', () => {
    const { container } = render(
      <SelkitSelect options={many} virtualScroll itemHeight={36} />,
    )
    fireEvent.pointerDown(control(container as HTMLElement))
    const count = options(container as HTMLElement).length
    expect(count).toBeGreaterThan(0)
    expect(count).toBeLessThan(100)
  })

  const bigGrouped: SelkitItem[] = [
    { label: 'A', options: Array.from({ length: 50 }, (_, i) => ({ value: `a${i}`, label: `A ${i}` })) },
    { label: 'B', options: Array.from({ length: 50 }, (_, i) => ({ value: `b${i}`, label: `B ${i}` })) },
  ]

  it('分組 + 虛擬：只渲染切片（含 group header）', () => {
    const { container } = render(
      <SelkitSelect
        options={bigGrouped}
        virtualScroll
        itemHeight={36}
        groupHeight={28}
      />,
    )
    fireEvent.pointerDown(control(container as HTMLElement))
    const count = options(container as HTMLElement).length
    expect(count).toBeGreaterThan(0)
    expect(count).toBeLessThan(100)
    expect(container.querySelector('.selkit__group')).toBeTruthy()
  })
})

describe('resolveSelected — 回顯渲染', () => {
  it('初始 value 以 resolveSelected 回顯 label', async () => {
    const { container } = render(
      <SelkitSelect
        options={[]}
        value="x"
        resolveSelected={async () => [{ value: 'x', label: 'Label-x' }]}
      />,
    )
    const single = () =>
      container.querySelector('.selkit__single-value') as HTMLElement
    expect(single().textContent).toBe('x') // fallback 先顯示
    await waitFor(() => expect(single().textContent).toBe('Label-x'))
  })
})
