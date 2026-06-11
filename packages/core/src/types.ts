/**
 * @selkit/core — 對外型別契約
 *
 * 此檔對應 plan/02-core-api.md 的設計定案（2026-06-10）
 * core 不碰 DOM、不碰框架 僅進 state、出 state 與事件
 */

// ─────────────────────────────────────────────────────────────
// 1. 資料結構
// ─────────────────────────────────────────────────────────────

/** 單一選項 data 泛型讓使用者攜帶自訂資料且型別安全  */
export interface SelkitOption<T = unknown> {
  value: string | number
  label: string
  disabled?: boolean
  data?: T
}

/** 選項分組（optgroup） 僅允許一層  */
export interface SelkitGroup<T = unknown> {
  label: string
  disabled?: boolean
  options: SelkitOption<T>[]
}

/** 傳入的選項可以是扁平選項或分組  */
export type SelkitItem<T = unknown> = SelkitOption<T> | SelkitGroup<T>

/** 對外的值：單選為單值或 null 多選為陣列  */
export type SelkitValue = string | number | null | Array<string | number>

/** 自訂過濾函式 預設為大小寫不敏感的 label 子字串比對  */
export type FilterFn<T = unknown> = (
  option: SelkitOption<T>,
  query: string,
) => boolean

/** loadOptions 的分頁回傳 hasMore 指示是否還有下一頁  */
export interface SelkitLoadResult<T = unknown> {
  items: SelkitItem<T>[]
  hasMore: boolean
}

// ─────────────────────────────────────────────────────────────
// 2. 設定 (Config)
// ─────────────────────────────────────────────────────────────

export interface SelkitConfig<T = unknown> {
  /** 初始選項（扁平或分組）  */
  options?: SelkitItem<T>[]
  /** 初始值  */
  value?: SelkitValue

  /** 是否多選 預設 false  */
  multiple?: boolean
  /** 是否可搜尋 預設 true  */
  searchable?: boolean
  /** 選項數達此值才顯示搜尋框 預設 0（一律顯示）  */
  minResultsForSearch?: number
  /** 已選項目是否從下拉清單隱藏 多選常用 預設 false  */
  hideSelected?: boolean
  /** 是否顯示清除鈕 單選預設 true  */
  clearable?: boolean
  /** 是否停用 預設 false  */
  disabled?: boolean
  placeholder?: string

  /** 選取後是否自動關閉 單選預設 true 多選預設 false  */
  closeOnSelect?: boolean

  /** 自訂過濾 預設大小寫不敏感的 label 子字串比對  */
  filter?: FilterFn<T>
  /** 啟用 fuzzy 子序列比對 取代預設子字串比對 自訂 filter 時此項忽略  */
  fuzzy?: boolean
  /** 最少輸入字數 未達時不過濾也不觸發 loadOptions 預設 0  */
  minInputLength?: number

  /** 非同步載入（AJAX） 提供時 搜尋會觸發此函式 page 從 1 起 回傳陣列或 { items, hasMore } 以支援分頁/無限捲動  */
  loadOptions?: (
    query: string,
    page: number,
  ) => Promise<SelkitItem<T>[] | SelkitLoadResult<T>>
  /** loadOptions 的 debounce 毫秒 預設 250  */
  debounce?: number
  /** 是否對遠端回傳結果再套本地 filter 預設 false（遠端已過濾）  */
  filterRemote?: boolean

  /** tagging：允許動態新增不存在的選項  */
  taggable?: boolean
  /** 由查詢字串建立新選項  */
  createTag?: (query: string) => SelkitOption<T>

  /** 多選上限 超過則無法再選  */
  maxSelections?: number
}

// ─────────────────────────────────────────────────────────────
// 3. 狀態 (State)
// ─────────────────────────────────────────────────────────────

export interface SelkitState<T = unknown> {
  /** 下拉是否開啟  */
  isOpen: boolean
  /** 目前搜尋字串  */
  query: string
  /** highlight 在 visibleOptions 的索引 -1 表無  */
  activeIndex: number
  /** 已選項目（單選長度 0~1 多選 0~n）  */
  selected: SelkitOption<T>[]
  /** 過濾後、扁平化的可見選項  */
  visibleOptions: SelkitOption<T>[]
  /** 非同步載入中  */
  loading: boolean
  /** 非載入中且 visibleOptions 為空  */
  noResults: boolean
  /** 是否停用  */
  disabled: boolean
  /** 非同步分頁 目前已載入頁碼 從 1 起 0 表尚未載入  */
  page: number
  /** 是否還有下一頁可載入  */
  hasMore: boolean
  /** 載入下一頁中 與首次 loading 區別  */
  loadingMore: boolean
}

