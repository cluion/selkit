/**
 * @selkit/dom — 公開型別契約
 *
 * 從 dom.ts 抽出：config / instance / row 型別，供 dom.ts 與 select-form.ts 共用
 */
import type {
  SelkitConfig,
  SelkitController,
  SelkitEmptyReason,
  SelkitOption,
  SelkitViewRow,
} from '@selkit/core'
import type { PositionerFactory } from './positioner'

export type OptionRow<T = unknown> = Extract<SelkitViewRow<T>, { type: 'option' }>
export type GroupRow = Extract<SelkitViewRow, { type: 'group' }>
export type TreeRow<T = unknown> = Extract<SelkitViewRow<T>, { type: 'treeitem' }>
export type CreateRow = Extract<SelkitViewRow, { type: 'create' }>

export interface SelkitDomConfig<T = unknown> extends SelkitConfig<T> {
  /** class 前綴 預設 "selkit" */
  classPrefix?: string
  /** 表單欄位名 設定後自動維護 hidden input 讓傳統表單 submit 帶值 */
  name?: string
  /** 多選時於選項顯示打勾（checkbox 樣式）選項點擊改為 toggle 不隱藏已選 */
  checkboxes?: boolean
  /** 輸入框寬度隨輸入字數增長（以 size 屬性近似）取代預設的 flex 撐滿 */
  autogrow?: boolean
  /** 下拉寬度貼齊內容（至少與控制項同寬 可更寬）而非固定等寬 */
  dropdownAutoWidth?: boolean
  /** 啟用虛擬捲動 大量選項時只渲染可視切片 僅在無分組的扁平清單生效 */
  virtualScroll?: boolean
  /** 虛擬捲動的單列固定高度 px 預設 36 須與實際樣式高度一致 */
  itemHeight?: number
  /** 虛擬捲動下分組標題列的固定高度 px 預設 28 須與實際樣式高度一致 */
  groupHeight?: number
  /** 把下拉浮層掛到指定容器（元素或選擇器）逃離 overflow/transform 祖先的裁切 常用 document.body */
  dropdownParent?: HTMLElement | string
  /** 自訂定位器工廠 預設為內建零依賴定位器（垂直翻轉）傳入 @selkit/floating 的 createFloatingPositioner 即啟用 flip/shift/size 進階定位 */
  positioner?: PositionerFactory
  /** 自訂已選顯示內容（tag 或單值） 回傳字串走 textContent 防 XSS 需 markup（icon 等）請回傳 Node */
  templateSelection?: (
    option: SelkitOption<T>,
    meta: { index: number; multiple: boolean },
  ) => string | Node
  /** 自訂下拉選項內容 回傳字串走 textContent 防 XSS 需 markup（icon 等）請回傳 Node */
  templateOption?: (
    option: SelkitOption<T>,
    meta: { index: number; active: boolean; selected: boolean },
  ) => string | Node
  /** 自訂下拉箭頭內容（▾）外殼保留 回傳 string 走 textContent Node 直接掛入 */
  templateArrow?: (meta: { open: boolean }) => string | Node
  /** 自訂清除鈕內容（×）按鈕外殼與 click 行為保留 */
  templateClear?: () => string | Node
  /** 自訂多選標籤移除鈕內容（×）按鈕外殼與 click 行為保留 */
  templateTagRemove?: (
    option: SelkitOption<T>,
    meta: { index: number },
  ) => string | Node
  /** 自訂分組標題內容 外殼保留 */
  templateGroup?: (meta: { label: string; disabled: boolean }) => string | Node
  /** 自訂下拉為空/載入中的整塊內容 reason 分流 message 為預設文字 */
  templateEmpty?: (meta: {
    reason: SelkitEmptyReason
    message: string
    query: string
  }) => string | Node
}

export interface SelkitDomInstance<T = unknown> {
  readonly controller: SelkitController<T>
  readonly element: HTMLElement
  destroy(): void
}
