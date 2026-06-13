/**
 * @selkit/react — SelkitSelect 元件
 *
 * 用 React 渲染 行為全部委派給 @selkit/core controller
 * 支援受控 value + onChange 多選 搜尋 分組 與 renderOption 自訂選項
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type {
  ChangeEvent,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from 'react'
import { computeVirtualRange } from '@selkit/core'
import type {
  SelkitItem,
  SelkitLoadResult,
  SelkitMessages,
  SelkitOption,
  SelkitValue,
  SelkitViewRow,
} from '@selkit/core'
import { useSelkit } from './useSelkit'

/** 捲動距底多少 px 內即預載下一頁 */
const LOAD_MORE_THRESHOLD = 32

type OptionRow<T> = Extract<SelkitViewRow<T>, { type: 'option' }>

function sameValue(a: SelkitValue, b: SelkitValue): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((x, i) => x === b[i])
  }
  return a === b
}

export interface SelkitChangePayload<T = unknown> {
  selected: SelkitOption<T>[]
  value: SelkitValue
}

export interface SelkitSelectProps<T = unknown> {
  options?: SelkitItem<T>[]
  value?: SelkitValue
  onChange?: (value: SelkitValue, payload: SelkitChangePayload<T>) => void
  multiple?: boolean
  placeholder?: string
  searchable?: boolean
  minResultsForSearch?: number
  fuzzy?: boolean
  minInputLength?: number
  hideSelected?: boolean
  virtualScroll?: boolean
  itemHeight?: number
  dropdownParent?: string | HTMLElement
  clearable?: boolean
  disabled?: boolean
  classPrefix?: string
  loadOptions?: (
    query: string,
    page: number,
  ) => Promise<SelkitItem<T>[] | SelkitLoadResult<T>>
  debounce?: number
  taggable?: boolean
  createTag?: (query: string) => SelkitOption<T>
  maxSelections?: number
  messages?: Partial<SelkitMessages>
  renderOption?: (
    option: SelkitOption<T>,
    meta: { index: number; active: boolean; selected: boolean },
  ) => ReactNode
  /** 自訂已選顯示內容（tag 或單值） 用於放 icon 等 框架仍保留 tag 外殼與移除鈕 */
  renderSelection?: (
    option: SelkitOption<T>,
    meta: { index: number; multiple: boolean },
  ) => ReactNode
}

