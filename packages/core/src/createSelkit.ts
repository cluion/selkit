/**
 * @selkit/core — createSelkit controller 實作
 *
 * 純狀態機 零 DOM、零框架依賴 對應 plan/02-core-api.md 的契約
 * 涵蓋同步核心、非同步 loadOptions（含 debounce 與過期回應防護）與 tagging
 */
import type {
  FilterFn,
  SelkitA11y,
  SelkitConfig,
  SelkitController,
  SelkitEvents,
  SelkitGroupedView,
  SelkitItem,
  SelkitListener,
  SelkitOption,
  SelkitState,
  SelkitValue,
  SelkitViewRow,
  Unsubscribe,
} from './types'
import { defaultFilter, fuzzyFilter, normalize, type NormRow } from './utils'

let instanceCounter = 0

type Handler = (payload: unknown) => void

class Selkit<T> implements SelkitController<T> {
  readonly #id: string
  readonly #multiple: boolean
  readonly #closeOnSelect: boolean
  readonly #filter: FilterFn<T>
  readonly #maxSelections: number | undefined

  readonly #loadOptions:
    | ((query: string) => Promise<SelkitItem<T>[]>)
    | undefined
  readonly #debounce: number
  readonly #filterRemote: boolean
  readonly #taggable: boolean
  readonly #createTag: ((query: string) => SelkitOption<T>) | undefined

  #rows: NormRow<T>[]
  #flat: SelkitOption<T>[]
  #state: SelkitState<T>

  #debounceTimer: ReturnType<typeof setTimeout> | null = null
  #loadSeq = 0

  readonly #listeners = new Set<SelkitListener<T>>()
  readonly #handlers = new Map<keyof SelkitEvents<T>, Set<Handler>>()
  #destroyed = false

