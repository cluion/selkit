/**
 * @selkit/core — 內部工具：選項正規化與預設過濾
 */
import type { SelkitGroup, SelkitItem, SelkitOption } from './types'

/** 預設過濾：大小寫不敏感的 label 子字串比對  */
export function defaultFilter<T>(option: SelkitOption<T>, query: string): boolean {
  if (query === '') return true
  return option.label.toLowerCase().includes(query.toLowerCase())
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
