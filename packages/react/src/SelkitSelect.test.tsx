import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render } from '@testing-library/react'
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
})
