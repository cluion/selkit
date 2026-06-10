import { describe, expect, it } from 'vitest'
import { effectScope } from 'vue'
import { useSelkit } from './useSelkit'
import type { SelkitItem } from '@selkit/core'

const OPTIONS: SelkitItem[] = [
  { value: 'a', label: 'Apple' },
  { value: 'b', label: 'Banana' },
]

describe('useSelkit', () => {
  it('state shallowRef 隨 controller 同步更新', () => {
    const scope = effectScope()
    scope.run(() => {
      const { controller, state } = useSelkit({ options: OPTIONS })
      expect(state.value.isOpen).toBe(false)
      expect(state.value.visibleOptions).toHaveLength(2)

      controller.open()
      expect(state.value.isOpen).toBe(true)

      controller.select('a')
      expect(state.value.selected.map((o) => o.value)).toEqual(['a'])
    })
    scope.stop()
  })
})
