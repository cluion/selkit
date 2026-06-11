import { describe, expect, it } from 'vitest'
import { computeVirtualRange } from './virtual'

describe('computeVirtualRange', () => {
  it('頂端起始 endIndex 含 overscan 下緩衝', () => {
    const r = computeVirtualRange({
      scrollTop: 0,
      viewportHeight: 100,
      itemHeight: 20,
      itemCount: 100,
      overscan: 2,
    })
    expect(r.startIndex).toBe(0)
    // first=0 visible=5 overscan=2 → endIndex=7
    expect(r.endIndex).toBe(7)
    expect(r.paddingTop).toBe(0)
    expect(r.paddingBottom).toBe((100 - 7) * 20)
  })

  it('捲動到中段 startIndex 退 overscan', () => {
    const r = computeVirtualRange({
      scrollTop: 400,
      viewportHeight: 100,
      itemHeight: 20,
      itemCount: 100,
      overscan: 2,
    })
    // first=20 visible=5 → start=18 end=27
    expect(r.startIndex).toBe(18)
    expect(r.endIndex).toBe(27)
    expect(r.paddingTop).toBe(18 * 20)
    expect(r.paddingBottom).toBe((100 - 27) * 20)
  })

  it('接近底部 endIndex 不超過總數且 paddingBottom 為 0', () => {
    const r = computeVirtualRange({
      scrollTop: 1900,
      viewportHeight: 100,
      itemHeight: 20,
      itemCount: 100,
      overscan: 2,
    })
    // first=95 visible=5 → start=93 end=min(100,102)=100
    expect(r.startIndex).toBe(93)
    expect(r.endIndex).toBe(100)
    expect(r.paddingBottom).toBe(0)
  })

  it('itemCount 為 0 時回傳空範圍', () => {
    const r = computeVirtualRange({
      scrollTop: 0,
      viewportHeight: 100,
      itemHeight: 20,
      itemCount: 0,
    })
    expect(r).toEqual({
      startIndex: 0,
      endIndex: 0,
      paddingTop: 0,
      paddingBottom: 0,
    })
  })

  it('itemHeight 為 0 時不除以零 直接回傳全範圍', () => {
    const r = computeVirtualRange({
      scrollTop: 0,
      viewportHeight: 100,
      itemHeight: 0,
      itemCount: 10,
    })
    expect(r.startIndex).toBe(0)
    expect(r.endIndex).toBe(10)
    expect(r.paddingTop).toBe(0)
    expect(r.paddingBottom).toBe(0)
  })

  it('未給 overscan 時用預設值', () => {
    const r = computeVirtualRange({
      scrollTop: 0,
      viewportHeight: 100,
      itemHeight: 20,
      itemCount: 100,
    })
    // 預設 overscan=4 first=0 visible=5 → endIndex=9
    expect(r.endIndex).toBe(9)
  })
})
