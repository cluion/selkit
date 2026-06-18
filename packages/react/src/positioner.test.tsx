import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render } from '@testing-library/react'
import { SelkitSelect } from './SelkitSelect'
import type { SelkitItem } from '@selkit/core'

const OPTIONS: SelkitItem[] = [
  { value: 'a', label: 'Apple' },
  { value: 'b', label: 'Banana' },
]

describe('positioner 工廠注入', () => {
  it('開啟時以 (reference, floating, opts) 呼叫工廠並接管定位', () => {
    const destroy = vi.fn()
    const factory = vi.fn(
      (_ref: HTMLElement, _fl: HTMLElement, _opts?: { autoWidth?: boolean }) => ({
        update: vi.fn(),
        destroy,
      }),
    )

    const { container } = render(
      <SelkitSelect options={OPTIONS} dropdownAutoWidth positioner={factory} />,
    )
    fireEvent.pointerDown(
      container.querySelector('.selkit__control') as HTMLElement,
    )

    expect(factory).toHaveBeenCalledTimes(1)
    const [reference, floating, opts] = factory.mock.calls[0]!
    expect(reference).toBeInstanceOf(HTMLElement)
    expect(floating).toBeInstanceOf(HTMLElement)
    expect(opts).toEqual({ autoWidth: true })
  })

  it('提供工廠時不渲染 fixed/absolute 位置樣式（交給工廠）', () => {
    const factory = vi.fn(() => ({ update: vi.fn(), destroy: vi.fn() }))
    const { container } = render(
      <SelkitSelect options={OPTIONS} positioner={factory} />,
    )
    fireEvent.pointerDown(
      container.querySelector('.selkit__control') as HTMLElement,
    )
    const dropdown = container.querySelector('.selkit__dropdown') as HTMLElement
    expect(dropdown.style.position).toBe('')
    expect(dropdown.style.top).toBe('')
  })

  it('關閉時呼叫工廠的 destroy', () => {
    const destroy = vi.fn()
    const factory = vi.fn(
      (_ref: HTMLElement, _fl: HTMLElement, _opts?: { autoWidth?: boolean }) => ({
        update: vi.fn(),
        destroy,
      }),
    )
    const { container, unmount } = render(
      <SelkitSelect options={OPTIONS} positioner={factory} />,
    )
    fireEvent.pointerDown(
      container.querySelector('.selkit__control') as HTMLElement,
    )
    expect(destroy).not.toHaveBeenCalled()

    unmount()
    expect(destroy).toHaveBeenCalledTimes(1)
  })
})
