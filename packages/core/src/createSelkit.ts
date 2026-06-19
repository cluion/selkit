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
  SelkitEmptyReason,
  SelkitEvents,
  SelkitGroupedView,
  SelkitItem,
  SelkitListener,
  SelkitLoadResult,
  SelkitMessages,
  SelkitOption,
  SelkitState,
  SorterFn,
  SelkitValue,
  SelkitViewRow,
  Unsubscribe,
} from './types'
import {
  defaultFilter,
  fuzzyFilter,
  normalize,
  normalizeLoadResult,
  type NormRow,
} from './utils'

let instanceCounter = 0

/** 空狀態訊息的英文預設 config.messages 逐鍵覆寫之  */
const DEFAULT_MESSAGES: SelkitMessages = {
  loading: 'Loading…',
  noResults: 'No results',
  minInputLength: (remaining) =>
    `Please enter ${remaining} or more character${remaining === 1 ? '' : 's'}`,
  create: (query) => `Add "${query}"`,
  selected: (label) => `${label} selected`,
  deselected: (label) => `${label} removed`,
  cleared: () => 'Selection cleared',
  resultsCount: (count) =>
    count === 0
      ? 'No results available'
      : `${count} result${count === 1 ? '' : 's'} available`,
}

type Handler = (payload: unknown) => void

class Selkit<T> implements SelkitController<T> {
  readonly #id: string
  readonly #multiple: boolean
  readonly #closeOnSelect: boolean
  readonly #filter: FilterFn<T>
  readonly #sorter: SorterFn<T> | undefined
  readonly #minInputLength: number
  readonly #searchable: boolean
  readonly #minResultsForSearch: number
  readonly #hideSelected: boolean
  readonly #maxSelections: number | undefined
  readonly #messages: SelkitMessages

  readonly #loadOptions:
    | ((
        query: string,
        page: number,
        opts: { signal: AbortSignal },
      ) => Promise<SelkitItem<T>[] | SelkitLoadResult<T>>)
    | undefined
  readonly #debounce: number
  readonly #filterRemote: boolean
  readonly #cacheEnabled: boolean
  readonly #cacheTTL: number | undefined
  readonly #taggable: boolean
  readonly #createTag: ((query: string) => SelkitOption<T>) | undefined
  readonly #isValidToken: ((query: string) => boolean) | undefined
  readonly #tokenSeparators: string[]
  readonly #restoreOnBackspace: boolean
  readonly #resolveSelected:
    | ((
        values: Array<string | number>,
      ) => SelkitOption<T>[] | Promise<SelkitOption<T>[]>)
    | undefined

  #rows: NormRow<T>[]
  #flat: SelkitOption<T>[]
  #state: SelkitState<T>

  #debounceTimer: ReturnType<typeof setTimeout> | null = null
  #loadSeq = 0
  #loadController: AbortController | null = null
  #resolveSeq = 0
  /** 遠端首頁結果快取 鍵為 query 字串 time 為寫入時間（Date.now）供 TTL 判斷 */
  readonly #cacheStore = new Map<
    string,
    { items: SelkitItem<T>[]; hasMore: boolean; time: number }
  >()

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
    this.#sorter = config.sorter
    this.#minInputLength = config.minInputLength ?? 0
    this.#searchable = config.searchable ?? true
    this.#minResultsForSearch = config.minResultsForSearch ?? 0
    this.#hideSelected = config.hideSelected ?? false
    this.#maxSelections = config.maxSelections
    this.#messages = { ...DEFAULT_MESSAGES, ...config.messages }

    this.#loadOptions = config.loadOptions
    this.#debounce = config.debounce ?? 250
    this.#filterRemote = config.filterRemote ?? false
    this.#cacheEnabled = config.cache ?? false
    this.#cacheTTL = config.cacheTTL
    this.#taggable = config.taggable ?? false
    this.#createTag = config.createTag
    this.#isValidToken = config.isValidToken
    this.#tokenSeparators = config.tokenSeparators ?? []
    this.#restoreOnBackspace = config.restoreOnBackspace ?? false
    this.#resolveSelected = config.resolveSelected

    const { rows, flat } = normalize(config.options ?? [])
    this.#rows = rows
    this.#flat = flat