export function SelkitSelect<T = unknown>(props: SelkitSelectProps<T>) {
  const {
    options = [],
    value,
    onChange,
    multiple = false,
    placeholder = '',
    searchable = true,
    minResultsForSearch,
    fuzzy = false,
    minInputLength,
    hideSelected = false,
    virtualScroll = false,
    itemHeight = 36,
    dropdownParent,
    clearable,
    disabled = false,
    classPrefix = 'selkit',
    loadOptions,
    debounce,
    taggable = false,
    createTag,
    maxSelections,
    messages,
    renderOption,
    renderSelection,
  } = props

  const cls = (name: string, mod?: string): string => {
    const base = name ? `${classPrefix}__${name}` : classPrefix
    return mod ? `${base}--${mod}` : base
  }

  const { controller, state } = useSelkit<T>({
    options,
    value,
    multiple,
    placeholder,
    searchable,
    disabled,
    taggable,
    fuzzy,
    hideSelected,
    ...(minInputLength !== undefined ? { minInputLength } : {}),
    ...(minResultsForSearch !== undefined ? { minResultsForSearch } : {}),
    ...(clearable !== undefined ? { clearable } : {}),
    ...(loadOptions ? { loadOptions } : {}),
    ...(debounce !== undefined ? { debounce } : {}),
    ...(createTag ? { createTag } : {}),
    ...(maxSelections !== undefined ? { maxSelections } : {}),
    ...(messages ? { messages } : {}),
  })

  const [query, setQuery] = useState('')
  const queryRef = useRef('')
  queryRef.current = query
  const rootRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const dropdownRef = useRef<HTMLDivElement | null>(null)
  const dragFromRef = useRef(-1)
  const [scrollTop, setScrollTop] = useState(0)
  const [portalPos, setPortalPos] = useState({ top: 0, left: 0, width: 0 })
  const portalTarget = useMemo<HTMLElement | null>(() => {
    if (!dropdownParent) return null
    return typeof dropdownParent === 'string'
      ? document.querySelector<HTMLElement>(dropdownParent)
      : dropdownParent
  }, [dropdownParent])
  const syncingRef = useRef(false)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  // change → onChange callback
  useEffect(() => {
    const off = controller.on('change', (e) => {
      if (syncingRef.current) return
      onChangeRef.current?.(e.value, e)
    })
    return off
  }, [controller])

  // tagging 建立後清空搜尋字
  useEffect(() => {
    const off = controller.on('create', () => {
      setQuery('')
      queryRef.current = ''
    })
    return off
  }, [controller])

  // close → 清空搜尋字 回復完整選項
  useEffect(() => {
    const off = controller.on('close', () => {
      if (queryRef.current !== '') {
        setQuery('')
        controller.setQuery('')
      }
    })
    return off
  }, [controller])

  // 受控 value → controller 同步 用 syncingRef 防回灌迴圈
  useEffect(() => {
    if (value === undefined) return
    const s = controller.getState()
    const current = multiple
      ? s.selected.map((o) => o.value)
      : (s.selected[0]?.value ?? null)
    if (sameValue(value, current)) return
    syncingRef.current = true
    controller.clear()
    const vals = Array.isArray(value) ? value : value == null ? [] : [value]
    for (const v of vals) controller.select(v)
    syncingRef.current = false
  }, [value, multiple, controller])

  useEffect(() => {
    controller.setOptions(options)
  }, [options, controller])

  useEffect(() => {
    controller.setDisabled(disabled)
  }, [disabled, controller])

  useEffect(() => {
    const handler = (e: Event): void => {
      const target = e.target as Node
      // portal 模式下拉在元件之外 需一併視為內部點擊
      const inside =
        rootRef.current?.contains(target) || dropdownRef.current?.contains(target)
      if (!inside) controller.close()
    }
    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [controller])

  // portal 模式下用 fixed 座標定位 量測 root rect 並隨 scroll/resize 更新
  useEffect(() => {
    if (!portalTarget || !state.isOpen) return
    const update = (): void => {
      const el = rootRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      setPortalPos({ top: r.bottom + 4, left: r.left, width: r.width })
    }
    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [portalTarget, state.isOpen])

  const onControlPointerDown = (e: ReactPointerEvent<HTMLDivElement>): void => {
    const target = e.target as HTMLElement
    if (target.closest(`.${cls('clear')}`)) {
      e.preventDefault()
      controller.clear()
      return
    }
    const tagRemove = target.closest(
      `.${cls('tag-remove')}`,
    ) as HTMLElement | null
    if (tagRemove) {
      e.preventDefault()
      const idx = Number(tagRemove.dataset.index)
      const sel = controller.getState().selected[idx]
      if (sel) controller.deselect(sel.value)
      return
    }
    if (target.closest(`.${cls('input')}`)) {
      controller.open()
      return
    }
    e.preventDefault()
    inputRef.current?.focus()
    controller.toggle()
  }

  const onInputChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const v = e.target.value
    setQuery(v)
    queryRef.current = v
    controller.open()
    controller.setQuery(v)
  }

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>): void => {
    const s = controller.getState()
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        s.isOpen ? controller.moveActive(1) : controller.open()
        break
      case 'ArrowUp':
        e.preventDefault()
        s.isOpen ? controller.moveActive(-1) : controller.open()
        break
      case 'Enter':
        if (s.isOpen) {
          e.preventDefault()
          controller.selectActive()
        }
        break
      case 'Escape':
        if (s.isOpen) {
          e.preventDefault()
          controller.close()
        }
        break
      case 'Home':
        if (s.isOpen) {
          e.preventDefault()
          controller.moveActiveToStart()
        }
        break
      case 'End':
        if (s.isOpen) {
          e.preventDefault()
          controller.moveActiveToEnd()
        }
        break
      case 'Backspace':
        if (multiple && queryRef.current === '' && s.selected.length) {
          const last = s.selected[s.selected.length - 1]
          if (last) controller.deselect(last.value)
        }
        break
    }
  }

  const s = state
  const a11y = controller.a11y()
  const view = controller.getGroupedView()
  const clearableResolved = clearable ?? !multiple
  const single = s.selected[0]

  const rootClass = [classPrefix]
  if (multiple) rootClass.push(cls('', 'multiple'))
  if (s.isOpen) rootClass.push(cls('', 'open'))
  if (s.disabled) rootClass.push(cls('', 'disabled'))

  const buildOption = (row: OptionRow<T>): ReactNode => {
    const attrs = a11y.option(row.index)
    const isDisabled = attrs['aria-disabled'] === true
    const optClass = [cls('option')]
    if (row.index === s.activeIndex) optClass.push(cls('option', 'active'))
    if (attrs['aria-selected']) optClass.push(cls('option', 'selected'))
    return (
      <div
        key={`opt-${row.option.value}`}
        className={optClass.join(' ')}
        id={attrs.id}
        role="option"
        aria-selected={attrs['aria-selected']}
        aria-disabled={isDisabled || undefined}
        onPointerDown={(e) => {
          if (isDisabled) return
          e.preventDefault()
          controller.select(row.option.value)
        }}
      >
        {renderOption
          ? renderOption(row.option, {
              index: row.index,
              active: row.index === s.activeIndex,
              selected: attrs['aria-selected'],
            })
          : row.option.label}
      </div>
    )
  }

  const hasGroups = view.rows.some((r) => r.type === 'group')
  let dropdownContent: ReactNode
  if (view.rows.length === 0) {
    dropdownContent = (
      <div className={cls('empty')}>{controller.getEmptyMessage()}</div>
    )
  } else if (virtualScroll && !hasGroups) {
    // 虛擬捲動僅在無分組的扁平清單啟用
    const range = computeVirtualRange({
      scrollTop,
      viewportHeight: dropdownRef.current?.clientHeight ?? 0,
      itemHeight,
      itemCount: view.rows.length,
    })
    const slice: ReactNode[] = []
    for (let i = range.startIndex; i < range.endIndex; i++) {
      const row = view.rows[i]
      if (row?.type === 'option') slice.push(buildOption(row))
    }
    dropdownContent = (
      <>
        <div aria-hidden style={{ height: range.paddingTop }} />
        {slice}
        <div aria-hidden style={{ height: range.paddingBottom }} />
      </>
    )
  } else {
    dropdownContent = view.rows.map((row) =>
      row.type === 'group' ? (
        <div className={cls('group')} key={`group-${row.label}`}>
          {row.label}
        </div>
      ) : (
        buildOption(row)
      ),
    )
  }

  // portal 模式把下拉用 createPortal 送到 dropdownParent 並補 prefix class 讓 CSS 變數解析
  const renderDropdown = (): ReactNode => {
    const el = (
      <div
        ref={dropdownRef}
        className={
          portalTarget ? `${cls('dropdown')} ${classPrefix}` : cls('dropdown')
        }
        id={a11y.listbox.id}
        role="listbox"
        aria-multiselectable={multiple || undefined}
        style={
          portalTarget
            ? {
                position: 'fixed',
                top: portalPos.top,
                left: portalPos.left,
                width: portalPos.width,
              }
            : {
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                width: '100%',
              }
        }
        onPointerDown={(e) => e.stopPropagation()}
        onScroll={(e) => {
          const node = e.currentTarget
          setScrollTop(node.scrollTop)
          if (
            node.scrollTop + node.clientHeight >=
            node.scrollHeight - LOAD_MORE_THRESHOLD
          ) {
            controller.loadMore()
          }
        }}
      >
        {dropdownContent}
      </div>
    )
    return portalTarget ? createPortal(el, portalTarget) : el
  }

  return (
    <div className={rootClass.join(' ')} ref={rootRef}>
      <div
        className={cls('control')}
        role="combobox"
        tabIndex={0}
        aria-expanded={s.isOpen}
        aria-haspopup="listbox"
        aria-controls={a11y.listbox.id}
        aria-activedescendant={a11y.trigger['aria-activedescendant']}
        aria-disabled={s.disabled || undefined}
        onPointerDown={onControlPointerDown}
        onKeyDown={onKeyDown}
      >
        <div
          className={cls('field')}
          onDragStart={(e) => {
            const tag = (e.target as HTMLElement).closest(`.${cls('tag')}`)
            if (!(tag instanceof HTMLElement)) return
            dragFromRef.current = Number(tag.dataset.index)
            if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
          }}
          onDragOver={(e) => {
            if (dragFromRef.current >= 0) e.preventDefault()
          }}
          onDrop={(e) => {
            if (dragFromRef.current < 0) return
            e.preventDefault()
            const tag = (e.target as HTMLElement).closest(`.${cls('tag')}`)
            const to =
              tag instanceof HTMLElement
                ? Number(tag.dataset.index)
                : controller.getState().selected.length - 1
            controller.moveSelected(dragFromRef.current, to)
            dragFromRef.current = -1
          }}
          onDragEnd={() => {
            dragFromRef.current = -1
          }}
        >
          {multiple ? (
            s.selected.map((opt, i) => (
              <span
                className={cls('tag')}
                key={`tag-${opt.value}`}
                draggable
                data-index={i}
              >
                <span className={cls('tag-label')}>
                  {renderSelection
                    ? renderSelection(opt, { index: i, multiple: true })
                    : opt.label}
                </span>
                <button
                  type="button"
                  className={cls('tag-remove')}
                  data-index={i}
                  aria-label={`Remove ${opt.label}`}
                >
                  ×
                </button>
              </span>
            ))
          ) : single && query === '' ? (
            <span className={cls('single-value')}>
              {renderSelection
                ? renderSelection(single, { index: 0, multiple: false })
                : single.label}
            </span>
          ) : null}
          <input
            ref={inputRef}
            className={cls('input')}
            type="text"
            autoComplete="off"
            aria-autocomplete="list"
            value={query}
            placeholder={s.selected.length === 0 ? placeholder : ''}
            disabled={s.disabled}
            readOnly={!controller.isSearchable()}
            onChange={onInputChange}
          />
        </div>
        <div className={cls('indicators')}>
          {clearableResolved && s.selected.length > 0 ? (
            <button type="button" className={cls('clear')} aria-label="Clear">
              ×
            </button>
          ) : null}
          <span className={cls('arrow')} aria-hidden="true" />
        </div>
      </div>
      {s.isOpen ? renderDropdown() : null}
    </div>
  )
}
