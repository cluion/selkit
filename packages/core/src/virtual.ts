/**
 * @selkit/core — 虛擬捲動的可視範圍計算
 *
 * 純函式不碰 DOM 給定捲動位置與固定列高算出該渲染的切片與上下佔位高度
 * 各 adapter 量好 scrollTop/viewportHeight 後共用此邏輯 行為三框架一致
 */

export interface VirtualRange {
  /** 該渲染的起始索引（含） */
  startIndex: number
  /** 該渲染的結束索引（不含） */
  endIndex: number
  /** 上方佔位高度 px 撐起被略過的前段列 */
  paddingTop: number
  /** 下方佔位高度 px 撐起被略過的後段列 */
  paddingBottom: number
}

export interface VirtualRangeInput {
  /** 捲動容器目前的 scrollTop */
  scrollTop: number
  /** 捲動容器可視高度 */
  viewportHeight: number
  /** 單列固定高度 必須大於 0 才啟用虛擬化 */
  itemHeight: number
  /** 列總數 */
  itemCount: number
  /** 可視範圍前後額外緩衝列數 預設 4 */
  overscan?: number
}

/** 依捲動位置與固定列高算出虛擬捲動的可視切片與上下佔位 */
export function computeVirtualRange(input: VirtualRangeInput): VirtualRange {
  const { scrollTop, viewportHeight, itemHeight, itemCount } = input
  const overscan = input.overscan ?? 4

  // 無列或列高非正值時不虛擬化 直接回傳完整範圍
  if (itemHeight <= 0 || itemCount <= 0) {
    return {
      startIndex: 0,
      endIndex: itemCount > 0 ? itemCount : 0,
      paddingTop: 0,
      paddingBottom: 0,
    }
  }

  const first = Math.floor(scrollTop / itemHeight)
  const visible = Math.ceil(viewportHeight / itemHeight)
  const startIndex = Math.max(0, first - overscan)
  const endIndex = Math.min(itemCount, first + visible + overscan)

  return {
    startIndex,
    endIndex,
    paddingTop: startIndex * itemHeight,
    paddingBottom: (itemCount - endIndex) * itemHeight,
  }
}

export interface ScrollIntoViewInput {
  /** 要捲入可視的列索引（固定列高下 offset = index × itemHeight） */
  index: number
  /** 捲動容器目前的 scrollTop */
  scrollTop: number
  /** 捲動容器可視高度 */
  viewportHeight: number
  /** 單列固定高度 */
  itemHeight: number
}

/**
 * 算出讓第 index 列剛好可見所需的 scrollTop（block: 'nearest' 語意 最小移動）
 * 已在可視範圍內回傳 null（不動） 否則回傳對齊頂或底的新 scrollTop
 * 供虛擬捲動下「作用中選項捲入視窗」使用（該列可能尚未渲染 無法靠 DOM）
 */
export function computeScrollIntoView(input: ScrollIntoViewInput): number | null {
  const { index, scrollTop, viewportHeight, itemHeight } = input
  if (itemHeight <= 0 || index < 0) return null

  const itemTop = index * itemHeight
  const itemBottom = itemTop + itemHeight

  if (itemTop < scrollTop) return itemTop // 在可視區上方 對齊頂端
  if (itemBottom > scrollTop + viewportHeight) {
    return itemBottom - viewportHeight // 在可視區下方 對齊底端
  }
  return null // 已可見 不動
}
