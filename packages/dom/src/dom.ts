/**
 * @selkit/dom — createSelkitDom
 *
 * 以 @selkit/core 為大腦的原生 JS 渲染層：建構 DOM、綁定事件
 * 套用 a11y 屬性、訂閱 state 重繪、開啟時用預設定位器定位
 * 不實作任何「行為」——所有邏輯都委派給 core controller
 *
 * 表單整合：host 是 <select> 時走增強模式（讀 option 並同步值回原生 select）
 * 否則給了 config.name 就自動維護 hidden input 讓傳統表單 submit 帶值
 */
import {
  computeScrollIntoView,
  computeVirtualRange,
  createSelkit,
} from '@selkit/core'
import type {
  SelkitA11y,
  SelkitConfig,
  SelkitController,
  SelkitEmptyReason,
  SelkitItem,
  SelkitOption,
  SelkitState,
  SelkitValue,
  SelkitViewRow,
} from '@selkit/core'
import { attachPositioner, type Positioner } from './positioner'

/** 捲動距底多少 px 內即預載下一頁 */
const LOAD_MORE_THRESHOLD = 32
/** 虛擬捲動的預設單列高度 px 對齊 base theme 的選項高度 */
const DEFAULT_ITEM_HEIGHT = 36
/** sr-only：視覺隱藏但螢幕報讀可讀 內聯以免未載入主題時外露 */
const SR_ONLY_CSS =
  'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0'

type OptionRow<T> = Extract<SelkitViewRow<T>, { type: 'option' }>

/** 解析 dropdownParent 為元素 接受元素或選擇器字串 找不到則拋錯 */
function resolveParent(
  parent: HTMLElement | string | undefined,
): HTMLElement | null {
  if (!parent) return null
  if (typeof parent !== 'string') return parent
  const el = document.querySelector<HTMLElement>(parent)
  if (!el) throw new Error(`[selkit] 找不到 dropdownParent ${parent}`)
  return el
}

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
  /** 把下拉浮層掛到指定容器（元素或選擇器）逃離 overflow/transform 祖先的裁切 常用 document.body */
  dropdownParent?: HTMLElement | string
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

