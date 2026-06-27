'use client'
/**
 * @selkit/react — SelkitSelect 元件
 *
 * 用 React 渲染 行為全部委派給 @selkit/core controller
 * 支援受控 value + onChange 多選 搜尋 分組 與 renderOption 自訂選項
 */
import { Fragment, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type {
  ChangeEvent,
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from 'react'
import {
  computeScrollIntoView,
  computeScrollIntoViewVariable,
  computeVirtualRange,
  computeVirtualWindow,
} from '@selkit/core'
import type {
  SelkitEmptyReason,
  SelkitItem,
  SelkitLoadResult,
  SelkitMessages,
  SelkitOption,
  SelkitValue,
  SelkitViewRow,
  SorterFn,
} from '@selkit/core'
import { useSelkit } from './useSelkit'

/** 捲動距底多少 px 內即預載下一頁 */
const LOAD_MORE_THRESHOLD = 32

type OptionRow<T> = Extract<SelkitViewRow<T>, { type: 'option' }>
type CreateRow = Extract<SelkitViewRow, { type: 'create' }>
type GroupRow = Extract<SelkitViewRow, { type: 'group' }>

/**
 * 與 @selkit/floating 的 createFloatingPositioner 相容的定位器（結構型別）
 * 用結構型別宣告 避免對 @selkit/dom / @selkit/floating 產生編譯期耦合
 */
export interface SelkitPositioner {
  update(): void
  destroy(): void
}
export type SelkitPositionerFactory = (
  reference: HTMLElement,
  floating: HTMLElement,
  opts?: { autoWidth?: boolean },
) => SelkitPositioner

/** sr-only：視覺隱藏但螢幕報讀可讀 內聯以免未載入主題時外露 */
const SR_ONLY: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
}

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
  /** 多選時於選項顯示打勾（checkbox 樣式）點擊改為 toggle */
  checkboxes?: boolean
  /** 輸入框寬度隨輸入字數增長（size 屬性近似）*/
  autogrow?: boolean
  /** 下拉寬度貼齊內容（至少與控制項同寬）*/
  dropdownAutoWidth?: boolean
  placeholder?: string
  /** 搜尋輸入框的可及名稱（aria-label）未設則退回 placeholder */
  ariaLabel?: string
  searchable?: boolean
  minResultsForSearch?: number
  fuzzy?: boolean
  /** 搜尋時將命中片段以 <mark> 標示 預設 true */
  highlightMatches?: boolean
  /** 多選顯示上限 超過則其餘摺疊成 +M 點擊展開 */
  maxSelectedDisplay?: number
  /** clear 時需二次確認 點第一次進入待確認 再點才清空 */
  clearConfirm?: boolean
  /** clearConfirm 待確認時按鈕顯示文字 預設 "Confirm" */
  clearConfirmText?: string
  /** 自訂結果排序（如相關度）僅扁平清單 */
  sorter?: SorterFn<T>
  minInputLength?: number
  hideSelected?: boolean
  virtualScroll?: boolean
  itemHeight?: number
  /** 下拉選項列間 gap px 預設 4 */
  optionGap?: number
  /** 虛擬捲動下分組標題列的固定高度 px 預設 28 須與實際樣式高度一致 */
  groupHeight?: number
  dropdownParent?: string | HTMLElement
  /** 自訂定位器工廠 預設用內建 fixed 定位 傳入 @selkit/floating 的 createFloatingPositioner 即啟用 flip/shift/size 進階定位 */
  positioner?: SelkitPositionerFactory
  clearable?: boolean
  disabled?: boolean
  classPrefix?: string
  loadOptions?: (
    query: string,
    page: number,
    opts: { signal: AbortSignal },
  ) => Promise<SelkitItem<T>[] | SelkitLoadResult<T>>
  debounce?: number
  /** 快取 loadOptions 首頁結果（query 為鍵）避免重打 API */
  cache?: boolean
  /** 快取存活毫秒 超過視為過期 未設則不過期 */
  cacheTTL?: number
  /** 回顯初始值：value 對應選項不在 options/loadOptions 結構中時，用此 hook 補上 label（同步或非同步）*/
  resolveSelected?: (
    values: Array<string | number>,
  ) => SelkitOption<T>[] | Promise<SelkitOption<T>[]>
  taggable?: boolean
  createTag?: (query: string) => SelkitOption<T>
  /** tag 驗證鉤子 回傳 false 則不建立（靜默拒絕） */
  isValidToken?: (query: string) => boolean
  tokenSeparators?: string[]
  /** 多選輸入框為空按 Backspace 刪最後一個 tag 並回填其文字到輸入框 */
  restoreOnBackspace?: boolean
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
  /** 自訂下拉箭頭內容（▾）外殼保留 */
  renderArrow?: (meta: { open: boolean }) => ReactNode
  /** 自訂清除鈕內容（×）按鈕外殼與 click 行為保留 */
  renderClear?: () => ReactNode
  /** 自訂多選標籤移除鈕內容（×）按鈕外殼與 click 行為保留 */
  renderTagRemove?: (
    option: SelkitOption<T>,
    meta: { index: number },
  ) => ReactNode
  /** 自訂分組標題內容 外殼保留 */
  renderGroup?: (meta: { label: string; disabled: boolean }) => ReactNode
  /** 自訂下拉為空/載入中的整塊內容 reason 分流 message 為預設文字 */
  renderEmpty?: (meta: {
    reason: SelkitEmptyReason
    message: string
    query: string
  }) => ReactNode
}

