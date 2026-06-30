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
  HighlightPart,
  Unsubscribe,
} from './types'
import {
  defaultFilter,
  fuzzyFilter,
  hasTree,
  normalize,
  normalizeLoadResult,
  normalizeTree,
  type NormNode,
  type NormRow,
} from './utils'
import { highlightMatches } from './highlight'

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
  readonly #fuzzy: boolean
  readonly #highlight: boolean
  readonly #sorter: SorterFn<T> | undefined
  readonly #minInputLength: number
  readonly #searchable: boolean
  readonly #minResultsForSearch: number
  readonly #hideSelected: boolean
  readonly #maxSelections: number | undefined
  readonly #treeCascade: boolean
  readonly #highlightFirst: boolean
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

  #rows!: NormRow<T>[]
  #flat!: SelkitOption<T>[]
  #state: SelkitState<T>

  /** tree 模式：選項樹 + 扁平池 + value→節點映射 + 收合集合（空＝全展開） */
  #treeMode = false
  #tree: NormNode<T>[] = []
  #nodeByValue = new Map<string | number, NormNode<T>>()
  #collapsed = new Set<string | number>()
  /** 折疊分組：收合中的 group key 集合（空＝全展開）非 tree 模式使用 */
  #groupCollapsed = new Set<string>()

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
    this.#fuzzy = config.fuzzy ?? false
    this.#highlight = config.highlightMatches ?? true
    this.#sorter = config.sorter
    this.#minInputLength = config.minInputLength ?? 0
    this.#searchable = config.searchable ?? true
    this.#minResultsForSearch = config.minResultsForSearch ?? 0
    this.#hideSelected = config.hideSelected ?? false
    this.#maxSelections = config.maxSelections
    this.#treeCascade = config.treeCascade ?? true
    this.#highlightFirst = config.highlightFirst ?? true
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

    this.#buildOptions(config.options ?? [])

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
      ? this.#autoActive(visibleOptions, hasCreate)
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
      const value = opt.value
      // 多選：再次觸發同一項即取消（checkbox 式 toggle）單選維持選取
      if (this.#multiple) this.toggleSelect(value)
      else this.select(value)
      // 多選不關閉：select 清掉了 highlight，鍵盤連續操作需保持位置（hideSelected 隱藏則不復原）
      if (this.#multiple && this.#state.isOpen) {
        const ni = this.#state.visibleOptions.findIndex((o) => o.value === value)
        if (ni >= 0) this.#patch({ activeIndex: ni })
      }
    } else if (this.#taggable) {
      // 落在建立列（index === visibleOptions.length）或無相符 Enter 皆建立 tag
      this.createTag()
    }
  }

  select(value: string | number): void {
    const opt = this.#findOption(value)
    if (!opt || opt.disabled) return

    // tree cascade：選父 → 勾所有可選子孫葉（葉則勾自身）
    if (this.#treeMode && this.#treeCascade && this.#multiple) {
      const leaves = this.#collectLeaves(value)
      const targets = leaves.length ? leaves : [opt]
      const chosen = new Set(this.#state.selected.map((o) => o.value))
      const next = [...this.#state.selected]
      for (const t of targets) {
        if (t.disabled || chosen.has(t.value)) continue
        if (this.#maxSelections !== undefined && next.length >= this.#maxSelections) {
          break
        }
        chosen.add(t.value)
        next.push(t)
      }
      if (next.length === this.#state.selected.length) return
      this.#applySelection(next)
      this.#fireChange()
      this.#announce(this.#messages.selected(opt.label))
      if (this.#closeOnSelect) this.close()
      return
    }

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
    // tree cascade：取消父 → 移除所有子孫葉（葉則移除自身）
    if (this.#treeMode && this.#treeCascade && this.#multiple) {
      const leaves = this.#collectLeaves(value)
      const drop = leaves.length
        ? new Set(leaves.map((o) => o.value))
        : new Set<string | number>([value])
      const next = this.#state.selected.filter((o) => !drop.has(o.value))
      if (next.length === this.#state.selected.length) return
      const removed = this.#state.selected.find((o) => drop.has(o.value))
      this.#applySelection(next)
      this.#fireChange()
      this.#announce(this.#messages.deselected(removed!.label))
      return
    }
    const removed = this.#state.selected.find((o) => o.value === value)
    if (!removed) return
    this.#applySelection(this.#state.selected.filter((o) => o.value !== value))
    this.#fireChange()
    this.#announce(this.#messages.deselected(removed.label))
  }

  toggleSelect(value: string | number): void {
    // tree cascade：依 computed 三態切換（全選→取消）
    if (this.#treeMode && this.#treeCascade && this.#multiple) {
      this.#getCheckState(value) === 'checked' ? this.deselect(value) : this.select(value)
    } else {
      this.#isSelected(value) ? this.deselect(value) : this.select(value)
    }
  }

  toggleExpanded(value: string | number): void {
    if (!this.#treeMode) return
    const node = this.#nodeByValue.get(value)
    if (!node || node.children.length === 0) return
    const next = new Set(this.#collapsed)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    this.#collapsed = next
    const visibleOptions = this.#treeVisible()
    this.#patch({
      visibleOptions,
      activeIndex: this.#carryActive(visibleOptions),
    })
  }

  toggleGroup(groupKey: string): void {
    if (this.#treeMode) return
    if (!this.#rows.some((r) => r.kind === 'group' && r.key === groupKey)) return
    const next = new Set(this.#groupCollapsed)
    if (next.has(groupKey)) next.delete(groupKey)
    else next.add(groupKey)
    this.#groupCollapsed = next
    const visibleOptions = this.#computeVisible(this.#state.query)
    this.#patch({
      visibleOptions,
      noResults: !this.#belowMin(this.#state.query) && visibleOptions.length === 0,
      activeIndex: this.#carryActive(visibleOptions),
    })
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
    this.#rows = [...this.#rows, { kind: 'option', option, groupLabel: null, depth: 0 }]
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
    this.#rows = [...this.#rows, { kind: 'option', option, groupLabel: null, depth: 0 }]
    this.#fire('create', { option })
    this.select(option.value)
  }

  // ── 動態更新 ──────────────────────────────────────────────
  setOptions(options: SelkitItem<T>[]): void {
    // 選項換掉 遠端快取視為過期 清空
    this.#cacheStore.clear()
    this.#buildOptions(options)
    const visibleOptions = this.#computeVisible(this.#state.query)
    this.#patch({
      visibleOptions,
      noResults:
        !this.#belowMin(this.#state.query) &&
        !this.#state.loading &&
        visibleOptions.length === 0,
      activeIndex: this.#state.isOpen ? this.#autoActive(visibleOptions) : -1,
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
    const treeMode = this.#treeMode
    const nodeByValue = this.#nodeByValue
    const collapsed = this.#collapsed
    const useCheck = treeMode && this.#treeCascade && this.#multiple
    const checkState = (value: string | number) => this.#getCheckState(value)
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
        const node = opt ? nodeByValue.get(opt.value) : undefined
        const hasChildren = !!node?.children.length
        const cs = opt ? checkState(opt.value) : 'unchecked'
        return {
          role: (treeMode ? 'treeitem' : 'option') as 'option' | 'treeitem',
          id: `${id}-opt-${index}`,
          'aria-selected': useCheck ? false : opt ? isSelected(opt.value) : false,
          ...(useCheck && opt
            ? {
                'aria-checked':
                  cs === 'checked' ? true : cs === 'mixed' ? 'mixed' : false,
              }
            : {}),
          ...(opt?.disabled ? { 'aria-disabled': true } : {}),
          ...(treeMode && hasChildren && opt
            ? { 'aria-expanded': !collapsed.has(opt.value) }
            : {}),
        }
      },
    }
  }

  getGroupedView(): SelkitGroupedView<T> {
    const rows: SelkitViewRow<T>[] = this.#treeMode
      ? this.#treeRows()
      : this.#grouped()
        ? this.#groupedRows()
        : // 扁平清單：直接依 visibleOptions 順序（反映 sorter）index 即陣列位置
          this.#state.visibleOptions.map((option, index) => ({
            type: 'option' as const,
            index,
            option,
            depth: 0,
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

  /**
   * 分組視圖：依 #rows 順序交錯標頭與選項 多層時用 depth 棧保留命中葉的祖先標頭
   * 標題顯示條件看「搜尋池」（含收合後代）→ 收合的標題仍顯示供點擊展開
   * option 是否輸出看 visibleOptions → 收合的後代選項不輸出
   */
  #groupedRows(): SelkitViewRow<T>[] {
    // searchable：搜尋過濾後的池（不排除收合）用於判斷標題該不該顯示
    const searchable = this.#computeVisible(
      this.#state.query,
      this.#state.selected,
      false,
    )
    const searchByValue = new Set(searchable.map((o) => o.value))
    const visByValue = new Map<string | number, number>()
    this.#state.visibleOptions.forEach((o, i) => visByValue.set(o.value, i))

    const rows: SelkitViewRow<T>[] = []
    // 待 emit 的祖先標頭棧：option 命中時補上沿途尚未顯示的標頭
    const stack: {
      label: string
      disabled: boolean
      depth: number
      collapsible: boolean
      key: string
      emitted: boolean
    }[] = []
    const searching = this.#state.query !== ''

    for (const row of this.#rows) {
      if (row.kind === 'group') {
        while (stack.length && stack[stack.length - 1]!.depth >= row.depth) stack.pop()
        stack.push({
          label: row.label,
          disabled: row.disabled,
          depth: row.depth,
          collapsible: row.collapsible,
          key: row.key,
          emitted: false,
        })
        continue
      }
      // 搜尋過濾：此 option 不在搜尋池 → 跳過（其祖先標頭也不 emit）
      if (!searchByValue.has(row.option.value)) continue
      // 吐掉不屬於此選項祖先的同層/深層標頭（頂層選項 depth 0 → 清空）
      while (stack.length && stack[stack.length - 1]!.depth >= row.depth) stack.pop()
      // 最淺的收合祖先（非搜尋時）：該祖先之下（含巢狀標題與選項）全隱藏 只 emit 到該祖先（含）
      let collapseIdx = -1
      if (!searching) {
        for (let i = 0; i < stack.length; i++) {
          if (this.#groupCollapsed.has(stack[i]!.key)) {
            collapseIdx = i
            break
          }
        }
      }
      const emitUntil = collapseIdx >= 0 ? collapseIdx : stack.length - 1
      for (let i = 0; i <= emitUntil; i++) {
        const g = stack[i]!
        if (g.emitted) continue
        rows.push({
          type: 'group',
          label: g.label,
          depth: g.depth,
          ...(g.disabled ? { disabled: true } : {}),
          collapsible: g.collapsible,
          expanded: searching ? true : !this.#groupCollapsed.has(g.key),
          groupKey: g.key,
        })
        g.emitted = true
      }
      // 收合子樹內的選項不輸出；否則依 visibleOptions 輸出（hideSelected 等過濾）
      if (collapseIdx === -1) {
        const index = visByValue.get(row.option.value)
        if (index !== undefined) {
          rows.push({ type: 'option', index, option: row.option, depth: row.depth })
        }
      }
    }
    return rows
  }

  /** 正規化選項：tree 模式（option.children）或一般（group/扁平）分流  */
  #buildOptions(items: SelkitItem<T>[]): void {
    if (hasTree(items)) {
      this.#treeMode = true
      const opts = items.filter((i): i is SelkitOption<T> => !('options' in i))
      const { tree, flat } = normalizeTree(opts)
      this.#tree = tree
      this.#flat = flat
      this.#rows = []
      this.#nodeByValue = new Map()
      const fill = (nodes: NormNode<T>[]) => {
        for (const n of nodes) {
          this.#nodeByValue.set(n.option.value, n)
          fill(n.children)
        }
      }
      fill(tree)
      return
    }
    this.#treeMode = false
    const { rows, flat } = normalize(items)
    this.#rows = rows
    this.#flat = flat
    this.#tree = []
    this.#nodeByValue = new Map()
    // 初始收合：從 defaultCollapsed 的 group 收集 key
    this.#groupCollapsed = new Set(
      rows.flatMap((r) => (r.kind === 'group' && r.collapsed ? [r.key] : [])),
    )
  }

  /** tree 模式可見序列：無 query 依收合狀態；有 query 保留命中 + 祖先鏈（自動展開） */
  #treeVisible(query = ''): SelkitOption<T>[] {
    const result: SelkitOption<T>[] = []
    if (query === '') {
      const walk = (nodes: NormNode<T>[]) => {
        for (const n of nodes) {
          result.push(n.option)
          if (n.children.length && !this.#collapsed.has(n.option.value)) {
            walk(n.children)
          }
        }
      }
      walk(this.#tree)
      return result
    }
    // 有 query：算子樹命中 → DFS 保留命中節點 + 祖先
    const hit = new Map<string | number, boolean>()
    const calc = (n: NormNode<T>): boolean => {
      let childHit = false
      for (const c of n.children) {
        if (calc(c)) childHit = true
      }
      const h = this.#filter(n.option, query) || childHit
      hit.set(n.option.value, h)
      return h
    }
    this.#tree.forEach(calc)
    const walk = (nodes: NormNode<T>[]) => {
      for (const n of nodes) {
        if (!hit.get(n.option.value)) continue
        result.push(n.option)
        walk(n.children)
      }
    }
    walk(this.#tree)
    return result
  }

  /** 收集某節點的所有子孫葉（含 disabled）葉節點回傳自身  */
  #collectLeaves(value: string | number): SelkitOption<T>[] {
    const node = this.#nodeByValue.get(value)
    if (!node) return []
    const leaves: SelkitOption<T>[] = []
    const walk = (n: NormNode<T>): void => {
      if (n.children.length === 0) leaves.push(n.option)
      else for (const c of n.children) walk(c)
    }
    walk(node)
    return leaves
  }

  /** 節點勾選三態：tree cascade 父從可選子孫葉 computed；其餘看 selected  */
  #getCheckState(value: string | number): 'checked' | 'unchecked' | 'mixed' {
    if (!this.#treeMode || !this.#treeCascade || !this.#multiple) {
      return this.#isSelected(value) ? 'checked' : 'unchecked'
    }
    const node = this.#nodeByValue.get(value)
    if (!node || node.children.length === 0) {
      return this.#isSelected(value) ? 'checked' : 'unchecked'
    }
    const leaves = this.#collectLeaves(value).filter((o) => !o.disabled)
    if (leaves.length === 0) return 'unchecked'
    const sel = new Set(this.#state.selected.map((o) => o.value))
    const hit = leaves.filter((o) => sel.has(o.value)).length
    return hit === 0 ? 'unchecked' : hit === leaves.length ? 'checked' : 'mixed'
  }

  /** tree 模式視圖：可見序列映射為 treeitem rows  */
  #treeRows(): SelkitViewRow<T>[] {
    return this.#state.visibleOptions.map((option, index) => {
      const node = this.#nodeByValue.get(option.value)
      return {
        type: 'treeitem' as const,
        index,
        option,
        depth: node?.depth ?? 0,
        expanded:
          this.#state.query !== ''
            ? true
            : node
              ? !this.#collapsed.has(option.value)
              : true,
        hasChildren: !!node?.children.length,
        checked: this.#getCheckState(option.value),
      }
    })
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

  /** label 依目前 query 切成高亮片段；關閉或空 query 時整段不 match */
  highlightLabel(label: string): HighlightPart[] {
    if (!this.#highlight) return [{ text: label, match: false }]
    return highlightMatches(label, this.#state.query, this.#fuzzy)
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
          ? this.#autoActive(visibleOptions)
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
    excludeCollapsed = true,
  ): SelkitOption<T>[] {
    if (this.#treeMode) return this.#treeVisible(query)
    if (this.#belowMin(query)) return []
    let pool = this.#flat
    if (this.#hideSelected && selected.length > 0) {
      const chosen = new Set(selected.map((o) => o.value))
      pool = pool.filter((o) => !chosen.has(o.value))
    }
    // 折疊分組：排除收合中 group 的後代選項（搜尋時自動展開 不排除）
    if (excludeCollapsed) {
      const hidden = this.#groupHiddenValues(query)
      if (hidden.size > 0) pool = pool.filter((o) => !hidden.has(o.value))
    }
    if (query !== '') pool = pool.filter((o) => this.#filter(o, query))
    return this.#sortPool(query === '' ? pool.slice() : pool, query)
  }

  /**
   * 收合中 group 的後代 option value 集合（應自可見清單隱藏）
   * 搜尋中（query !== ''）或無任何收合時回空集合（自動展開）
   * 以 #rows 的 DFS 序 + depth 棧判斷祖先鏈是否含收合 group
   */
  #groupHiddenValues(query: string): Set<string | number> {
    if (query !== '' || this.#groupCollapsed.size === 0) {
      return new Set()
    }
    const hidden = new Set<string | number>()
    const stack: { depth: number; collapsed: boolean }[] = []
    for (const row of this.#rows) {
      if (row.kind === 'group') {
        while (stack.length && stack[stack.length - 1]!.depth >= row.depth) stack.pop()
        stack.push({ depth: row.depth, collapsed: this.#groupCollapsed.has(row.key) })
        continue
      }
      while (stack.length && stack[stack.length - 1]!.depth >= row.depth) stack.pop()
      if (stack.some((g) => g.collapsed)) hidden.add(row.option.value)
    }
    return hidden
  }

  /** 套用新的已選清單 選取後清掉 highlight（下次由鍵盤導覽重新帶出） */
  #applySelection(selected: SelkitOption<T>[]): void {
    if (!this.#hideSelected) {
      this.#patch({ selected, activeIndex: -1 })
      return
    }
    const visibleOptions = this.#computeVisible(this.#state.query, selected)
    this.#patch({
      selected,
      visibleOptions,
      noResults: !this.#belowMin(this.#state.query) && visibleOptions.length === 0,
      activeIndex: -1,
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

  /** 收合／展開後保留原 highlight：原 active 的選項仍在可見清單則帶到新 index 否則 -1（不主動跳首項） */
  #carryActive(newVisible: SelkitOption<T>[]): number {
    const old = this.#state.activeIndex
    if (old < 0 || old >= this.#state.visibleOptions.length) return -1
    const value = this.#state.visibleOptions[old]!.value
    const ni = newVisible.findIndex((o) => o.value === value)
    return ni >= 0 && !newVisible[ni]?.disabled ? ni : -1
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

  /** 自動 highlight 起點（開啟／搜尋／載入後）：highlightFirst 關閉時不自動 highlight 回 -1 否則首個可選項（或建立列） */
  #autoActive(opts: SelkitOption<T>[], hasCreate = false): number {
    if (!this.#highlightFirst) return -1
    return this.#firstActiveFor(opts, hasCreate)
  }

  #lastEnabled(opts: SelkitOption<T>[]): number {
    for (let i = opts.length - 1; i >= 0; i--) {
      if (!opts[i]?.disabled) return i
    }
    return -1
  }

  #initialActive(): number {
    if (!this.#highlightFirst) return -1
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
