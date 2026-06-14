import { describe, expect, it } from 'vitest'
import { fireEvent, render } from '@testing-library/react'
import { SelkitSelect } from './SelkitSelect'
import type { SelkitItem } from '@selkit/core'

const OPTIONS: SelkitItem[] = [
  { value: 'a', label: 'Apple' },
  { value: 'b', label: 'Banana' },
]

describe('taggable prop 透傳', () => {
  it('Enter 在無相符選項時建立 tag', () => {
    const { container } = render(
      <SelkitSelect
        options={OPTIONS}
        multiple
        taggable
        createTag={(q) => ({ value: q, label: q })}
      />,
    )
    const input = container.querySelector('.selkit__input') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Mango' } })
    fireEvent.keyDown(
      container.querySelector('.selkit__control') as HTMLElement,
      { key: 'Enter' },
    )
    const tags = Array.from(container.querySelectorAll('.selkit__tag'))
    expect(tags.some((t) => t.textContent?.includes('Mango'))).toBe(true)
  })
})

describe('可見的建立列 create row', () => {
  it('無相符時顯示建立列 點擊建立 tag', () => {
    const { container } = render(
      <SelkitSelect
        options={OPTIONS}
        multiple
        taggable
        createTag={(q) => ({ value: q, label: q })}
      />,
    )
    fireEvent.pointerDown(
      container.querySelector('.selkit__control') as HTMLElement,
    )
    const input = container.querySelector('.selkit__input') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Mango' } })
    const createRow = container.querySelector('.selkit__create')
    expect(createRow?.textContent).toBe('Add "Mango"')
    fireEvent.pointerDown(createRow as HTMLElement)
    const tags = Array.from(container.querySelectorAll('.selkit__tag'))
    expect(tags.some((t) => t.textContent?.includes('Mango'))).toBe(true)
  })
})

describe('tokenSeparators 透傳', () => {
  it('輸入含分隔符自動切成多個 tag 剩餘留在輸入框', () => {
    const { container } = render(
      <SelkitSelect
        options={OPTIONS}
        multiple
        taggable
        createTag={(q) => ({ value: q, label: q })}
        tokenSeparators={[',']}
      />,
    )
    const input = container.querySelector('.selkit__input') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'apple,Mango,ba' } })
    const tags = Array.from(container.querySelectorAll('.selkit__tag')).map(
      (t) => t.textContent,
    )
    expect(tags.some((t) => t?.includes('Apple'))).toBe(true)
    expect(tags.some((t) => t?.includes('Mango'))).toBe(true)
    expect(input.value).toBe('ba')
  })
})
