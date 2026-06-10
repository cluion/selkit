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