/** 從原生 <select> 讀出選項、初始值與屬性 供增強模式使用 */
function parseSelectElement(select: HTMLSelectElement): {
  options: SelkitItem[]
  value: SelkitValue
  multiple: boolean
  disabled: boolean
  placeholder: string | undefined
  name: string | undefined
} {
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

/** 把原生 <select> 解析出的設定合併進使用者 config 使用者明確設定優先 */
function mergeSelectConfig<T>(
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

export class SelkitDom<T> implements SelkitDomInstance<T> {
  readonly controller: SelkitController<T>
  readonly element: HTMLElement

  readonly #prefix: string
  readonly #multiple: boolean
  readonly #checkboxes: boolean
  readonly #autogrow: boolean
  readonly #dropdownAutoWidth: boolean
  readonly #clearable: boolean
  readonly #placeholder: string
  readonly #name: string | undefined
  readonly #virtual: boolean
  readonly #itemHeight: number
  readonly #dropdownParent: HTMLElement | null
  readonly #templateSelection:
    | ((
        option: SelkitOption<T>,
        meta: { index: number; multiple: boolean },
      ) => string | Node)
    | undefined
  readonly #templateOption:
    | ((
        option: SelkitOption<T>,
        meta: { index: number; active: boolean; selected: boolean },
      ) => string | Node)
    | undefined
  readonly #templateArrow: SelkitDomConfig<T>['templateArrow']
  readonly #templateClear: SelkitDomConfig<T>['templateClear']
  readonly #templateTagRemove: SelkitDomConfig<T>['templateTagRemove']
  readonly #templateGroup: SelkitDomConfig<T>['templateGroup']
  readonly #templateEmpty: SelkitDomConfig<T>['templateEmpty']
  readonly #sourceSelect: HTMLSelectElement | null

  readonly #control: HTMLElement
  readonly #field: HTMLElement
  readonly #input: HTMLInputElement
  readonly #indicators: HTMLElement
  readonly #dropdown: HTMLElement
  readonly #live: HTMLElement
  #hiddenContainer: HTMLDivElement | null = null
  #selectPrevDisplay = ''
  #dragFrom = -1
  /** 上次已捲入可視的 activeIndex 僅在變動時才捲 避免跟使用者手動捲動打架 */
  #lastActive = -1

  #positioner: Positioner | null = null
  readonly #unsubscribe: () => void
  readonly #offClose: () => void
  readonly #offCreate: () => void
  readonly #offAnnounce: () => void
  readonly #onDocPointer: (e: Event) => void

  constructor(target: HTMLElement | string, config: SelkitDomConfig<T>) {
    const host =
      typeof target === 'string'
        ? document.querySelector<HTMLElement>(target)
        : target
    if (!host) {
      throw new Error(`[selkit] 找不到掛載目標 ${String(target)}`)
    }

    const sourceSelect = host instanceof HTMLSelectElement ? host : null
    const cfg = sourceSelect ? mergeSelectConfig(config, sourceSelect) : config

    this.#sourceSelect = sourceSelect
    this.#prefix = cfg.classPrefix ?? 'selkit'
    this.#multiple = cfg.multiple ?? false
    this.#checkboxes = cfg.checkboxes ?? false
    this.#autogrow = cfg.autogrow ?? false
    this.#dropdownAutoWidth = cfg.dropdownAutoWidth ?? false
    this.#clearable = cfg.clearable ?? !this.#multiple
    this.#placeholder = cfg.placeholder ?? ''
    this.#name = cfg.name
    this.#virtual = cfg.virtualScroll ?? false
    this.#itemHeight = cfg.itemHeight ?? DEFAULT_ITEM_HEIGHT
    this.#dropdownParent = resolveParent(cfg.dropdownParent)
    this.#templateSelection = cfg.templateSelection
    this.#templateOption = cfg.templateOption
    this.#templateArrow = cfg.templateArrow
    this.#templateClear = cfg.templateClear
    this.#templateTagRemove = cfg.templateTagRemove
    this.#templateGroup = cfg.templateGroup
    this.#templateEmpty = cfg.templateEmpty
    this.controller = createSelkit<T>(cfg)

    this.element = document.createElement('div')
    this.element.className = this.#prefix
    if (this.#multiple) this.element.classList.add(this.#cls('', 'multiple'))
    if (this.#multiple && this.#checkboxes) {
      this.element.classList.add(this.#cls('', 'checkboxes'))
    }
    if (this.#autogrow) this.element.classList.add(this.#cls('', 'autogrow'))
    if (this.#dropdownAutoWidth) {
      this.element.classList.add(this.#cls('', 'auto-width'))
    }

    this.#control = document.createElement('div')
    this.#control.className = this.#cls('control')
    this.#control.tabIndex = 0

    this.#field = document.createElement('div')
    this.#field.className = this.#cls('field')

    this.#input = document.createElement('input')
    this.#input.className = this.#cls('input')
    this.#input.type = 'text'
    this.#input.autocomplete = 'off'
    this.#input.setAttribute('aria-autocomplete', 'list')
    // 可及名稱：明確 ariaLabel 優先 否則退回 placeholder（placeholder 本身不算 label）
    const ariaLabel = cfg.ariaLabel ?? this.#placeholder
    if (ariaLabel) this.#input.setAttribute('aria-label', ariaLabel)

    this.#indicators = document.createElement('div')
    this.#indicators.className = this.#cls('indicators')

    this.#dropdown = document.createElement('div')
    this.#dropdown.className = this.#cls('dropdown')
    this.#dropdown.hidden = true

    // aria-live region：螢幕報讀公告（選取/結果變化）視覺隱藏
    this.#live = document.createElement('div')
    this.#live.className = this.#cls('live')
    this.#live.setAttribute('role', 'status')
    this.#live.setAttribute('aria-live', 'polite')
    this.#live.setAttribute('aria-atomic', 'true')
    this.#live.style.cssText = SR_ONLY_CSS

    this.#field.append(this.#input)
    this.#control.append(this.#field, this.#indicators)
    if (this.#dropdownParent) {
      // portal 模式 下拉掛到指定容器 並補上 prefix class 讓 --selkit-* 變數能在此解析
      this.#dropdown.classList.add(this.#prefix)
      this.element.append(this.#control)
      this.#dropdownParent.append(this.#dropdown)
    } else {
      this.element.append(this.#control, this.#dropdown)
    }
    this.element.append(this.#live)

    if (sourceSelect) {
      // 增強模式：把元件插在原生 select 後面並隱藏 select 表單提交仍走原生 select
      sourceSelect.after(this.element)
      this.#selectPrevDisplay = sourceSelect.style.display
      sourceSelect.style.display = 'none'
      sourceSelect.setAttribute('aria-hidden', 'true')
      sourceSelect.tabIndex = -1
    } else {
      host.append(this.element)
      if (this.#name) {
        this.#hiddenContainer = document.createElement('div')
        this.#hiddenContainer.style.display = 'none'
        this.element.append(this.#hiddenContainer)
      }
    }

    this.#bindEvents()

    this.#onDocPointer = (e: Event): void => {
      const target = e.target as Node
      // portal 模式下拉在元件之外 需一併視為內部點擊
      if (!this.element.contains(target) && !this.#dropdown.contains(target)) {
        this.controller.close()
      }
    }
    document.addEventListener('pointerdown', this.#onDocPointer)

    // 關閉時清空搜尋字 回復完整選項
    this.#offClose = this.controller.on('close', () => {
      if (this.#input.value !== '') {
        this.#input.value = ''
        this.controller.setQuery('')
      }
    })

    // 建立 tag 後清空輸入框（Enter 或點擊建立列皆會觸發）
    this.#offCreate = this.controller.on('create', () => {
      this.#input.value = ''
    })

    // 螢幕報讀公告寫入 aria-live region
    this.#offAnnounce = this.controller.on('announce', ({ message }) => {
      this.#live.textContent = message
    })

    this.#unsubscribe = this.controller.subscribe((s) => this.#render(s))
    this.#render(this.controller.getState())
  }

  destroy(): void {
    this.#unsubscribe()
    this.#offClose()
    this.#offCreate()
    this.#offAnnounce()
    this.#positioner?.destroy()
    document.removeEventListener('pointerdown', this.#onDocPointer)
    this.controller.destroy()
    this.#dropdown.remove() // portal 模式下拉不在 element 底下 需另外移除
    this.element.remove()
    if (this.#sourceSelect) {
      this.#sourceSelect.style.display = this.#selectPrevDisplay
      this.#sourceSelect.removeAttribute('aria-hidden')
      this.#sourceSelect.tabIndex = 0
    }
  }

  // ── class 命名 (BEM) ─────────────────────────────────────
  #cls(name: string, modifier?: string): string {
    const base = name ? `${this.#prefix}__${name}` : this.#prefix
    return modifier ? `${base}--${modifier}` : base
  }

  // ── 事件綁定（轉呼叫 controller 不含邏輯）─────────────────
  #bindEvents(): void {
    this.#control.addEventListener('pointerdown', (e) => {
      e.stopPropagation() // 內部互動不冒泡到 outside-click handler
      const target = e.target as HTMLElement
      if (target.closest(`.${this.#cls('clear')}`)) {
        e.preventDefault()
        this.controller.clear()
        return
      }
      const tagRemove = target.closest(
        `.${this.#cls('tag-remove')}`,
      ) as HTMLElement | null
      if (tagRemove) {
        e.preventDefault()
        const idx = Number(tagRemove.dataset.index)
        const sel = this.controller.getState().selected[idx]
        if (sel) this.controller.deselect(sel.value)
        return
      }
      if (target !== this.#input) {
        e.preventDefault()
        this.#input.focus()
        this.controller.toggle()
      } else {
        this.controller.open()
      }
    })

    this.#input.addEventListener('input', () => {
      this.controller.open()
      this.controller.setQuery(this.#input.value)
      // tokenization 可能改寫 query（切出 tag）僅在不同時回寫 避免一般輸入游標跳動
      const q = this.controller.getState().query
      if (q !== this.#input.value) this.#input.value = q
    })

    this.#control.addEventListener('keydown', (e) => this.#onKeydown(e))

    this.#dropdown.addEventListener('pointerdown', (e) => {
      e.stopPropagation() // 內部互動不冒泡到 outside-click handler
      const optEl = (e.target as HTMLElement).closest(
        `.${this.#cls('option')}`,
      ) as HTMLElement | null
      if (!optEl || optEl.getAttribute('aria-disabled') === 'true') return
      e.preventDefault()
      if (optEl.dataset.create === 'true') {
        this.controller.createTag()
        return
      }
      const index = Number(optEl.dataset.index)
      const opt = this.controller.getState().visibleOptions[index]
      if (!opt) return
      // 多選點擊改為 toggle 讓已選項可再點取消（checkbox UX）
      if (this.#multiple) this.controller.toggleSelect(opt.value)
      else this.controller.select(opt.value)
    })

    // 捲到接近底部時載入下一頁 無更多或載入中時 loadMore 自身會忽略
    this.#dropdown.addEventListener('scroll', () => {
      const el = this.#dropdown
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - LOAD_MORE_THRESHOLD) {
        this.controller.loadMore()
      }
      // 虛擬捲動時依新捲動位置重算可視切片
      if (this.#virtual) this.#renderOptions(this.controller.getState())
    })

    // tag 拖曳排序 委派在 field 上 以 dataset.index 計算來源與目標
    this.#field.addEventListener('dragstart', (e) => {
      const tag = (e.target as HTMLElement).closest(
        `.${this.#cls('tag')}`,
      ) as HTMLElement | null
      if (!tag) return
      this.#dragFrom = Number(tag.dataset.index)
      if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
    })
    this.#field.addEventListener('dragover', (e) => {
      if (this.#dragFrom < 0) return
      e.preventDefault() // 允許 drop
    })
    this.#field.addEventListener('drop', (e) => {
      if (this.#dragFrom < 0) return
      e.preventDefault()
      const tag = (e.target as HTMLElement).closest(
        `.${this.#cls('tag')}`,
      ) as HTMLElement | null
      const to = tag
        ? Number(tag.dataset.index)
        : this.controller.getState().selected.length - 1
      this.controller.moveSelected(this.#dragFrom, to)
      this.#dragFrom = -1
    })
    this.#field.addEventListener('dragend', () => {
      this.#dragFrom = -1
    })
  }

  #onKeydown(e: KeyboardEvent): void {
    const st = this.controller.getState()
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        st.isOpen ? this.controller.moveActive(1) : this.controller.open()
        break
      case 'ArrowUp':
        e.preventDefault()
        st.isOpen ? this.controller.moveActive(-1) : this.controller.open()
        break
      case 'Enter':
        if (st.isOpen) {
          e.preventDefault()
          this.controller.selectActive()
        }
        break
      case 'Escape':
        if (st.isOpen) {
          e.preventDefault()
          this.controller.close()
        }
        break
      case 'Home':
        if (st.isOpen) {
          e.preventDefault()
          this.controller.moveActiveToStart()
        }
        break
      case 'End':
        if (st.isOpen) {
          e.preventDefault()
          this.controller.moveActiveToEnd()
        }
        break
      case 'Backspace':
        if (this.#multiple && this.#input.value === '' && st.selected.length) {
          this.controller.backspace()
          // restoreOnBackspace 時把回填的 label 帶進輸入框（否則維持空字串）
          this.#input.value = this.controller.getState().query
        }
        break
    }
  }

  // ── 渲染 ─────────────────────────────────────────────────
  #render(s: Readonly<SelkitState<T>>): void {
    this.#renderField(s)
    this.#renderIndicators(s)
    this.#renderOptions(s)
    this.#syncA11y(s)
    this.#syncOpen(s)
    this.#syncForm()
    this.element.classList.toggle(this.#cls('', 'open'), s.isOpen)
    this.element.classList.toggle(this.#cls('', 'disabled'), s.disabled)
    this.#scrollActiveIntoView(s)
  }

  /**
   * 鍵盤導航/開啟時讓作用中選項保持可見（aria-activedescendant 完整度）
   * 僅在 activeIndex 變動時動作 手動捲動觸發的重繪不會跟著捲
   */
  #scrollActiveIntoView(s: Readonly<SelkitState<T>>): void {
    if (!s.isOpen) {
      this.#lastActive = -1
      return
    }
    if (s.activeIndex === this.#lastActive || s.activeIndex < 0) return
    this.#lastActive = s.activeIndex

    const hasGroups = this.controller
      .getGroupedView()
      .rows.some((r) => r.type === 'group')
    if (this.#virtual && !hasGroups) {
      // 該列可能尚未渲染 無法靠 DOM 用固定列高算出目標 scrollTop
      const next = computeScrollIntoView({
        index: s.activeIndex,
        scrollTop: this.#dropdown.scrollTop,
        viewportHeight: this.#dropdown.clientHeight,
        itemHeight: this.#itemHeight,
      })
      if (next !== null) {
        this.#dropdown.scrollTop = next
        this.#renderOptions(s) // 依新捲動位置重算切片 讓作用列進入 DOM
      }
      return
    }
    const active = this.#dropdown.querySelector<HTMLElement>(
      `.${this.#cls('option', 'active')}`,
    )
    active?.scrollIntoView?.({ block: 'nearest' })
  }

  /** 套用模板輸出：字串走 textContent（防 XSS）Node 直接掛入 */
  #applyTemplate(host: HTMLElement, out: string | Node): void {
    if (out instanceof Node) host.append(out)
    else host.textContent = out
  }

  /** 套用 templateSelection 到已選容器 無模板則用 label */
  #fillSelection(
    host: HTMLElement,
    option: SelkitOption<T>,
    meta: { index: number; multiple: boolean },
  ): void {
    if (!this.#templateSelection) {
      host.textContent = option.label
      return
    }
    this.#applyTemplate(host, this.#templateSelection(option, meta))
  }

  #renderField(s: Readonly<SelkitState<T>>): void {
    // 移除 input 以外的舊節點 保留 input 本身以維持輸入焦點
    for (const child of Array.from(this.#field.children)) {
      if (child !== this.#input) child.remove()
    }

    const frag = document.createDocumentFragment()
    if (this.#multiple) {
      s.selected.forEach((opt, i) => {
        const tag = document.createElement('span')
        tag.className = this.#cls('tag')
        tag.draggable = true
        tag.dataset.index = String(i)

        const label = document.createElement('span')
        label.className = this.#cls('tag-label')
        this.#fillSelection(label, opt, { index: i, multiple: true })

        const remove = document.createElement('button')
        remove.type = 'button'
        remove.className = this.#cls('tag-remove')
        remove.dataset.index = String(i)
        remove.setAttribute('aria-label', `Remove ${opt.label}`)
        if (this.#templateTagRemove) {
          this.#applyTemplate(remove, this.#templateTagRemove(opt, { index: i }))
        } else {
          remove.textContent = '×'
        }

        tag.append(label, remove)
        frag.append(tag)
      })
    } else {
      const sel = s.selected[0]
      if (sel && this.#input.value === '') {
        const single = document.createElement('span')
        single.className = this.#cls('single-value')
        this.#fillSelection(single, sel, { index: 0, multiple: false })
        frag.append(single)
      }
    }

    this.#field.insertBefore(frag, this.#input)
    this.#input.placeholder = s.selected.length === 0 ? this.#placeholder : ''
    this.#syncInputSize()
  }

  /** autogrow：以 size 屬性讓輸入框寬度貼齊內容（值或佔位文字）*/
  #syncInputSize(): void {
    if (!this.#autogrow) return
    const basis = this.#input.value || this.#input.placeholder
    this.#input.size = Math.max(1, basis.length)
  }

  #renderIndicators(s: Readonly<SelkitState<T>>): void {
    this.#indicators.replaceChildren()

    if (this.#clearable && s.selected.length > 0) {
      const clear = document.createElement('button')
      clear.type = 'button'
      clear.className = this.#cls('clear')
      clear.setAttribute('aria-label', 'Clear')
      if (this.#templateClear) {
        this.#applyTemplate(clear, this.#templateClear())
      } else {
        clear.textContent = '×'
      }
      this.#indicators.append(clear)
    }

    const arrow = document.createElement('span')
    arrow.className = this.#cls('arrow')
    arrow.setAttribute('aria-hidden', 'true')
    if (this.#templateArrow) {
      this.#applyTemplate(arrow, this.#templateArrow({ open: s.isOpen }))
    }
    this.#indicators.append(arrow)
  }

  #renderOptions(s: Readonly<SelkitState<T>>): void {
    this.#dropdown.replaceChildren()
    const a11y = this.controller.a11y()
    const view = this.controller.getGroupedView()

    if (view.rows.length === 0) {
      const empty = document.createElement('div')
      empty.className = this.#cls('empty')
      const message = this.controller.getEmptyMessage()
      if (this.#templateEmpty) {
        this.#applyTemplate(
          empty,
          this.#templateEmpty({
            reason: this.controller.getEmptyReason(),
            message,
            query: s.query,
          }),
        )
      } else {
        empty.textContent = message
      }
      this.#dropdown.append(empty)
      return
    }

    const hasGroups = view.rows.some((r) => r.type === 'group')
    // 虛擬捲動僅在無分組的扁平清單啟用 分組列高不一會破壞固定高度計算
    if (this.#virtual && !hasGroups) {
      const range = computeVirtualRange({
        scrollTop: this.#dropdown.scrollTop,
        viewportHeight: this.#dropdown.clientHeight,
        itemHeight: this.#itemHeight,
        itemCount: view.rows.length,
      })
      this.#dropdown.append(this.#spacer(range.paddingTop))
      for (let i = range.startIndex; i < range.endIndex; i++) {
        const row = view.rows[i]
        if (row?.type === 'option') {
          this.#dropdown.append(this.#buildOption(row, a11y, s.activeIndex))
        } else if (row?.type === 'create') {
          this.#dropdown.append(this.#buildCreateRow(row, a11y, s.activeIndex))
        }
      }
      this.#dropdown.append(this.#spacer(range.paddingBottom))
      return
    }

    for (const row of view.rows) {
      if (row.type === 'group') {
        const group = document.createElement('div')
        group.className = this.#cls('group')
        if (row.disabled) group.classList.add(this.#cls('group', 'disabled'))
        if (this.#templateGroup) {
          this.#applyTemplate(
            group,
            this.#templateGroup({ label: row.label, disabled: !!row.disabled }),
          )
        } else {
          group.textContent = row.label
        }
        this.#dropdown.append(group)
        continue
      }
      if (row.type === 'create') {
        this.#dropdown.append(this.#buildCreateRow(row, a11y, s.activeIndex))
        continue
      }
      this.#dropdown.append(this.#buildOption(row, a11y, s.activeIndex))
    }
  }

  /** 「建立新項」列 共用 option 樣式與 a11y 但點擊走 createTag */
  #buildCreateRow(
    row: { type: 'create'; index: number; query: string; label: string },
    a11y: SelkitA11y,
    activeIndex: number,
  ): HTMLElement {
    const attrs = a11y.option(row.index)
    const el = document.createElement('div')
    el.className = `${this.#cls('option')} ${this.#cls('create')}`
    el.id = attrs.id
    el.dataset.index = String(row.index)
    el.dataset.create = 'true'
    el.setAttribute('role', 'option')
    el.setAttribute('aria-selected', 'false')
    if (row.index === activeIndex) {
      el.classList.add(this.#cls('option', 'active'))
    }
    el.textContent = row.label
    return el
  }

  /** 撐高佔位節點 維持虛擬捲動時的捲動總高度 */
  #spacer(height: number): HTMLElement {
    const el = document.createElement('div')
    el.style.height = `${height}px`
    el.setAttribute('aria-hidden', 'true')
    return el
  }

  #buildOption(
    row: OptionRow<T>,
    a11y: SelkitA11y,
    activeIndex: number,
  ): HTMLElement {
    const attrs = a11y.option(row.index)
    const option = document.createElement('div')
    option.className = this.#cls('option')
    option.id = attrs.id
    option.dataset.index = String(row.index)
    option.setAttribute('role', 'option')
    option.setAttribute('aria-selected', String(attrs['aria-selected']))
    if (attrs['aria-disabled']) option.setAttribute('aria-disabled', 'true')
    if (row.index === activeIndex) {
      option.classList.add(this.#cls('option', 'active'))
    }
    if (attrs['aria-selected']) {
      option.classList.add(this.#cls('option', 'selected'))
    }
    if (this.#templateOption) {
      const out = this.#templateOption(row.option, {
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

  #syncA11y(s: Readonly<SelkitState<T>>): void {
    const a = this.controller.a11y()
    const c = this.#control

    c.setAttribute('role', a.trigger.role)
    c.setAttribute('aria-expanded', String(a.trigger['aria-expanded']))
    c.setAttribute('aria-haspopup', a.trigger['aria-haspopup'])
    c.setAttribute('aria-controls', a.trigger['aria-controls'])

    const active = a.trigger['aria-activedescendant']
    if (active) c.setAttribute('aria-activedescendant', active)
    else c.removeAttribute('aria-activedescendant')

    if (a.trigger['aria-disabled']) c.setAttribute('aria-disabled', 'true')
    else c.removeAttribute('aria-disabled')

    this.#dropdown.id = a.listbox.id
    this.#dropdown.setAttribute('role', a.listbox.role)
    if (a.listbox['aria-multiselectable']) {
      this.#dropdown.setAttribute('aria-multiselectable', 'true')
    }

    this.#input.disabled = s.disabled
    // 選項太少或 searchable false 時把輸入框設為唯讀 仍可聚焦走鍵盤導航
    this.#input.readOnly = !this.controller.isSearchable()
  }

  #syncOpen(s: Readonly<SelkitState<T>>): void {
    if (s.isOpen) {
      this.#dropdown.hidden = false
      if (this.#positioner) this.#positioner.update()
      else
        this.#positioner = attachPositioner(
          this.#control,
          this.#dropdown,
          this.#dropdownAutoWidth,
        )
    } else {
      this.#dropdown.hidden = true
      this.#positioner?.destroy()
      this.#positioner = null
    }
  }

  // ── 表單同步 ──────────────────────────────────────────────
  #syncForm(): void {
    if (this.#sourceSelect) this.#syncToSelect(this.#sourceSelect)
    else if (this.#hiddenContainer) this.#syncHiddenInputs(this.#hiddenContainer)
  }

  #syncToSelect(select: HTMLSelectElement): void {
    const selected = this.controller.getState().selected
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

  #syncHiddenInputs(container: HTMLDivElement): void {
    container.replaceChildren()
    const name = this.#name as string
    const inputName = this.#multiple ? `${name}[]` : name
    const selected = this.controller.getState().selected
    const values = this.#multiple ? selected : selected.slice(0, 1)
    for (const opt of values) {
      const input = document.createElement('input')
      input.type = 'hidden'
      input.name = inputName
      input.value = String(opt.value)
      container.append(input)
    }
  }
}

/** 在指定元素或 selector 對應的元素內建立並掛載一個 Selkit 下拉 */
export function createSelkitDom<T = unknown>(
  host: HTMLElement | string,
  config: SelkitDomConfig<T> = {},
): SelkitDomInstance<T> {
  return new SelkitDom<T>(host, config)
}
