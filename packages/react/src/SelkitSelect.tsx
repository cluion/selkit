/**
 * @selkit/react — SelkitSelect 元件
 *
 * 用 React 渲染 行為全部委派給 @selkit/core controller
 * 支援受控 value + onChange 多選 搜尋 分組 與 renderOption 自訂選項
 */
import { useEffect, useRef, useState } from 'react'
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
  virtualScroll?: boolean
  itemHeight?: number
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
  renderOption?: (
    option: SelkitOption<T>,
    meta: { index: number; active: boolean; selected: boolean },
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
    virtualScroll = false,
    itemHeight = 36,
    clearable,
    disabled = false,
    classPrefix = 'selkit',
    loadOptions,
    debounce,
    taggable = false,
    createTag,
    maxSelections,
    renderOption,
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
    ...(minResultsForSearch !== undefined ? { minResultsForSearch } : {}),
    ...(clearable !== undefined ? { clearable } : {}),
    ...(loadOptions ? { loadOptions } : {}),
    ...(debounce !== undefined ? { debounce } : {}),
    ...(createTag ? { createTag } : {}),
    ...(maxSelections !== undefined ? { maxSelections } : {}),
  })

  const [query, setQuery] = useState('')
  const queryRef = useRef('')
  queryRef.current = query
  const rootRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const dropdownRef = useRef<HTMLDivElement | null>(null)
  const dragFromRef = useRef(-1)
  const [scrollTop, setScrollTop] = useState(0)
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
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        controller.close()
      }
    }
    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [controller])

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
      <div className={cls('empty')}>{s.loading ? 'Loading…' : 'No results'}</div>
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
                <span className={cls('tag-label')}>{opt.label}</span>
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
            <span className={cls('single-value')}>{single.label}</span>
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
      {s.isOpen ? (
        <div
          ref={dropdownRef}
          className={cls('dropdown')}
          id={a11y.listbox.id}
          role="listbox"
          aria-multiselectable={multiple || undefined}
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            width: '100%',
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onScroll={(e) => {
            const el = e.currentTarget
            setScrollTop(el.scrollTop)
            if (
              el.scrollTop + el.clientHeight >=
              el.scrollHeight - LOAD_MORE_THRESHOLD
            ) {
              controller.loadMore()
            }
          }}
        >
          {dropdownContent}
        </div>
      ) : null}
    </div>
  )
}
