/**
 * @selkit/core — 內部工具：選項正規化與預設過濾
 */
import type {
  SelkitGroup,
  SelkitItem,
  SelkitLoadResult,
  SelkitOption,
} from './types'

/** 將 loadOptions 回傳統一為 { items, hasMore } 純陣列視為單頁且無更多  */
export function normalizeLoadResult<T>(
  raw: SelkitItem<T>[] | SelkitLoadResult<T>,
): { items: SelkitItem<T>[]; hasMore: boolean } {
  if (Array.isArray(raw)) return { items: raw, hasMore: false }
  return { items: raw.items, hasMore: raw.hasMore }
}

/** 去除變音符號並轉小寫 讓 cafe 能搜到 café */
export function normalizeText(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

/** 預設過濾：大小寫與變音符號皆不敏感的 label 子字串比對  */
export function defaultFilter<T>(option: SelkitOption<T>, query: string): boolean {
  if (query === '') return true
  return normalizeText(option.label).includes(normalizeText(query))
}

/** 子序列比對：query 的字元需依序（不必相鄰）出現於 text 同樣不敏感大小寫與變音符號  */
export function fuzzyMatch(text: string, query: string): boolean {
  const q = [...normalizeText(query)]
  if (q.length === 0) return true
  let i = 0
  for (const ch of normalizeText(text)) {
    if (ch === q[i]) i += 1
    if (i === q.length) return true
  }
  return false
}

/** fuzzy 過濾：對 label 做子序列比對  */
export function fuzzyFilter<T>(option: SelkitOption<T>, query: string): boolean {
  return fuzzyMatch(option.label, query)
}

/** 型別守衛：判斷 item 是否為分組  */
export function isGroup<T>(item: SelkitItem<T>): item is SelkitGroup<T> {
  return 'options' in item
}

/** 正規化後的列：分組標頭或選項（選項帶上所屬分組標籤 null 表頂層；depth 0 起供縮排）  */
export type NormRow<T> =
  | { kind: 'group'; label: string; disabled: boolean; depth: number }
  | { kind: 'option'; option: SelkitOption<T>; groupLabel: string | null; depth: number }

/** 遞迴深度上限 防呆循環參照 */
const MAX_GROUP_DEPTH = 64

/**
 * 將傳入的扁平/分組選項正規化為有序列 (rows) 與扁平清單 (flat)
 * 支援無限層分組：每列帶 depth（0 起）供 adapter 縮排
 * 分組的 disabled 會沿祖先鏈向下傳遞到所有子孫（產生新物件 不變動原始資料）
 */
export function normalize<T>(
  items: SelkitItem<T>[],
): { rows: NormRow<T>[]; flat: SelkitOption<T>[] } {
  const rows: NormRow<T>[] = []
  const flat: SelkitOption<T>[] = []

  const walk = (
    list: SelkitItem<T>[],
    depth: number,
    parentDisabled: boolean,
    parentLabel: string | null,
  ): void => {
    for (const item of list) {
      if (isGroup(item)) {
        if (depth >= MAX_GROUP_DEPTH) continue
        const disabled = parentDisabled || (item.disabled ?? false)
        rows.push({ kind: 'group', label: item.label, disabled, depth })
        const children = Array.isArray(item.options) ? item.options : []
        walk(children, depth + 1, disabled, item.label)
      } else {
        const disabled = parentDisabled || (item.disabled ?? false)
        const eff: SelkitOption<T> = disabled ? { ...item, disabled: true } : item
        rows.push({ kind: 'option', option: eff, groupLabel: parentLabel, depth })
        flat.push(eff)
      }
    }
  }

  walk(items, 0, false, null)
  return { rows, flat }
}

/** 樹狀正規化節點：父可選 帶 depth 與子節點  */
export interface NormNode<T = unknown> {
  option: SelkitOption<T>
  depth: number
  disabled: boolean
  children: NormNode<T>[]
}

/** 遞迴深度上限 防呆循環參照  */
const MAX_TREE_DEPTH = 64

/** option 是否帶非空 children  */
const hasChildren = <T>(o: SelkitOption<T>): boolean =>
  Array.isArray(o.children) && o.children.length > 0

/** 傳入選項是否含樹狀結構（任一 option 帶 children）→ 進 tree 模式  */
export function hasTree<T>(items: SelkitItem<T>[]): boolean {
  return items.some((i) => !isGroup(i) && hasChildren(i))
}

/**
 * 將帶 children 的選項樹正規化為 NormNode 樹與扁平序列（DFS 父＋葉）
 * disabled 沿祖先鏈向下傳遞（產生新物件 不變動原始資料）
 */
export function normalizeTree<T>(
  options: SelkitOption<T>[],
): { tree: NormNode<T>[]; flat: SelkitOption<T>[] } {
  const flat: SelkitOption<T>[] = []
  const build = (
    list: SelkitOption<T>[],
    depth: number,
    parentDisabled: boolean,
  ): NormNode<T>[] => {
    if (depth >= MAX_TREE_DEPTH) return []
    const nodes: NormNode<T>[] = []
    for (const item of list) {
      const disabled = parentDisabled || (item.disabled ?? false)
      const eff: SelkitOption<T> = disabled ? { ...item, disabled: true } : item
      flat.push(eff)
      const kids = Array.isArray(item.children) ? item.children : []
      nodes.push({
        option: eff,
        depth,
        disabled,
        children: kids.length ? build(kids, depth + 1, disabled) : [],
      })
    }
    return nodes
  }
  const tree = build(options, 0, false)
  return { tree, flat }
}
