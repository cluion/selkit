/**
 * @selkit/dom — 下拉選項的 DOM 構建（純函式）
 *
 * 把分組標題、建立列、選項列與虛擬捲動佔位抽成不持狀態的構建函式
 * 由 dom.ts 的渲染協調層呼叫 不依賴 instance
 */
import type { SelkitA11y, SelkitOption } from '@selkit/core'
import type { CreateRow, GroupRow, OptionRow } from './types'

/** 套用模板輸出：字串走 textContent（防 XSS）Node 直接掛入  */
export function applyTemplate(host: HTMLElement, out: string | Node): void {
  if (out instanceof Node) host.append(out)
  else host.textContent = out
}

/** 撐高佔位節點 維持虛擬捲動時的捲動總高度  */
export function spacer(height: number): HTMLElement {
  const el = document.createElement('div')
  el.style.height = `${height}px`
  el.setAttribute('aria-hidden', 'true')
  return el
}

/** 分組標題列 套用 templateGroup（無則用 label）*/
export function buildGroupRow(
  row: GroupRow,
  prefix: string,
  templateGroup?: (meta: { label: string; disabled: boolean }) => string | Node,
): HTMLElement {
  const group = document.createElement('div')
  group.className = `${prefix}__group`
  if (row.disabled) group.classList.add(`${prefix}__group--disabled`)
  if (templateGroup) {
    applyTemplate(
      group,
      templateGroup({ label: row.label, disabled: !!row.disabled }),
    )
  } else {
    group.textContent = row.label
  }
  return group
}

/** 「建立新項」列 共用 option 樣式與 a11y 但點擊走 createTag  */
export function buildCreateRow(
  row: CreateRow,
  prefix: string,
  a11y: SelkitA11y,
  activeIndex: number,
): HTMLElement {
  const attrs = a11y.option(row.index)
  const el = document.createElement('div')
  el.className = `${prefix}__option ${prefix}__create`
  el.id = attrs.id
  el.dataset.index = String(row.index)
  el.dataset.create = 'true'
  el.setAttribute('role', 'option')
  el.setAttribute('aria-selected', 'false')
  if (row.index === activeIndex) el.classList.add(`${prefix}__option--active`)
  el.textContent = row.label
  return el
}

/** 選項列 套用 templateOption（無則用 label）*/
export function buildOption<T>(
  row: OptionRow<T>,
  prefix: string,
  a11y: SelkitA11y,
  activeIndex: number,
  templateOption?: (
    option: SelkitOption<T>,
    meta: { index: number; active: boolean; selected: boolean },
  ) => string | Node,
): HTMLElement {
  const attrs = a11y.option(row.index)
  const option = document.createElement('div')
  option.className = `${prefix}__option`
  option.id = attrs.id
  option.dataset.index = String(row.index)
  option.setAttribute('role', 'option')
  option.setAttribute('aria-selected', String(attrs['aria-selected']))
  if (attrs['aria-disabled']) option.setAttribute('aria-disabled', 'true')
  if (row.index === activeIndex) {
    option.classList.add(`${prefix}__option--active`)
  }
  if (attrs['aria-selected']) {
    option.classList.add(`${prefix}__option--selected`)
  }
  if (templateOption) {
    const out = templateOption(row.option, {
      index: row.index,
      active: row.index === activeIndex,
      selected: attrs['aria-selected'],
    })
    if (out instanceof Node) option.append(out)
    else option.textContent = out
  } else {
    option.textContent = row.option.label
  }
  return option
}
