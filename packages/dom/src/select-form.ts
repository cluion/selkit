/**
 * @selkit/dom — 原生 <select> 整合
 *
 * 增強模式：從原生 <select> 讀出選項/值/屬性（parseSelectElement / mergeSelectConfig）
 * 與運行時雙向同步（syncToSelect / syncHiddenInputs）皆為純函式 不持狀態
 */
import type { SelkitItem, SelkitOption, SelkitValue } from '@selkit/core'
import type { SelkitDomConfig } from './types'

/** parseSelectElement 回傳的解析結果  */
export interface ParsedSelect {
  options: SelkitItem[]
  value: SelkitValue
  multiple: boolean
  disabled: boolean
  placeholder: string | undefined
  name: string | undefined
}

/** 從原生 <select> 讀出選項、初始值與屬性 供增強模式使用  */
export function parseSelectElement(select: HTMLSelectElement): ParsedSelect {
  const options: SelkitItem[] = []
  const selectedValues: Array<string | number> = []
  let placeholder = select.dataset.placeholder

  const readOption = (o: HTMLOptionElement): SelkitOption | null => {
    // 空 value option 視為 placeholder 佔位 不納入選項
    if (o.value === '') {
      if (!placeholder) placeholder = o.textContent?.trim() || undefined
      return null
    }
    if (o.selected) selectedValues.push(o.value)
    return {
      value: o.value,
      label: (o.label || o.textContent || o.value).trim(),
      ...(o.disabled ? { disabled: true } : {}),
    }
  }

  for (const child of Array.from(select.children)) {
    if (child instanceof HTMLOptGroupElement) {
      const opts: SelkitOption[] = []
      for (const o of Array.from(child.children)) {
        if (o instanceof HTMLOptionElement) {
          const parsed = readOption(o)
          if (parsed) opts.push(parsed)
        }
      }
      if (opts.length) {
        options.push({
          label: child.label,
          ...(child.disabled ? { disabled: true } : {}),
          options: opts,
        })
      }
    } else if (child instanceof HTMLOptionElement) {
      const parsed = readOption(child)
      if (parsed) options.push(parsed)
    }
  }

  const value: SelkitValue = select.multiple
    ? selectedValues
    : (selectedValues[0] ?? null)

  return {
    options,
    value,
    multiple: select.multiple,
    disabled: select.disabled,
    placeholder,
    name: select.name || undefined,
  }
}

/** 把原生 <select> 解析出的設定合併進使用者 config 使用者明確設定優先  */
export function mergeSelectConfig<T>(
  config: SelkitDomConfig<T>,
  select: HTMLSelectElement,
): SelkitDomConfig<T> {
  const parsed = parseSelectElement(select)
  return {
    ...config,
    options: config.options ?? (parsed.options as SelkitItem<T>[]),
    multiple: config.multiple ?? parsed.multiple,
    value: config.value ?? parsed.value,
    disabled: config.disabled ?? parsed.disabled,
    placeholder: config.placeholder ?? parsed.placeholder,
    name: config.name ?? parsed.name,
  }
}

/** 把已選同步回原生 <select>（tagging 新增的選項補進去）讓表單提交帶值  */
export function syncToSelect(
  select: HTMLSelectElement,
  selected: SelkitOption[],
): void {
  const selectedSet = new Set(selected.map((o) => String(o.value)))
  // tagging 新增的選項補進原生 select 才能被提交
  for (const opt of selected) {
    const value = String(opt.value)
    if (!Array.from(select.options).some((o) => o.value === value)) {
      const el = document.createElement('option')
      el.value = value
      el.textContent = opt.label
      select.append(el)
    }
  }
  for (const o of Array.from(select.options)) {
    o.selected = selectedSet.has(o.value)
  }
  select.dispatchEvent(new Event('change', { bubbles: true }))
}

/** 維護 hidden input（name 設定時）讓無原生 select 的表單也能 submit 帶值  */
export function syncHiddenInputs(
  container: HTMLDivElement,
  opts: { name: string; multiple: boolean; selected: SelkitOption[] },
): void {
  container.replaceChildren()
  const inputName = opts.multiple ? `${opts.name}[]` : opts.name
  const values = opts.multiple ? opts.selected : opts.selected.slice(0, 1)
  for (const opt of values) {
    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = inputName
    input.value = String(opt.value)
    container.append(input)
  }
}