    const { selected, missing } = this.#resolveInitial(config.value)
    const initialVisible = this.#computeVisible('', selected)
    this.#state = {
      isOpen: false,
      query: '',
      activeIndex: -1,
      selected,
      visibleOptions: initialVisible,
      loading: false,
      noResults: !this.#belowMin('') && initialVisible.length === 0,
      disabled: config.disabled ?? false,
      page: 0,
      hasMore: false,
      loadingMore: false,
      resolving: missing.length > 0,
    }
    if (missing.length > 0) void this.#runResolve(missing)
  }

  // ── 狀態存取 ──────────────────────────────────────────────
  getState(): Readonly<SelkitState<T>> {
    return this.#state
  }

  /** 是否該顯示搜尋框 searchable 為真且選項數達 minResultsForSearch  */
  isSearchable(): boolean {
    return this.#searchable && this.#flat.length >= this.#minResultsForSearch
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
    // tokenization：含分隔符時切出完整 token 逐一消化 剩餘片段續為 query
    if (this.#shouldTokenize(query)) {
      const { tokens, rest } = this.#splitTokens(query)
      for (const token of tokens) this.#consumeToken(token)
      query = rest
    }
    if (this.#loadOptions) {
      // 非同步路徑 先更新 query 與 search 事件 再 debounce 載入
      this.#patch({ query })
      this.#fire('search', { query })
      if (this.#belowMin(query)) {
        // 未達字數 取消待載入與進行中的請求並清空 不視為無相符
        this.#cancelLoad()
        this.#patch({ visibleOptions: [], noResults: false, loading: false })
        return
      }
      this.#scheduleLoad(query)
      return
    }
    const visibleOptions = this.#computeVisible(query)
    const hasCreate = this.#createLabel(query) !== null
    const activeIndex = this.#state.isOpen
      ? this.#firstActiveFor(visibleOptions, hasCreate)
      : -1
    this.#patch({
      query,
      visibleOptions,
      noResults:
        !this.#belowMin(query) &&
        !this.#state.loading &&
        !hasCreate &&
        visibleOptions.length === 0,
      activeIndex,
    })
    this.#fire('search', { query })
    if (this.#state.isOpen) {
      this.#fireHighlight(activeIndex)
      // 未達字數時仍在輸入中 不公告「無結果」避免誤導
      if (!this.#belowMin(query)) {
        this.#announce(this.#messages.resultsCount(visibleOptions.length))
      }
    }
  }

  loadMore(): void {
    if (!this.#loadOptions || this.#destroyed) return
    if (!this.#state.hasMore) return
    if (this.#state.loading || this.#state.loadingMore) return
    void this.#runLoad(this.#state.query, this.#state.page + 1, true)
  }

  // ── highlight 移動（不 wrap、跳過 disabled）────────────────
  setActiveIndex(index: number): void {
    const count = this.#activeCount()
    if (index < -1 || index >= count) return
    if (index >= 0 && !this.#isActiveEnabled(index)) return
    this.#patch({ activeIndex: index })
    this.#fireHighlight(index)
  }

  moveActive(delta: number): void {
    const count = this.#activeCount()
    if (count === 0) return
    const dir = delta < 0 ? -1 : 1
    let cursor = this.#state.activeIndex
    if (cursor < 0) cursor = dir > 0 ? -1 : count
    let next = cursor
    for (;;) {
      next += dir
      if (next < 0 || next >= count) return // 邊界：不 wrap 維持原位
      if (this.#isActiveEnabled(next)) break
    }
    this.#patch({ activeIndex: next })
    this.#fireHighlight(next)
  }

  moveActiveToStart(): void {
    const index = this.#firstActiveFor(
      this.#state.visibleOptions,
      this.#createLabel() !== null,
    )
    if (index < 0) return
    this.#patch({ activeIndex: index })
    this.#fireHighlight(index)
  }

  moveActiveToEnd(): void {
    // 有建立列時它在最末 否則為最後一個可選實選項
    const index =
      this.#createLabel() !== null
        ? this.#state.visibleOptions.length
        : this.#lastEnabled(this.#state.visibleOptions)
    if (index < 0) return
    this.#patch({ activeIndex: index })
    this.#fireHighlight(index)
  }

  // ── 選取 ─────────────────────────────────────────────────
  selectActive(): void {
    const { activeIndex, visibleOptions } = this.#state
    const opt = activeIndex >= 0 ? visibleOptions[activeIndex] : undefined
    if (opt) {
      // 多選：再次觸發同一項即取消（checkbox 式 toggle）單選維持選取
      if (this.#multiple) this.toggleSelect(opt.value)
      else this.select(opt.value)
    } else if (this.#taggable) {
      // 落在建立列（index === visibleOptions.length）或無相符 Enter 皆建立 tag
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
      this.#applySelection([...this.#state.selected, opt])
    } else {
      this.#applySelection([opt])
    }
    this.#fireChange()
    this.#announce(this.#messages.selected(opt.label))
    if (this.#closeOnSelect) this.close()
  }

  deselect(value: string | number): void {
    const removed = this.#state.selected.find((o) => o.value === value)
    if (!removed) return
    this.#applySelection(this.#state.selected.filter((o) => o.value !== value))
    this.#fireChange()
    this.#announce(this.#messages.deselected(removed.label))
  }

  toggleSelect(value: string | number): void {
    this.#isSelected(value) ? this.deselect(value) : this.select(value)
  }

  clear(): void {
    if (this.#state.selected.length === 0) return
    this.#applySelection([])
    this.#fireChange()
    this.#announce(this.#messages.cleared())
  }

  moveSelected(from: number, to: number): void {
    const sel = this.#state.selected
    if (from < 0 || from >= sel.length || to < 0 || to >= sel.length) return
    if (from === to) return
    const next = [...sel]
    const moved = next.splice(from, 1)[0]
    if (!moved) return
    next.splice(to, 0, moved)
    this.#patch({ selected: next })
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
    // 驗證鉤子拒絕則不建立（靜默）
    if (this.#isValidToken && !this.#isValidToken(query)) return
    const option = this.#createTag(query)
    this.#flat = [...this.#flat, option]
    this.#rows = [...this.#rows, { kind: 'option', option, groupLabel: null }]
    this.#fire('create', { option })
    this.select(option.value)
    this.#patch({ query: '', visibleOptions: this.#computeVisible('') })
  }

  backspace(): void {
    // 僅多選、輸入框（query）為空時生效 由 adapter 在 Backspace 呼叫
    if (!this.#multiple || this.#state.query !== '') return
    const last = this.#state.selected[this.#state.selected.length - 1]
    if (!last) return
    this.deselect(last.value)
    // 回填模式：把剛移除的 label 放回 query 並開啟下拉顯示相符 供使用者編輯
    if (this.#restoreOnBackspace) {
      if (!this.#state.isOpen) this.open()
      this.setQuery(last.label)
    }
  }

  /** 多選且設了 tokenSeparators 並含其一時才走 tokenization */
  #shouldTokenize(raw: string): boolean {
    if (!this.#multiple || this.#tokenSeparators.length === 0) return false
    return this.#tokenSeparators.some((sep) => sep !== '' && raw.includes(sep))
  }

  /** 依分隔符切割 結尾未被分隔符終結的片段為 rest 支援多字元分隔符 */
  #splitTokens(raw: string): { tokens: string[]; rest: string } {
    const seps = this.#tokenSeparators
    const tokens: string[] = []
    let buf = ''
    let i = 0
    while (i < raw.length) {
      const sep = seps.find((s) => s !== '' && raw.startsWith(s, i))
      if (sep) {
        tokens.push(buf)
        buf = ''
        i += sep.length
      } else {
        buf += raw[i]
        i += 1
      }
    }
    return { tokens, rest: buf }
  }

  /** 消化單一 token：選既有同名選項 否則 taggable 時建立新 tag 皆不動 query */
  #consumeToken(text: string): void {
    const token = text.trim()
    if (token === '') return
    const existing = this.#flat.find(
      (o) => o.label.toLowerCase() === token.toLowerCase(),
    )
    if (existing) {
      if (!existing.disabled) this.select(existing.value)
      return
    }
    if (!this.#taggable || !this.#createTag) return
    // 驗證鉤子拒絕則略過此 token（靜默）
    if (this.#isValidToken && !this.#isValidToken(token)) return
    const option = this.#createTag(token)
    this.#flat = [...this.#flat, option]
    this.#rows = [...this.#rows, { kind: 'option', option, groupLabel: null }]
    this.#fire('create', { option })
    this.select(option.value)
  }

  // ── 動態更新 ──────────────────────────────────────────────
  setOptions(options: SelkitItem<T>[]): void {
    // 選項換掉 遠端快取視為過期 清空
    this.#cacheStore.clear()
    const { rows, flat } = normalize(options)
    this.#rows = rows
    this.#flat = flat
    const visibleOptions = this.#computeVisible(this.#state.query)
    this.#patch({
      visibleOptions,
      noResults:
        !this.#belowMin(this.#state.query) &&
        !this.#state.loading &&
        visibleOptions.length === 0,
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
    const rows: SelkitViewRow<T>[] = this.#grouped()
      ? this.#groupedRows()
      : // 扁平清單：直接依 visibleOptions 順序（反映 sorter）index 即陣列位置
        this.#state.visibleOptions.map((option, index) => ({
          type: 'option' as const,
          index,
          option,
        }))

    const createQuery = this.#createLabel()
    if (createQuery !== null) {
      rows.push({
        type: 'create',
        index: this.#state.visibleOptions.length,
        query: createQuery,
        label: this.#messages.create(createQuery),
      })
    }

    return { rows }
  }

  /** 分組視圖：依 #rows 原始順序交錯標頭與選項 option 的 index 對齊 visibleOptions */
  #groupedRows(): SelkitViewRow<T>[] {
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
    return rows
  }

  getEmptyMessage(): string {
    const s = this.#state
    if (s.loading) return this.#messages.loading
    if (this.#belowMin(s.query)) {
      return this.#messages.minInputLength(this.#minInputLength - s.query.length)
    }
    return this.#messages.noResults
  }

  getEmptyReason(): SelkitEmptyReason {
    const s = this.#state
    if (s.loading) return 'loading'
    if (this.#belowMin(s.query)) return 'min-input'
    return 'no-results'
  }

  destroy(): void {
    this.#cancelLoad()
    this.#resolveSeq++ // 令進行中的 resolveSelected 結果失效
    this.#cacheStore.clear()
    this.#destroyed = true
    this.#listeners.clear()
    this.#handlers.clear()
  }

  // ── 非同步載入 ────────────────────────────────────────────
  #scheduleLoad(query: string): void {
    if (this.#debounceTimer !== null) clearTimeout(this.#debounceTimer)
    this.#debounceTimer = setTimeout(() => {
      this.#debounceTimer = null
      void this.#runLoad(query, 1, false)
    }, this.#debounce)
  }

  /** 取消待載入與進行中的請求 並令過期回應失效（debounce 清除 + abort + seq++）  */
  #cancelLoad(): void {
    if (this.#debounceTimer !== null) clearTimeout(this.#debounceTimer)
    this.#debounceTimer = null
    this.#loadController?.abort()
    this.#loadController = null
    this.#loadSeq++
  }

  /** 讀快取首頁 過期或停用則回 null  */
  #cacheGet(
    query: string,
  ): { items: SelkitItem<T>[]; hasMore: boolean } | null {
    if (!this.#cacheEnabled) return null
    const entry = this.#cacheStore.get(query)
    if (!entry) return null
    if (this.#cacheTTL !== undefined && Date.now() - entry.time > this.#cacheTTL) {
      this.#cacheStore.delete(query)
      return null
    }
    return entry
  }

  async #runLoad(query: string, page: number, append: boolean): Promise<void> {
    // 首頁快取命中：直接套用 不打遠端、不發 load 事件（無實際請求）
    if (!append && page === 1) {
      const hit = this.#cacheGet(query)
      if (hit) {
        this.#applyLoaded(query, page, false, hit.items, hit.hasMore)
        return
      }
    }
    const seq = ++this.#loadSeq
    // 取消上一個進行中的請求（真正中斷 fetch 不只是忽略結果）
    this.#loadController?.abort()
    const controller = new AbortController()
    this.#loadController = controller
    this.#patch(
      append ? { loadingMore: true } : { loading: true, noResults: false },
    )
    this.#fire('load:start', { query })
    try {
      const raw = await this.#loadOptions!(query, page, {
        signal: controller.signal,
      })
      // 過期回應或已銷毀則忽略 避免蓋掉較新的結果
      if (seq !== this.#loadSeq || this.#destroyed) return
      const { items, hasMore } = normalizeLoadResult(raw)
      // 首頁結果寫入快取（分頁不快取）
      if (!append && page === 1 && this.#cacheEnabled) {
        this.#cacheStore.set(query, { items, hasMore, time: Date.now() })
      }
      this.#applyLoaded(query, page, append, items, hasMore)
      this.#fire('load:end', { options: items })
    } catch (error) {
      if (seq !== this.#loadSeq || this.#destroyed) return
      // 自家取消（abort）不視為錯誤 靜默忽略
      if (
        controller.signal.aborted ||
        (error instanceof Error && error.name === 'AbortError')
      ) {
        return
      }
      this.#patch({ loading: false, loadingMore: false })
      this.#fire('load:error', { error })
    }
  }

  /** 套用一批載入結果到 state（fetch 成功與快取命中共用）不發 load:start/end  */
  #applyLoaded(
    query: string,
    page: number,
    append: boolean,
    items: SelkitItem<T>[],
    hasMore: boolean,
  ): void {
    const next = normalize(items)
    // 追加模式接在現有結果後 否則取代
    const flat = append ? [...this.#flat, ...next.flat] : next.flat
    const rows = append ? [...this.#rows, ...next.rows] : next.rows
    this.#rows = rows
    this.#flat = flat
    const base = this.#filterRemote
      ? flat.filter((o) => this.#filter(o, query))
      : flat.slice()
    const filtered = this.#hideSelected
      ? base.filter((o) => !this.#isSelected(o.value))
      : base
    const visibleOptions = this.#sortPool(filtered, query)
    this.#patch({
      loading: false,
      loadingMore: false,
      page,
      hasMore,
      visibleOptions,
      noResults: visibleOptions.length === 0,
      // 追加時保留目前 highlight 不打斷捲動 否則重設
      activeIndex: append
        ? this.#state.activeIndex
        : this.#state.isOpen
          ? this.#firstEnabled(visibleOptions)
          : -1,
    })
    // 首次載入（非追加）且開啟時公告結果數
    if (!append && this.#state.isOpen) {
      this.#announce(this.#messages.resultsCount(visibleOptions.length))
    }
  }

  // ── 內部輔助 ──────────────────────────────────────────────
  /**
   * 解析初始 value 為 selected 並一併回傳 flat 中找不到的 missing values
   * 有設 resolveSelected 時 missing 先以 value 為 label 的 fallback 佔位 讓控制項立即有東西可顯示
   * 待 resolveSelected 回傳後再由 #runResolve 補上正確 label
   */
  #resolveInitial(value: SelkitValue | undefined): {
    selected: SelkitOption<T>[]
    missing: Array<string | number>
  } {
    if (value === undefined || value === null) {
      return { selected: [], missing: [] }
    }
    const values = Array.isArray(value) ? value : [value]
    const selected: SelkitOption<T>[] = []
    const missing: Array<string | number> = []
    for (const v of values) {
      const opt = this.#flat.find((o) => o.value === v)
      if (opt) {
        selected.push(opt)
      } else {
        missing.push(v)
        if (this.#resolveSelected) selected.push({ value: v, label: String(v) })
      }
    }
    if (this.#multiple) return { selected, missing }
    return { selected: selected.slice(0, 1), missing: missing.slice(0, 1) }
  }

  /**
   * 對 missing values 呼叫 resolveSelected 補上 label
   * 以序號防過期（destroy 或新一輪令舊結果失效）只替換 missing 且 hook 有回的 option
   * 不動既有的靜態 option 也不發 change（value 未變 僅 label 由 fallback 轉正）
   * 失敗時維持 fallback 並發 load:error
   */
  async #runResolve(missing: Array<string | number>): Promise<void> {
    const seq = ++this.#resolveSeq
    const missingSet = new Set(missing)
    try {
      const raw = await this.#resolveSelected!(missing)
      // 過期（destroy 或新一輪）則丟棄 避免覆蓋較新狀態
      if (seq !== this.#resolveSeq || this.#destroyed) return
      const byValue = new Map<string | number, SelkitOption<T>>()
      for (const o of raw) byValue.set(o.value, o)
      const selected = this.#state.selected.map((o) =>
        missingSet.has(o.value) && byValue.has(o.value)
          ? (byValue.get(o.value) as SelkitOption<T>)
          : o,
      )
      this.#patch({ selected, resolving: false })
    } catch (error) {
      if (seq !== this.#resolveSeq || this.#destroyed) return
      this.#patch({ resolving: false })
      this.#fire('load:error', { error })
    }
  }

  #belowMin(query: string): boolean {
    return query.length < this.#minInputLength
  }

  /** #rows 是否含分組（含則停用 sorter 並改走分組視圖） */
  #grouped(): boolean {
    return this.#rows.some((r) => r.kind === 'group')
  }

  /** 套用 sorter（僅扁平清單）回傳新陣列 未設或分組時原樣回傳 */
  #sortPool(pool: SelkitOption<T>[], query: string): SelkitOption<T>[] {
    const sorter = this.#sorter
    if (!sorter || this.#grouped()) return pool
    return [...pool].sort((a, b) => sorter(a, b, query))
  }

  #computeVisible(
    query: string,
    selected: SelkitOption<T>[] = this.#state.selected,
  ): SelkitOption<T>[] {
    if (this.#belowMin(query)) return []
    let pool = this.#flat
    if (this.#hideSelected && selected.length > 0) {
      const chosen = new Set(selected.map((o) => o.value))
      pool = pool.filter((o) => !chosen.has(o.value))
    }
    if (query !== '') pool = pool.filter((o) => this.#filter(o, query))
    return this.#sortPool(query === '' ? pool.slice() : pool, query)
  }

  /** 套用新的已選清單 hideSelected 時連帶重算可見選項與 highlight */
  #applySelection(selected: SelkitOption<T>[]): void {
    if (!this.#hideSelected) {
      this.#patch({ selected })
      return
    }
    const visibleOptions = this.#computeVisible(this.#state.query, selected)
    this.#patch({
      selected,
      visibleOptions,
      noResults: !this.#belowMin(this.#state.query) && visibleOptions.length === 0,
      activeIndex: this.#state.isOpen ? this.#firstEnabled(visibleOptions) : -1,
    })
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

  /** 目前是否應顯示「建立新項」列 是則回傳 trim 後的 query 否則 null */
  #createLabel(
    query = this.#state.query,
    selectedCount = this.#state.selected.length,
  ): string | null {
    if (!this.#taggable || !this.#createTag) return null
    if (this.#belowMin(query)) return null
    const q = query.trim()
    if (q === '') return null
    if (
      this.#maxSelections !== undefined &&
      selectedCount >= this.#maxSelections
    ) {
      return null
    }
    // 已有精確同名選項則由該選項本身呈現 不另顯示建立列
    if (this.#flat.some((o) => o.label.toLowerCase() === q.toLowerCase())) {
      return null
    }
    // 驗證鉤子拒絕則不顯示建立列（靜默）
    if (this.#isValidToken && !this.#isValidToken(q)) return null
    return q
  }

  /** 可導航項目數（實選項 + 視情況的建立列） */
  #activeCount(): number {
    return this.#state.visibleOptions.length + (this.#createLabel() ? 1 : 0)
  }

  /** index 是否為可 highlight 的項目（實選項跳過 disabled 建立列恆可） */
  #isActiveEnabled(index: number): boolean {
    const v = this.#state.visibleOptions
    if (index === v.length) return this.#createLabel() !== null
    return index >= 0 && index < v.length && !v[index]?.disabled
  }

  /** 首個可 highlight 的 index：首個可選實選項 皆不可選時退回建立列 否則 -1 */
  #firstActiveFor(opts: SelkitOption<T>[], hasCreate: boolean): number {
    const i = this.#firstEnabled(opts)
    if (i >= 0) return i
    return hasCreate ? opts.length : -1
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

  /** 發出 aria-live 公告 空字串略過 */
  #announce(message: string): void {
    if (message) this.#fire('announce', { message })
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