// ─────────────────────────────────────────────────────────────
// 4. 事件 (Events)
// ─────────────────────────────────────────────────────────────

export interface SelkitEvents<T = unknown> {
  open: void
  close: void
  /** 已選變更（select/deselect/clear/tag 都觸發）  */
  change: { selected: SelkitOption<T>[]; value: SelkitValue }
  search: { query: string }
  highlight: { index: number; option: SelkitOption<T> | null }
  'load:start': { query: string }
  'load:end': { options: SelkitItem<T>[] }
  'load:error': { error: unknown }
  create: { option: SelkitOption<T> }
}

// ─────────────────────────────────────────────────────────────
// 5. a11y 屬性
// ─────────────────────────────────────────────────────────────

export interface SelkitTriggerA11y {
  role: 'combobox'
  'aria-expanded': boolean
  'aria-controls': string
  'aria-haspopup': 'listbox'
  'aria-activedescendant'?: string
  'aria-disabled'?: boolean
}

export interface SelkitListboxA11y {
  role: 'listbox'
  id: string
  'aria-multiselectable'?: boolean
}

export interface SelkitOptionA11y {
  role: 'option'
  id: string
  'aria-selected': boolean
  'aria-disabled'?: boolean
}

export interface SelkitA11y {
  trigger: SelkitTriggerA11y
  listbox: SelkitListboxA11y
  /** 依 visibleOptions 索引取得單一 option 的屬性  */
  option(index: number): SelkitOptionA11y
}

// ─────────────────────────────────────────────────────────────
// 6. 渲染視圖（分組）
// ─────────────────────────────────────────────────────────────

export type SelkitViewRow<T = unknown> =
  | { type: 'group'; label: string; disabled?: boolean }
  | { type: 'option'; index: number; option: SelkitOption<T> }

export interface SelkitGroupedView<T = unknown> {
  /** 標頭與選項交錯序列；option 的 index 對齊 visibleOptions  */
  rows: SelkitViewRow<T>[]
}

// ─────────────────────────────────────────────────────────────
// 7. Controller 介面
// ─────────────────────────────────────────────────────────────

export type SelkitListener<T = unknown> = (
  state: Readonly<SelkitState<T>>,
) => void

export type Unsubscribe = () => void

export interface SelkitController<T = unknown> {
  /** 取得目前狀態快照（唯讀）  */
  getState(): Readonly<SelkitState<T>>
  /** 是否該顯示搜尋框 由 searchable 與 minResultsForSearch 共同決定  */
  isSearchable(): boolean
  /** 訂閱狀態變化 回傳 unsubscribe  */
  subscribe(listener: SelkitListener<T>): Unsubscribe

  // 開關
  open(): void
  close(): void
  toggle(): void

  // 搜尋
  setQuery(query: string): void
  /** 載入下一頁並追加 用於無限捲動 hasMore 為 false 或載入中時無動作  */
  loadMore(): void

  // highlight 移動（含邊界處理、跳過 disabled、不 wrap）
  setActiveIndex(index: number): void
  moveActive(delta: number): void
  moveActiveToStart(): void
  moveActiveToEnd(): void

  // 選取
  selectActive(): void
  select(value: string | number): void
  deselect(value: string | number): void
  toggleSelect(value: string | number): void
  clear(): void
  /** taggable 模式 用目前查詢字串建立並選取新選項 */
  createTag(): void

  // 動態更新
  setOptions(options: SelkitItem<T>[]): void
  setDisabled(disabled: boolean): void

  // 事件
  on<E extends keyof SelkitEvents<T>>(
    event: E,
    handler: (payload: SelkitEvents<T>[E]) => void,
  ): Unsubscribe

  // 衍生視圖
  a11y(): SelkitA11y
  getGroupedView(): SelkitGroupedView<T>

  destroy(): void
}
