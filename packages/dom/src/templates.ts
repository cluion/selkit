/**
 * @selkit/dom — 下拉選項的 DOM 構建（純函式）
 *
 * 把分組標題、建立列、選項列與虛擬捲動佔位抽成不持狀態的構建函式
 * 由 dom.ts 的渲染協調層呼叫 不依賴 instance
 */
import type { HighlightPart, SelkitA11y, SelkitOption } from '@selkit/core'
import type { CreateRow, GroupRow, OptionRow, TreeRow } from './types'

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
  group.style.setProperty('--selkit-depth', String(row.depth))
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

/** 渲染高亮片段：match 段包 <mark>，其餘純文字節點 */
function renderHighlightParts(
  host: HTMLElement,
  parts: HighlightPart[],
  prefix: string,
): void {
  for (const part of parts) {
    if (part.match) {
      const mark = document.createElement('mark')
      mark.className = `${prefix}__match`
      mark.textContent = part.text
      host.append(mark)
    } else if (part.text !== '') {
      host.append(document.createTextNode(part.text))
    }
  }
}

/** 選項列 套用 templateOption（無則用 label，或高亮命中片段）*/
export function buildOption<T>(
  row: OptionRow<T>,
  prefix: string,
  a11y: SelkitA11y,
  activeIndex: number,
  templateOption?: (
    option: SelkitOption<T>,
    meta: { index: number; active: boolean; selected: boolean },
  ) => string | Node,
  highlight?: (label: string) => HighlightPart[],
): HTMLElement {
  const attrs = a11y.option(row.index)
  const option = document.createElement('div')
  option.className = `${prefix}__option`
  option.id = attrs.id
  option.dataset.index = String(row.index)
  option.style.setProperty('--selkit-depth', String(row.depth))
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
  } else if (highlight) {
    renderHighlightParts(option, highlight(row.option.label), prefix)
  } else {
    option.textContent = row.option.label
  }
  return option
}

/** tree 模式節點列：可選父／葉 帶展開箭頭 與 option 共用樣式  */
export function buildTreeRow<T>(
  row: TreeRow<T>,
  prefix: string,
  a11y: SelkitA11y,
  activeIndex: number,
  multiple: boolean,
  highlight?: (label: string) => HighlightPart[],
): HTMLElement {
  const attrs = a11y.option(row.index)
  const el = document.createElement('div')
  el.className = `${prefix}__option ${prefix}__treeitem`
  el.id = attrs.id
  el.dataset.index = String(row.index)
  el.dataset.checked = row.checked
  el.style.setProperty('--selkit-depth', String(row.depth))
  el.setAttribute('role', 'treeitem')
  el.setAttribute('aria-selected', String(attrs['aria-selected']))
  if (attrs['aria-checked'] !== undefined) {
    el.setAttribute('aria-checked', String(attrs['aria-checked']))
  }
  if (attrs['aria-disabled']) el.setAttribute('aria-disabled', 'true')
  if (row.hasChildren) el.setAttribute('aria-expanded', String(row.expanded))
  if (row.index === activeIndex) el.classList.add(`${prefix}__option--active`)
  if (attrs['aria-selected']) el.classList.add(`${prefix}__option--selected`)
  // 展開箭頭：父可點（data-toggle 帶 index）葉用 spacer 對齊縮排
  const toggle = document.createElement(row.hasChildren ? 'button' : 'span')
  toggle.className = `${prefix}__toggle`
  if (row.hasChildren) {
    ;(toggle as HTMLButtonElement).type = 'button'
    toggle.dataset.toggle = String(row.index)
    toggle.tabIndex = -1
    toggle.setAttribute('aria-hidden', 'true')
    toggle.textContent = row.expanded ? '▾' : '▸'
  }
  el.append(toggle)
  // 多選三態 checkbox（cascade 全選／半選／未選）
  if (multiple) {
    const cb = document.createElement('span')
    cb.className = `${prefix}__checkbox ${prefix}__checkbox--${row.checked}`
    cb.setAttribute('aria-hidden', 'true')
    el.append(cb)
  }
  if (highlight) renderHighlightParts(el, highlight(row.option.label), prefix)
  else el.append(document.createTextNode(row.option.label))
  return el
}
