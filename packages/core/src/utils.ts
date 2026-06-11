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

/** 正規化後的列：分組標頭或選項（選項帶上所屬分組標籤 null 表頂層）  */
export type NormRow<T> =
  | { kind: 'group'; label: string; disabled: boolean }
  | { kind: 'option'; option: SelkitOption<T>; groupLabel: string | null }

/**
 * 將傳入的扁平/分組選項正規化為有序列 (rows) 與扁平清單 (flat)
 * 分組的 disabled 會向下傳遞到該組選項（產生新物件 不變動原始資料）
 */
export function normalize<T>(
  items: SelkitItem<T>[],
): { rows: NormRow<T>[]; flat: SelkitOption<T>[] } {
  const rows: NormRow<T>[] = []
  const flat: SelkitOption<T>[] = []

  for (const item of items) {
    if (isGroup(item)) {
      const groupDisabled = item.disabled ?? false
      rows.push({ kind: 'group', label: item.label, disabled: groupDisabled })
      for (const opt of item.options) {
        const eff: SelkitOption<T> =
          groupDisabled && !opt.disabled ? { ...opt, disabled: true } : opt
        rows.push({ kind: 'option', option: eff, groupLabel: item.label })
        flat.push(eff)
      }
    } else {
      rows.push({ kind: 'option', option: item, groupLabel: null })
      flat.push(item)
    }
  }

  return { rows, flat }
}