  constructor(config: SelkitConfig<T>) {
    this.#id = `selkit-${++instanceCounter}`
    this.#multiple = config.multiple ?? false
    this.#closeOnSelect = config.closeOnSelect ?? !this.#multiple
    this.#filter =
      config.filter ??
      ((config.fuzzy ? fuzzyFilter : defaultFilter) as FilterFn<T>)
    this.#maxSelections = config.maxSelections

    this.#loadOptions = config.loadOptions
    this.#debounce = config.debounce ?? 250
    this.#filterRemote = config.filterRemote ?? false
    this.#taggable = config.taggable ?? false
    this.#createTag = config.createTag

    const { rows, flat } = normalize(config.options ?? [])
    this.#rows = rows
    this.#flat = flat

    this.#state = {
      isOpen: false,
      query: '',
      activeIndex: -1,
      selected: this.#resolveInitial(config.value),
      visibleOptions: flat.slice(),
      loading: false,
      noResults: flat.length === 0,
      disabled: config.disabled ?? false,
    }
  }

  // ── 狀態存取 ──────────────────────────────────────────────
  getState(): Readonly<SelkitState<T>> {
    return this.#state
  }

  subscribe(listener: SelkitListener<T>): Unsubscribe {
    this.#listeners.add(listener)
    return () => this.#listeners.delete(listener)
  }

  on<E extends keyof SelkitEvents<T>>(
    event: E,
    handler: (payload: SelkitEvents<T>[E]) => void,
  ): Unsubscribe {
    let set = this.#handlers.get(event)
    if (!set) {
      set = new Set()
      this.#handlers.set(event, set)
    }
    set.add(handler as Handler)
    return () => set!.delete(handler as Handler)
  }

  // ── 開關 ─────────────────────────────────────────────────
  open(): void {
    if (this.#destroyed || this.#state.disabled || this.#state.isOpen) return
    const activeIndex = this.#initialActive()
    this.#patch({ isOpen: true, activeIndex })
    this.#fire('open', undefined)
    this.#fireHighlight(activeIndex)
  }

  close(): void {
    if (!this.#state.isOpen) return
    this.#patch({ isOpen: false, activeIndex: -1 })
    this.#fire('close', undefined)
  }

  toggle(): void {
    this.#state.isOpen ? this.close() : this.open()
  }

  // ── 搜尋 ─────────────────────────────────────────────────
  setQuery(query: string): void {
    if (this.#loadOptions) {
      // 非同步路徑 先更新 query 與 search 事件 再 debounce 載入
      this.#patch({ query })
      this.#fire('search', { query })
      this.#scheduleLoad(query)
      return
    }
    const visibleOptions = this.#computeVisible(query)
    const activeIndex = this.#state.isOpen ? this.#firstEnabled(visibleOptions) : -1
    this.#patch({
      query,
      visibleOptions,
      noResults: !this.#state.loading && visibleOptions.length === 0,
      activeIndex,
    })
    this.#fire('search', { query })
    if (this.#state.isOpen) this.#fireHighlight(activeIndex)
  }

  // ── highlight 移動（不 wrap、跳過 disabled）────────────────
  setActiveIndex(index: number): void {
    const v = this.#state.visibleOptions
    if (index < -1 || index >= v.length) return
    if (index >= 0 && v[index]?.disabled) return
    this.#patch({ activeIndex: index })
    this.#fireHighlight(index)
  }

  moveActive(delta: number): void {
    const v = this.#state.visibleOptions
    if (v.length === 0) return
    const dir = delta < 0 ? -1 : 1
    let cursor = this.#state.activeIndex
    if (cursor < 0) cursor = dir > 0 ? -1 : v.length
    let next = cursor
    for (;;) {
      next += dir
      if (next < 0 || next >= v.length) return // 邊界：不 wrap 維持原位
      if (!v[next]?.disabled) break
    }
    this.#patch({ activeIndex: next })
    this.#fireHighlight(next)
  }

  moveActiveToStart(): void {
    const index = this.#firstEnabled(this.#state.visibleOptions)
    if (index < 0) return
    this.#patch({ activeIndex: index })
    this.#fireHighlight(index)
  }

  moveActiveToEnd(): void {
    const index = this.#lastEnabled(this.#state.visibleOptions)
    if (index < 0) return
    this.#patch({ activeIndex: index })
    this.#fireHighlight(index)
  }

  // ── 選取 ─────────────────────────────────────────────────
  selectActive(): void {
    const { activeIndex, visibleOptions } = this.#state
    const opt = activeIndex >= 0 ? visibleOptions[activeIndex] : undefined
    if (opt) {
      this.select(opt.value)
    } else if (this.#taggable) {
      // 無相符選項時 Enter 直接建立 tag 三個 adapter 不需改即支援
      this.createTag()
    }
  }

  select(value: string | number): void {
    const opt = this.#findOption(value)
    if (!opt || opt.disabled) return

    if (this.#multiple) {
      if (this.#isSelected(value)) return
      if (
        this.#maxSelections !== undefined &&
        this.#state.selected.length >= this.#maxSelections
      ) {
        return
      }
      this.#patch({ selected: [...this.#state.selected, opt] })
    } else {
      this.#patch({ selected: [opt] })
    }
    this.#fireChange()
    if (this.#closeOnSelect) this.close()
  }

  deselect(value: string | number): void {
    if (!this.#isSelected(value)) return
    this.#patch({
      selected: this.#state.selected.filter((o) => o.value !== value),
    })
    this.#fireChange()
  }

  toggleSelect(value: string | number): void {
    this.#isSelected(value) ? this.deselect(value) : this.select(value)
  }

  clear(): void {
    if (this.#state.selected.length === 0) return
    this.#patch({ selected: [] })
    this.#fireChange()
  }

  createTag(): void {
    if (!this.#taggable || !this.#createTag) return
    const query = this.#state.query.trim()
    if (query === '') return
    // 已有同名選項則改為選取既有 不重複建立
    const existing = this.#flat.find(
      (o) => o.label.toLowerCase() === query.toLowerCase(),
    )
    if (existing) {
      if (!existing.disabled) this.select(existing.value)
      return
    }
    const option = this.#createTag(query)
    this.#flat = [...this.#flat, option]
    this.#rows = [...this.#rows, { kind: 'option', option, groupLabel: null }]
    this.#fire('create', { option })
    this.select(option.value)
    this.#patch({ query: '', visibleOptions: this.#computeVisible('') })
  }

  // ── 動態更新 ──────────────────────────────────────────────
  setOptions(options: SelkitItem<T>[]): void {
    const { rows, flat } = normalize(options)
    this.#rows = rows
    this.#flat = flat
    const visibleOptions = this.#computeVisible(this.#state.query)
    this.#patch({
      visibleOptions,
      noResults: !this.#state.loading && visibleOptions.length === 0,
      activeIndex: this.#state.isOpen ? this.#firstEnabled(visibleOptions) : -1,
    })
  }

  setDisabled(disabled: boolean): void {
    if (disabled && this.#state.isOpen) {
      this.#patch({ disabled, isOpen: false, activeIndex: -1 })
      this.#fire('close', undefined)
      return
    }
    this.#patch({ disabled })
  }

  // ── 衍生視圖 ──────────────────────────────────────────────
  a11y(): SelkitA11y {
    const id = this.#id
    const state = this.#state
    const isSelected = (value: string | number) => this.#isSelected(value)
    const activeId =
      state.isOpen && state.activeIndex >= 0
        ? `${id}-opt-${state.activeIndex}`
        : undefined

    return {
      trigger: {
        role: 'combobox',
        'aria-expanded': state.isOpen,
        'aria-controls': `${id}-listbox`,
        'aria-haspopup': 'listbox',
        ...(activeId ? { 'aria-activedescendant': activeId } : {}),
        ...(state.disabled ? { 'aria-disabled': true } : {}),
      },
      listbox: {
        role: 'listbox',
        id: `${id}-listbox`,
        ...(this.#multiple ? { 'aria-multiselectable': true } : {}),
      },
      option(index: number) {
        const opt = state.visibleOptions[index]
        return {
          role: 'option' as const,
          id: `${id}-opt-${index}`,
          'aria-selected': opt ? isSelected(opt.value) : false,
          ...(opt?.disabled ? { 'aria-disabled': true } : {}),
        }
      },
    }
  }

  getGroupedView(): SelkitGroupedView<T> {
    const idxByValue = new Map<string | number, number>()
    this.#state.visibleOptions.forEach((o, i) => idxByValue.set(o.value, i))

    const rows: SelkitViewRow<T>[] = []
    let currentGroup: { label: string; disabled: boolean } | null = null
    let groupEmitted = false

    for (const row of this.#rows) {
      if (row.kind === 'group') {
        currentGroup = { label: row.label, disabled: row.disabled }
        groupEmitted = false
        continue
      }
      if (row.groupLabel === null) {
        currentGroup = null
        groupEmitted = false
      }
      const index = idxByValue.get(row.option.value)
      if (index === undefined) continue
      if (currentGroup && !groupEmitted) {
        rows.push({
          type: 'group',
          label: currentGroup.label,
          ...(currentGroup.disabled ? { disabled: true } : {}),
        })
        groupEmitted = true
      }
      rows.push({ type: 'option', index, option: row.option })
    }

    return { rows }
  }

  destroy(): void {
    if (this.#debounceTimer !== null) clearTimeout(this.#debounceTimer)
    this.#destroyed = true
    this.#listeners.clear()
    this.#handlers.clear()
  }

  // ── 非同步載入 ────────────────────────────────────────────
  #scheduleLoad(query: string): void {
    if (this.#debounceTimer !== null) clearTimeout(this.#debounceTimer)
    this.#debounceTimer = setTimeout(() => {
      this.#debounceTimer = null
      void this.#runLoad(query)
    }, this.#debounce)
  }

  async #runLoad(query: string): Promise<void> {
    const seq = ++this.#loadSeq
    this.#patch({ loading: true, noResults: false })
    this.#fire('load:start', { query })
    try {
      const result = await this.#loadOptions!(query)
      // 過期回應或已銷毀則忽略 避免蓋掉較新的結果
      if (seq !== this.#loadSeq || this.#destroyed) return
      const { rows, flat } = normalize(result)
      this.#rows = rows
      this.#flat = flat
      const visibleOptions = this.#filterRemote
        ? flat.filter((o) => this.#filter(o, query))
        : flat.slice()
      this.#patch({
        loading: false,
        visibleOptions,
        noResults: visibleOptions.length === 0,
        activeIndex: this.#state.isOpen ? this.#firstEnabled(visibleOptions) : -1,
      })
      this.#fire('load:end', { options: result })
    } catch (error) {
      if (seq !== this.#loadSeq || this.#destroyed) return
      this.#patch({ loading: false })
      this.#fire('load:error', { error })
    }
  }

  // ── 內部輔助 ──────────────────────────────────────────────
  #resolveInitial(value: SelkitValue | undefined): SelkitOption<T>[] {
    if (value === undefined || value === null) return []
    const values = Array.isArray(value) ? value : [value]
    const result: SelkitOption<T>[] = []
    for (const v of values) {
      const opt = this.#flat.find((o) => o.value === v)
      if (opt) result.push(opt)
    }
    return this.#multiple ? result : result.slice(0, 1)
  }

  #computeVisible(query: string): SelkitOption<T>[] {
    if (query === '') return this.#flat.slice()
    return this.#flat.filter((o) => this.#filter(o, query))
  }

  #findOption(value: string | number): SelkitOption<T> | undefined {
    return this.#flat.find((o) => o.value === value)
  }

  #isSelected(value: string | number): boolean {
    return this.#state.selected.some((o) => o.value === value)
  }

  #firstEnabled(opts: SelkitOption<T>[]): number {
    for (let i = 0; i < opts.length; i++) {
      if (!opts[i]?.disabled) return i
    }
    return -1
  }

  #lastEnabled(opts: SelkitOption<T>[]): number {
    for (let i = opts.length - 1; i >= 0; i--) {
      if (!opts[i]?.disabled) return i
    }
    return -1
  }

  #initialActive(): number {
    const sel = this.#state.selected[0]
    if (sel) {
      const idx = this.#state.visibleOptions.findIndex((o) => o.value === sel.value)
      if (idx >= 0 && !this.#state.visibleOptions[idx]?.disabled) return idx
    }
    return this.#firstEnabled(this.#state.visibleOptions)
  }

  #value(): SelkitValue {
    if (this.#multiple) return this.#state.selected.map((o) => o.value)
    return this.#state.selected[0]?.value ?? null
  }

  #patch(patch: Partial<SelkitState<T>>): void {
    this.#state = { ...this.#state, ...patch }
    for (const listener of this.#listeners) listener(this.#state)
  }

  #fire<E extends keyof SelkitEvents<T>>(
    event: E,
    payload: SelkitEvents<T>[E],
  ): void {
    const set = this.#handlers.get(event)
    if (!set) return
    for (const handler of set) handler(payload as unknown)
  }

  #fireChange(): void {
    this.#fire('change', { selected: this.#state.selected, value: this.#value() })
  }

  #fireHighlight(index: number): void {
    const option = index >= 0 ? (this.#state.visibleOptions[index] ?? null) : null
    this.#fire('highlight', { index, option })
  }
}

/** 建立一個 Selkit controller 實例  */
export function createSelkit<T = unknown>(
  config: SelkitConfig<T> = {},
): SelkitController<T> {
  return new Selkit<T>(config)
}
