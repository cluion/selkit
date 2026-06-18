/**
 * @selkit/dom — 預設輕量定位器（零依賴）
 *
 * 計算邏輯與 DOM 套用分離：computePosition 為純函式（可單元測）
 * attachPositioner 負責讀取 rect、套 style、監聽 scroll/resize
 */

export type Placement = 'bottom' | 'top'

export interface Rect {
  top: number
  bottom: number
  left: number
  width: number
}

export interface PositionResult {
  placement: Placement
  top: number
  left: number
  width: number
}

/**
 * 依觸發元件位置與下拉高度 決定放上方或下方（空間不足才翻轉）
 * 並回傳套用座標 不做水平翻轉（select 下拉慣例對齊左緣、同寬）
 */
export function computePosition(
  triggerRect: Rect,
  dropdownHeight: number,
  viewportHeight: number,
  gap = 4,
): PositionResult {
  const spaceBelow = viewportHeight - triggerRect.bottom
  const spaceAbove = triggerRect.top
  const placement: Placement =
    spaceBelow < dropdownHeight && spaceAbove > spaceBelow ? 'top' : 'bottom'
  const top =
    placement === 'bottom'
      ? triggerRect.bottom + gap
      : triggerRect.top - gap - dropdownHeight
  return { placement, top, left: triggerRect.left, width: triggerRect.width }
}

export interface Positioner {
  update(): void
  destroy(): void
}

/** 定位器工廠收到的選項 由 @selkit/dom 在開啟下拉時傳入 */
export interface PositionerOptions {
  /** 下拉寬度貼齊內容（至少與控制項同寬）而非固定等寬 */
  autoWidth?: boolean
  /** trigger 與下拉之間的間距 px 預設 4 */
  gap?: number
}

/**
 * 定位器工廠 可插拔點：@selkit/dom 預設用內建 attachPositioner
 * 傳入自訂工廠（如 @selkit/floating 的 createFloatingPositioner）即換成進階定位
 */
export type PositionerFactory = (
  trigger: HTMLElement,
  dropdown: HTMLElement,
  opts?: PositionerOptions,
) => Positioner

/** 將 dropdown 定位到 trigger 旁 並隨 scroll/resize 更新  */
export function attachPositioner(
  trigger: HTMLElement,
  dropdown: HTMLElement,
  autoWidth = false,
): Positioner {
  const update = (): void => {
    const rect = trigger.getBoundingClientRect()
    const pos = computePosition(rect, dropdown.offsetHeight, window.innerHeight)
    dropdown.style.position = 'fixed'
    dropdown.style.top = `${pos.top}px`
    dropdown.style.left = `${pos.left}px`
    if (autoWidth) {
      // 至少與控制項同寬 內容更寬時隨之增長
      dropdown.style.minWidth = `${pos.width}px`
      dropdown.style.width = 'max-content'
    } else {
      dropdown.style.width = `${pos.width}px`
    }
    dropdown.dataset.placement = pos.placement
  }

  const onScroll = (): void => update()
  const onResize = (): void => update()
  window.addEventListener('scroll', onScroll, true)
  window.addEventListener('resize', onResize)
  update()

  return {
    update,
    destroy() {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
    },
  }
}
