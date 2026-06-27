import { describe, expect, it } from 'vitest'
import {
  computeVirtualRange,
  computeScrollIntoView,
  computeVirtualWindow,
  computeScrollIntoViewVariable,
} from './virtual'

describe('computeVirtualRange', () => {
  it('gap 計入位置與佔位（stride = itemHeight + gap）', () => {
    const r = computeVirtualRange({
      scrollTop: 100,
      viewportHeight: 200,
      itemHeight: 36,
      itemCount: 50,
      gap: 4,
    })
    // stride = 40；first = 2；visible = 5；start = 0；end = 11
    expect(r.startIndex).toBe(0)
    expect(r.endIndex).toBe(11)
    expect(r.paddingTop).toBe(0)
    expect(r.paddingBottom).toBe((50 - 11) * 40)
  })

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

describe('computeScrollIntoView', () => {
  const base = { scrollTop: 100, viewportHeight: 100, itemHeight: 20 }

  it('已在可視範圍內回傳 null（不動）', () => {
    // 可視區 100~200；第 6 列 120~140 在內
    expect(computeScrollIntoView({ ...base, index: 6 })).toBeNull()
  })

  it('在可視區上方 對齊頂端', () => {
    // 第 2 列 40~60 在 scrollTop=100 上方 → 回傳 itemTop=40
    expect(computeScrollIntoView({ ...base, index: 2 })).toBe(40)
  })

  it('在可視區下方 對齊底端', () => {
    // 第 12 列 240~260 在可視底 200 下方 → itemBottom-viewport = 260-100 = 160
    expect(computeScrollIntoView({ ...base, index: 12 })).toBe(160)
  })

  it('剛好貼齊邊界視為可見', () => {
    // 可視 0~100；第 5 列 100~120 底端超出 → 對齊底 120-100=20
    expect(computeScrollIntoView({ ...base, scrollTop: 0, index: 5 })).toBe(20)
    // 第 4 列 80~100 剛好貼底 不動
    expect(computeScrollIntoView({ ...base, scrollTop: 0, index: 4 })).toBeNull()
  })

  it('index < 0 或 itemHeight <= 0 回傳 null', () => {
    expect(computeScrollIntoView({ ...base, index: -1 })).toBeNull()
    expect(computeScrollIntoView({ ...base, index: 3, itemHeight: 0 })).toBeNull()
  })
})

describe('computeVirtualWindow（變高）', () => {
  // 分組樣態：group(28) opt(36) opt(36) group(28) opt(36) opt(36)
  // offsets = [0,28,64,100,128,164,200]
  const heights = [28, 36, 36, 28, 36, 36]

  it('頂端起始 只含可視切片（overscan 0）', () => {
    const r = computeVirtualWindow({
      heights,
      scrollTop: 0,
      viewportHeight: 100,
      overscan: 0,
    })
    expect(r.startIndex).toBe(0)
    expect(r.endIndex).toBe(3) // rows 0,1,2 底端 100 為界
    expect(r.paddingTop).toBe(0)
    expect(r.paddingBottom).toBe(100) // 200 - offsets[3]=100
  })

  it('捲到第二段 padding 用高度總和（非 count×itemHeight）', () => {
    const r = computeVirtualWindow({
      heights,
      scrollTop: 100,
      viewportHeight: 100,
      overscan: 0,
    })
    expect(r.startIndex).toBe(3)
    expect(r.endIndex).toBe(6)
    expect(r.paddingTop).toBe(100) // offsets[3]
    expect(r.paddingBottom).toBe(0)
  })

  it('overscan 前後各擴張列數', () => {
    const r = computeVirtualWindow({
      heights,
      scrollTop: 100,
      viewportHeight: 40,
      overscan: 1,
    })
    // 可視 100~140 → first=3 last=5；overscan 1 → startIndex=2 endIndex=6
    expect(r.startIndex).toBe(2)
    expect(r.endIndex).toBe(6)
  })

  it('空 heights 回傳零', () => {
    const r = computeVirtualWindow({
      heights: [],
      scrollTop: 0,
      viewportHeight: 100,
    })
    expect(r).toEqual({
      startIndex: 0,
      endIndex: 0,
      paddingTop: 0,
      paddingBottom: 0,
    })
  })
})

describe('computeScrollIntoViewVariable（變高）', () => {
  const heights = [28, 36, 36, 28, 36, 36] // offsets 0,28,64,100,128,164,200

  it('已可見回傳 null', () => {
    // 可視 0~100；row 2 頂端 64 高 36（64~100）剛好內含
    expect(
      computeScrollIntoViewVariable({
        heights,
        rowIndex: 2,
        scrollTop: 0,
        viewportHeight: 100,
      }),
    ).toBeNull()
  })

  it('在可視下方 對齊底端（用累積高度而非 index×h）', () => {
    // row 4 頂端 128 高 36（128~164）在可視底 100 之下 → 164-100=64
    expect(
      computeScrollIntoViewVariable({
        heights,
        rowIndex: 4,
        scrollTop: 0,
        viewportHeight: 100,
      }),
    ).toBe(64)
  })

  it('在可視上方 對齊頂端', () => {
    // scrollTop=140；row 1 頂端 28 < 140 → 回傳 28
    expect(
      computeScrollIntoViewVariable({
        heights,
        rowIndex: 1,
        scrollTop: 140,
        viewportHeight: 100,
      }),
    ).toBe(28)
  })

  it('rowIndex 超界回傳 null', () => {
    const args = { heights, scrollTop: 0, viewportHeight: 100 }
    expect(computeScrollIntoViewVariable({ ...args, rowIndex: -1 })).toBeNull()
    expect(computeScrollIntoViewVariable({ ...args, rowIndex: 6 })).toBeNull()
  })
})