export function SelkitSelect<T = unknown>(props: SelkitSelectProps<T>) {
  const {
    options = [],
    value,
    onChange,
    multiple = false,
    checkboxes = false,
    autogrow = false,
    dropdownAutoWidth = false,
    placeholder = '',
    ariaLabel,
    searchable = true,
    minResultsForSearch,
    fuzzy = false,
    highlightMatches = true,
    maxSelectedDisplay,
    clearConfirm = false,
    clearConfirmText = 'Confirm',
    sorter,
    minInputLength,
    hideSelected = false,
    virtualScroll = false,
    itemHeight = 38,
    optionGap = 4,
    groupHeight = 28,
    dropdownParent,
    positioner,
    clearable,
    disabled = false,
    classPrefix = 'selkit',
    loadOptions,
    debounce,
    cache = false,
    cacheTTL,
    resolveSelected,
    taggable = false,
    createTag,
    isValidToken,
    tokenSeparators,
    restoreOnBackspace,
    maxSelections,
    messages,
    renderOption,
    renderSelection,
    renderArrow,
    renderClear,
    renderTagRemove,
    renderGroup,
    renderEmpty,
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
    highlightMatches,
    hideSelected,
    ...(sorter ? { sorter } : {}),
    ...(minInputLength !== undefined ? { minInputLength } : {}),
    ...(minResultsForSearch !== undefined ? { minResultsForSearch } : {}),
    ...(clearable !== undefined ? { clearable } : {}),
    ...(loadOptions ? { loadOptions } : {}),
    ...(debounce !== undefined ? { debounce } : {}),
    ...(cache ? { cache: true } : {}),
    ...(cacheTTL !== undefined ? { cacheTTL } : {}),
    ...(resolveSelected ? { resolveSelected } : {}),
    ...(createTag ? { createTag } : {}),
    ...(isValidToken ? { isValidToken } : {}),
    ...(tokenSeparators ? { tokenSeparators } : {}),
    ...(restoreOnBackspace ? { restoreOnBackspace } : {}),
    ...(maxSelections !== undefined ? { maxSelections } : {}),
    ...(messages ? { messages } : {}),
  })

  const [query, setQuery] = useState('')
  const [tagsExpanded, setTagsExpanded] = useState(false)
  const [clearConfirming, setClearConfirming] = useState(false)
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    return () => {
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current)
    }
  }, [])
  const [liveMessage, setLiveMessage] = useState('')
  const queryRef = useRef('')
  queryRef.current = query
  const rootRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const dropdownRef = useRef<HTMLDivElement | null>(null)
  const dragFromRef = useRef(-1)
  const [scrollTop, setScrollTop] = useState(0)
  const [portalPos, setPortalPos] = useState({ top: 0, left: 0, width: 0 })
  // portal target 只在 client 解析（SSR 時 document 不存在）→ client-only portal：
  // render 期不碰 document，mount 後 useEffect 補上，開啟下拉時已就緒
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null)
  useEffect(() => {
    if (!dropdownParent) {
      setPortalTarget(null)
      return
    }
    setPortalTarget(
      typeof dropdownParent === 'string'
        ? document.querySelector<HTMLElement>(dropdownParent)
        : dropdownParent,
    )
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

  // 螢幕報讀公告 → aria-live region
  useEffect(() => {
    const off = controller.on('announce', ({ message }) =>
      setLiveMessage(message),
    )
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
    document.addEventListener('pointerdown', handler, { capture: true })
    return () =>
      document.removeEventListener('pointerdown', handler, { capture: true })
  }, [controller])

  // portal 模式下用 fixed 座標定位 量測 root rect 並隨 scroll/resize 更新
  // 提供 positioner 時改由它接管（見下方 effect）此 fallback 不啟用
  useEffect(() => {
    if (positioner || !portalTarget || !state.isOpen) return
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
  }, [positioner, portalTarget, state.isOpen])

  // 提供 positioner 時把下拉定位完全交給它（命令式 + autoUpdate）開啟時掛上、關閉時拆除
  useEffect(() => {
    if (!positioner || !state.isOpen) return
    const reference = rootRef.current
    const floating = dropdownRef.current
    if (!reference || !floating) return
    const inst = positioner(reference, floating, { autoWidth: dropdownAutoWidth })
    return () => inst.destroy()
  }, [positioner, state.isOpen, dropdownAutoWidth])

  // 作用中選項保持可見（aria-activedescendant 完整度）
  // deps 僅 isOpen/activeIndex：手動捲動更新的是 scrollTop state 不會誤觸
  useEffect(() => {
    if (!state.isOpen || state.activeIndex < 0) return
    const dropdown = dropdownRef.current
    if (!dropdown) return
    const rows = controller.getGroupedView().rows
    const grouped = rows.some((r) => r.type === 'group')
    if (virtualScroll && !grouped) {
      const next = computeScrollIntoView({
        index: state.activeIndex,
        scrollTop: dropdown.scrollTop,
        viewportHeight: dropdown.clientHeight,
        itemHeight,
        gap: optionGap,
      })
      if (next !== null) {
        dropdown.scrollTop = next
        setScrollTop(next) // 重算切片讓作用列進 DOM
      }
      return
    }
    if (virtualScroll && grouped) {
      const rowIndex = rows.findIndex(
        (r) => r.type !== 'group' && r.index === state.activeIndex,
      )
      const next = computeScrollIntoViewVariable({
        heights: rows.map((r) => (r.type === 'group' ? groupHeight : itemHeight)),
        rowIndex,
        scrollTop: dropdown.scrollTop,
        viewportHeight: dropdown.clientHeight,
        gap: optionGap,
      })
      if (next !== null) {
        dropdown.scrollTop = next
        setScrollTop(next)
      }
      return
    }
    const active = dropdown.querySelector<HTMLElement>(
      `.${cls('option', 'active')}`,
    )
    active?.scrollIntoView?.({ block: 'nearest' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.isOpen, state.activeIndex])

  const onClearPressed = (): void => {
    if (!clearConfirm) {
      controller.clear()
      return
    }
    if (clearConfirming) {
      setClearConfirming(false)
      if (clearTimerRef.current) {
        clearTimeout(clearTimerRef.current)
        clearTimerRef.current = null
      }
      controller.clear()
    } else {
      setClearConfirming(true)
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current)
      clearTimerRef.current = setTimeout(
        () => setClearConfirming(false),
        2500,
      )
    }
  }

  const onControlPointerDown = (e: ReactPointerEvent<HTMLDivElement>): void => {
    const target = e.target as HTMLElement
    if (target.closest(`.${cls('clear')}`)) {
      e.preventDefault()
      onClearPressed()
      return
    }
    if (target.closest(`.${cls('more')}`)) {
      e.preventDefault()
      setTagsExpanded((v) => !v)
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
    controller.open()
    controller.setQuery(v)
    // tokenization 可能改寫 query（切出 tag）以 core 的 query 為準
    const q = controller.getState().query
    setQuery(q)
    queryRef.current = q
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
          controller.backspace()
          // restoreOnBackspace 時把回填的 label 帶進輸入框
          const q = controller.getState().query
          setQuery(q)
          queryRef.current = q
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
  if (multiple && checkboxes) rootClass.push(cls('', 'checkboxes'))
  if (autogrow) rootClass.push(cls('', 'autogrow'))
  if (dropdownAutoWidth) rootClass.push(cls('', 'auto-width'))
  if (s.isOpen) rootClass.push(cls('', 'open'))
  if (s.disabled) rootClass.push(cls('', 'disabled'))

  const renderHighlighted = (label: string): ReactNode =>
    controller
      .highlightLabel(label)
      .map((p, i) =>
        p.match ? (
          <mark key={i} className={cls('match')}>
            {p.text}
          </mark>
        ) : (
          <Fragment key={i}>{p.text}</Fragment>
        ),
      )

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
          if (multiple) controller.toggleSelect(row.option.value)
          else controller.select(row.option.value)
        }}
      >
        {renderOption
          ? renderOption(row.option, {
              index: row.index,
              active: row.index === s.activeIndex,
              selected: attrs['aria-selected'],
            })
          : renderHighlighted(row.option.label)}
      </div>
    )
  }

  const buildCreateRow = (row: CreateRow): ReactNode => {
    const attrs = a11y.option(row.index)
    const optClass = [cls('option'), cls('create')]
    if (row.index === s.activeIndex) optClass.push(cls('option', 'active'))
    return (
      <div
        key="selkit-create"
        className={optClass.join(' ')}
        id={attrs.id}
        role="option"
        aria-selected={false}
        onPointerDown={(e) => {
          e.preventDefault()
          controller.createTag()
        }}
      >
        {row.label}
      </div>
    )
  }

  const buildGroup = (row: GroupRow): ReactNode => (
    <div className={cls('group')} key={`group-${row.label}`}>
      {renderGroup
        ? renderGroup({ label: row.label, disabled: !!row.disabled })
        : row.label}
    </div>
  )

  const buildRow = (row: SelkitViewRow<T>): ReactNode =>
    row.type === 'group'
      ? buildGroup(row)
      : row.type === 'create'
        ? buildCreateRow(row)
        : buildOption(row)

  // 每列高度：分組標題用 groupHeight 其餘用 itemHeight
  const rowHeights = (rows: readonly SelkitViewRow<T>[]): number[] =>
    rows.map((r) => (r.type === 'group' ? groupHeight : itemHeight))

  const hasGroups = view.rows.some((r) => r.type === 'group')
  let dropdownContent: ReactNode
  if (view.rows.length === 0) {
    const emptyMessage = controller.getEmptyMessage()
    dropdownContent = (
      <div className={cls('empty')}>
        {renderEmpty
          ? renderEmpty({
              reason: controller.getEmptyReason(),
              message: emptyMessage,
              query,
            })
          : emptyMessage}
      </div>
    )
  } else if (virtualScroll) {
    // 扁平走均高 O(1)；分組走變高（header 與 option 高度不同）
    const viewportHeight = dropdownRef.current?.clientHeight ?? 0
    const range = hasGroups
      ? computeVirtualWindow({
          heights: rowHeights(view.rows),
          scrollTop,
          viewportHeight,
          gap: optionGap,
        })
      : computeVirtualRange({
          scrollTop,
          viewportHeight,
          itemHeight,
          itemCount: view.rows.length,
          gap: optionGap,
        })
    const slice: ReactNode[] = []
    for (let i = range.startIndex; i < range.endIndex; i++) {
      const row = view.rows[i]
      if (row) slice.push(buildRow(row))
    }
    dropdownContent = (
      <>
        <div aria-hidden style={{ height: range.paddingTop }} />
        {slice}
        <div aria-hidden style={{ height: range.paddingBottom }} />
      </>
    )
  } else {
    dropdownContent = view.rows.map((row) => buildRow(row))
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
          {
            '--selkit-option-gap': `${optionGap}px`,
            // 提供 positioner 時不綁定任何位置樣式 完全交給它命令式接管
            ...(positioner
              ? {}
              : portalTarget
                ? {
                    position: 'fixed',
                    top: portalPos.top,
                    left: portalPos.left,
                    ...(dropdownAutoWidth
                      ? { minWidth: portalPos.width, width: 'max-content' }
                      : { width: portalPos.width }),
                  }
                : {
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    ...(dropdownAutoWidth
                      ? { minWidth: '100%', width: 'max-content' }
                      : { width: '100%' }),
                  }),
          } as unknown as CSSProperties
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
          {multiple ? (() => {
            const max = maxSelectedDisplay
            const over = max !== undefined && s.selected.length > max
            const list =
              !over || tagsExpanded ? s.selected : s.selected.slice(0, max!)
            const rest = over ? s.selected.length - max! : 0
            return (
              <>
                {list.map((opt, i) => (
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
                      {renderTagRemove ? renderTagRemove(opt, { index: i }) : '×'}
                    </button>
                  </span>
                ))}
                {over ? (
                  <button
                    type="button"
                    className={cls('more')}
                    aria-label={
                      tagsExpanded ? 'Collapse' : `${rest} more selected`
                    }
                  >
                    {tagsExpanded ? `-${rest}` : `+${rest}`}
                  </button>
                ) : null}
              </>
            )
          })() : single && query === '' ? (
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
            aria-label={ariaLabel ?? (placeholder || undefined)}
            value={query}
            {...(autogrow
              ? {
                  size: Math.max(
                    1,
                    (query || (s.selected.length === 0 ? placeholder : ''))
                      .length,
                  ),
                }
              : {})}
            placeholder={s.selected.length === 0 ? placeholder : ''}
            disabled={s.disabled}
            readOnly={!controller.isSearchable()}
            onChange={onInputChange}
          />
        </div>
        <div className={cls('indicators')}>
          {clearableResolved && s.selected.length > 0 ? (
            <button
              type="button"
              className={
                clearConfirming
                  ? `${cls('clear')} ${cls('clear', 'confirm')}`
                  : cls('clear')
              }
              aria-label={clearConfirming ? clearConfirmText : 'Clear'}
            >
              {clearConfirming
                ? clearConfirmText
                : renderClear
                  ? renderClear()
                  : '×'}
            </button>
          ) : null}
          <span className={cls('arrow')} aria-hidden="true">
            {renderArrow ? renderArrow({ open: s.isOpen }) : null}
          </span>
        </div>
      </div>
      {s.isOpen ? renderDropdown() : null}
      <div
        className={cls('live')}
        style={SR_ONLY}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {liveMessage}
      </div>
    </div>
  )
}
