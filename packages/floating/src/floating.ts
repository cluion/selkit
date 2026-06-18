/**
 * @selkit/floating — 進階浮層定位器（薄包 @floating-ui/dom）
 *
 * 提供 flip / shift / size 防遮擋定位 作為 @selkit/dom 預設零依賴定位器的選裝升級
 * 設計分兩層：
 *   - position()：框架無關的純定位計算 任何 adapter（含日後 vue/react）皆可呼叫
 *   - applyPosition()：純函式 把計算結果套到 floating 元素（可單元測 不依賴 floating-ui）
 *   - createFloatingPositioner()：相容 @selkit/dom PositionerFactory 的工廠（含 autoUpdate 迴圈）
 */
import {
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
  size,
  type Placement,
} from '@floating-ui/dom'

export type { Placement }

/**
 * 與 @selkit/dom 的 Positioner / PositionerOptions 結構相容
 * floating 因此對 @selkit/dom 零依賴：執行期只需 @floating-ui/dom 型別亦不耦合
 */
export interface Positioner {
  update(): void
  destroy(): void
}
export interface PositionerOptions {
  autoWidth?: boolean
  gap?: number
}

/** position() / createFloatingPositioner() 的設定 在 PositionerOptions 之上補進階定位選項 */
export interface FloatingOptions extends PositionerOptions {
  /** 主放置方位 預設 'bottom-start'（貼下、對齊左緣 與內建定位器一致） */
  placement?: Placement
  /** flip / shift / size 與視窗邊界的留白 px 預設 8 */
  padding?: number
}

/** position() 的回傳 placement 為翻轉後的最終方位 availableHeight 為 size 量到的可用高度 */
export interface FloatingResult {
  x: number
  y: number
  placement: Placement
  availableWidth: number
  availableHeight: number
}

/**
 * 框架無關的定位計算 不觸碰樣式 供任一 adapter 取座標後自行套用
 * middleware 順序：offset → flip（垂直翻轉）→ shift（水平防遮擋）→ size（量可用空間）
 */
export async function position(
  reference: HTMLElement,
  floating: HTMLElement,
  opts: FloatingOptions = {},
): Promise<FloatingResult> {
  const { gap = 4, placement = 'bottom-start', padding = 8 } = opts
  let available = { width: 0, height: 0 }

  const result = await computePosition(reference, floating, {
    strategy: 'fixed',
    placement,
    middleware: [
      offset(gap),
      flip({ padding }),
      shift({ padding }),
      size({
        padding,
        apply({ availableWidth, availableHeight }) {
          available = { width: availableWidth, height: availableHeight }
        },
      }),
    ],
  })

  return {
    x: result.x,
    y: result.y,
    placement: result.placement,
    availableWidth: available.width,
    availableHeight: available.height,
  }
}

/**
 * 純函式：把計算結果套到 floating 元素的 style
 * 產出與 @selkit/dom 內建定位器一致的 DOM 契約（position:fixed、寬度、data-placement）
 * 以便沿用 themes 樣式與消費端的 [data-placement] CSS
 */
export function applyPosition(
  floating: HTMLElement,
  referenceWidth: number,
  result: FloatingResult,
  opts: { autoWidth?: boolean } = {},
): void {
  floating.style.position = 'fixed'
  floating.style.left = `${result.x}px`
  floating.style.top = `${result.y}px`
  floating.style.maxHeight = `${result.availableHeight}px`

  if (opts.autoWidth) {
    // 至少與控制項同寬 內容更寬時隨之增長
    floating.style.minWidth = `${referenceWidth}px`
    floating.style.width = 'max-content'
  } else {
    floating.style.width = `${referenceWidth}px`
  }

  // 沿用既有 data-placement 慣例（top/bottom）供 CSS 與箭頭翻轉辨識
  floating.dataset.placement = result.placement.startsWith('top') ? 'top' : 'bottom'
}

/**
 * 建立相容 @selkit/dom PositionerFactory 的進階定位器
 * 透過 floating-ui 的 autoUpdate 隨捲動 / resize / 元素尺寸變化重算（涵蓋祖先捲動）
 *
 * 用法：
 *   import { createSelkitDom } from '@selkit/dom'
 *   import { createFloatingPositioner } from '@selkit/floating'
 *   createSelkitDom(el, { positioner: createFloatingPositioner })
 *
 * 自訂 placement / padding 時以閉包包裝：
 *   positioner: (t, d, o) => createFloatingPositioner(t, d, { ...o, placement: 'top-start', padding: 12 })
 */
export function createFloatingPositioner(
  reference: HTMLElement,
  floating: HTMLElement,
  opts: FloatingOptions = {},
): Positioner {
  const { autoWidth = false } = opts

  const update = (): void => {
    void position(reference, floating, opts).then((result) => {
      const referenceWidth = reference.getBoundingClientRect().width
      applyPosition(floating, referenceWidth, result, { autoWidth })
    })
  }

  const cleanup = autoUpdate(reference, floating, update)

  return {
    update,
    destroy() {
      cleanup()
    },
  }
}
