import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { SelkitSelect } from './SelkitSelect'
import type { SelkitItem } from '@selkit/core'

const OPTIONS: SelkitItem[] = [
  { value: 'a', label: 'Apple' },
  { value: 'b', label: 'Banana' },
]

describe('positioner 工廠注入', () => {
  it('開啟時以 (reference, floating, opts) 呼叫工廠並接管定位', async () => {
    const destroy = vi.fn()
    const factory = vi.fn(
      (_ref: HTMLElement, _fl: HTMLElement, _opts?: { autoWidth?: boolean }) => ({
        update: vi.fn(),
        destroy,
      }),
    )

    const w = mount(SelkitSelect, {
      props: { options: OPTIONS, dropdownAutoWidth: true, positioner: factory },
    })
    await w.find('.selkit__control').trigger('pointerdown')
    await flushPromises() // watcher 內部 await nextTick 後才呼叫工廠

    expect(factory).toHaveBeenCalledTimes(1)
    const [reference, floating, opts] = factory.mock.calls[0]!
    expect(reference).toBeInstanceOf(HTMLElement)
    expect(floating).toBeInstanceOf(HTMLElement)
    expect(opts).toEqual({ autoWidth: true })
  })

  it('提供工廠時不渲染 fixed/absolute 位置樣式（交給工廠）', async () => {
    const factory = vi.fn(() => ({ update: vi.fn(), destroy: vi.fn() }))
    const w = mount(SelkitSelect, {
      props: { options: OPTIONS, positioner: factory },
    })
    await w.find('.selkit__control').trigger('pointerdown')
    await flushPromises()

    const dropdown = w.find('.selkit__dropdown').element as HTMLElement
    expect(dropdown.style.position).toBe('')
    expect(dropdown.style.top).toBe('')
  })

  it('卸載時呼叫工廠的 destroy', async () => {
    const destroy = vi.fn()
    const factory = vi.fn(() => ({ update: vi.fn(), destroy }))
    const w = mount(SelkitSelect, {
      props: { options: OPTIONS, positioner: factory },
    })
    await w.find('.selkit__control').trigger('pointerdown')
    await flushPromises()
    expect(destroy).not.toHaveBeenCalled()

    w.unmount()
    expect(destroy).toHaveBeenCalledTimes(1)
  })
})
