import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { SelkitSelect } from './SelkitSelect'
import type { SelkitItem } from '@selkit/core'

const OPTIONS: SelkitItem[] = [
  { value: 'a', label: 'Apple' },
  { value: 'b', label: 'Banana' },
]

describe('taggable prop 透傳', () => {
  it('Enter 在無相符選項時建立 tag', async () => {
    const w = mount(SelkitSelect, {
      props: {
        options: OPTIONS,
        multiple: true,
        taggable: true,
        createTag: (q: string) => ({ value: q, label: q }),
      },
    })
    await w.find('.selkit__input').setValue('Mango')
    await w.find('.selkit__control').trigger('keydown', { key: 'Enter' })
    const tags = w.findAll('.selkit__tag').map((t) => t.text())
    expect(tags.some((t) => t.includes('Mango'))).toBe(true)
  })
})
