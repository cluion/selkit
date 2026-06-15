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
 * block: 'nearest' 的核心數學：給定某列頂端 y 與高度 算出讓它剛好可見所需的 scrollTop
 * 已在可視範圍內回傳 null（不動） 否則回傳對齊頂或底的新 scrollTop
 */
function nearestScroll(
  itemTop: number,
  itemHeight: number,
  scrollTop: number,
  viewportHeight: number,
): number | null {
  if (itemHeight <= 0) return null
  const itemBottom = itemTop + itemHeight
  if (itemTop < scrollTop) return itemTop // 在可視區上方 對齊頂端
  if (itemBottom > scrollTop + viewportHeight) {
    return itemBottom - viewportHeight // 在可視區下方 對齊底端
  }
  return null // 已可見 不動
}

/**
 * 算出讓第 index 列剛好可見所需的 scrollTop（block: 'nearest' 語意 最小移動）
 * 均高用：offset = index × itemHeight。供扁平虛擬捲動「作用中選項捲入視窗」使用
 */
export function computeScrollIntoView(input: ScrollIntoViewInput): number | null {
  const { index, scrollTop, viewportHeight, itemHeight } = input
  if (itemHeight <= 0 || index < 0) return null
  return nearestScroll(index * itemHeight, itemHeight, scrollTop, viewportHeight)
}

export interface VirtualWindowInput {
  /** 每列高度（如分組 header 與 option 高度不同）長度即列總數 */
  heights: number[]
  /** 捲動容器目前的 scrollTop */
  scrollTop: number
  /** 捲動容器可視高度 */
  viewportHeight: number
  /** 可視範圍前後額外緩衝列數 預設 4 */
  overscan?: number
}

/** heights 的前綴和：offsets[i] = 第 i 列頂端 y；offsets[n] = 總高 */
function prefixOffsets(heights: number[]): number[] {
  const offsets = new Array<number>(heights.length + 1)
  offsets[0] = 0
  for (let i = 0; i < heights.length; i++) {
    offsets[i + 1] = offsets[i]! + Math.max(0, heights[i] ?? 0)
  }
  return offsets
}

/**
 * 變高版可視窗格：每列高度可不同 給定 scrollTop 算出該渲染的切片與上下佔位
 * 用於分組虛擬捲動（header 與 option 高度不同）扁平均高仍走 computeVirtualRange（O(1)）
 */
export function computeVirtualWindow(input: VirtualWindowInput): VirtualRange {
  const { heights, scrollTop, viewportHeight } = input
  const overscan = input.overscan ?? 4
  const itemCount = heights.length
  if (itemCount === 0) {
    return { startIndex: 0, endIndex: 0, paddingTop: 0, paddingBottom: 0 }
  }

  const offsets = prefixOffsets(heights)
  const total = offsets[itemCount]!

  // 第一個底端 > scrollTop 的列（可視頂端所在）
  let first = 0
  while (first < itemCount && offsets[first + 1]! <= scrollTop) first++
  // 第一個頂端 >= 可視底端的列（可視範圍結束）
  const bottom = scrollTop + viewportHeight
  let last = first
  while (last < itemCount && offsets[last]! < bottom) last++

  const startIndex = Math.max(0, first - overscan)
  const endIndex = Math.min(itemCount, last + overscan)

  return {
    startIndex,
    endIndex,
    paddingTop: offsets[startIndex]!,
    paddingBottom: total - offsets[endIndex]!,
  }
}

export interface ScrollIntoViewVariableInput {
  /** 每列高度 與 computeVirtualWindow 同一份 */
  heights: number[]
  /** 要捲入可視的列索引（在 heights / rows 中的位置 非 visibleOptions 索引） */
  rowIndex: number
  /** 捲動容器目前的 scrollTop */
  scrollTop: number
  /** 捲動容器可視高度 */
  viewportHeight: number
}

/**
 * 變高版 scrollIntoView：由 heights 前綴和取得第 rowIndex 列的頂端 y 與高度 再算 nearest
 * 供分組虛擬捲動「作用中選項捲入視窗」使用
 */
export function computeScrollIntoViewVariable(
  input: ScrollIntoViewVariableInput,
): number | null {
  const { heights, rowIndex, scrollTop, viewportHeight } = input
  if (rowIndex < 0 || rowIndex >= heights.length) return null
  let itemTop = 0
  for (let i = 0; i < rowIndex; i++) itemTop += Math.max(0, heights[i] ?? 0)
  return nearestScroll(
    itemTop,
    Math.max(0, heights[rowIndex] ?? 0),
    scrollTop,
    viewportHeight,
  )
}
