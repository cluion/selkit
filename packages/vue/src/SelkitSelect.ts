/**
 * @selkit/vue — SelkitSelect 元件
 *
 * 用 Vue render function 響應式渲染 行為全部委派給 @selkit/core controller
 * 支援 v-model（非受控橋接）多選 搜尋 分組 與 option slot 自訂選項
 */
import {
  defineComponent,
  h,
  onMounted,
  onUnmounted,
  ref,
  Teleport,
  watch,
  type PropType,
  type StyleValue,
  type VNode,
} from 'vue'
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

type OptionRow = Extract<SelkitViewRow, { type: 'option' }>
type CreateRow = Extract<SelkitViewRow, { type: 'create' }>

/** sr-only：視覺隱藏但螢幕報讀可讀 內聯以免未載入主題時外露 */
const SR_ONLY: StyleValue = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: '0',
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: '0',
}

function sameValue(a: SelkitValue, b: SelkitValue): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((x, i) => x === b[i])
  }
  return a === b
}

export const SelkitSelect = defineComponent({
  name: 'SelkitSelect',
  props: {
    options: { type: Array as PropType<SelkitItem[]>, default: () => [] },
    modelValue: {
      type: [String, Number, Array] as PropType<SelkitValue>,
      default: null,
    },
    multiple: { type: Boolean, default: false },
    checkboxes: { type: Boolean, default: false },
    placeholder: { type: String, default: '' },
    searchable: { type: Boolean, default: true },
    minResultsForSearch: { type: Number, default: undefined },
    fuzzy: { type: Boolean, default: false },
    minInputLength: { type: Number, default: undefined },
    hideSelected: { type: Boolean, default: false },
    virtualScroll: { type: Boolean, default: false },
    itemHeight: { type: Number, default: 36 },
    dropdownParent: {
      type: [String, Object] as PropType<string | HTMLElement>,
      default: undefined,
    },
    clearable: { type: Boolean, default: undefined },
    disabled: { type: Boolean, default: false },
    classPrefix: { type: String, default: 'selkit' },
    loadOptions: {
      type: Function as PropType<
        (
          query: string,
          page: number,
        ) => Promise<SelkitItem[] | SelkitLoadResult>
      >,
      default: undefined,
    },
    debounce: { type: Number, default: undefined },
    taggable: { type: Boolean, default: false },
    createTag: {
      type: Function as PropType<(query: string) => SelkitOption>,
      default: undefined,
    },
    tokenSeparators: {
      type: Array as PropType<string[]>,
      default: undefined,
    },
    maxSelections: { type: Number, default: undefined },
    messages: {
      type: Object as PropType<Partial<SelkitMessages>>,
      default: undefined,
    },
  },
  emits: ['update:modelValue', 'change'],
  setup(props, { emit, slots, expose }) {
    const prefix = props.classPrefix
    const cls = (name: string, mod?: string): string => {
      const base = name ? `${prefix}__${name}` : prefix
      return mod ? `${base}--${mod}` : base
    }

    const { controller, state } = useSelkit({
      options: props.options,
      value: props.modelValue,
      multiple: props.multiple,
      placeholder: props.placeholder,
      searchable: props.searchable,
      disabled: props.disabled,
      taggable: props.taggable,
      fuzzy: props.fuzzy,
      hideSelected: props.hideSelected,
      ...(props.minInputLength !== undefined
        ? { minInputLength: props.minInputLength }
        : {}),
      ...(props.minResultsForSearch !== undefined
        ? { minResultsForSearch: props.minResultsForSearch }
        : {}),
      ...(props.clearable !== undefined ? { clearable: props.clearable } : {}),
      ...(props.loadOptions ? { loadOptions: props.loadOptions } : {}),
      ...(props.debounce !== undefined ? { debounce: props.debounce } : {}),
      ...(props.createTag ? { createTag: props.createTag } : {}),
      ...(props.tokenSeparators
        ? { tokenSeparators: props.tokenSeparators }
        : {}),
      ...(props.maxSelections !== undefined
        ? { maxSelections: props.maxSelections }
        : {}),
      ...(props.messages ? { messages: props.messages } : {}),
    })

    const query = ref('')
    const liveMessage = ref('')
    const rootRef = ref<HTMLElement | null>(null)
    const inputRef = ref<HTMLInputElement | null>(null)
    const dropdownRef = ref<HTMLElement | null>(null)
    const scrollTop = ref(0)
    let dragFrom = -1

    // portal 模式下用 fixed 座標定位 量測 root rect 並隨 scroll/resize 更新
    const dropdownPos = ref({ top: 0, left: 0, width: 0 })
    const updatePos = (): void => {
      const el = rootRef.value
      if (!el) return
      const r = el.getBoundingClientRect()
      dropdownPos.value = { top: r.bottom + 4, left: r.left, width: r.width }
    }
    watch(
      () => state.value.isOpen,
      (open) => {
        if (!props.dropdownParent) return
        if (open) {
          updatePos()
          window.addEventListener('scroll', updatePos, true)
          window.addEventListener('resize', updatePos)
        } else {
          window.removeEventListener('scroll', updatePos, true)
          window.removeEventListener('resize', updatePos)
        }
      },
    )
    onUnmounted(() => {
      window.removeEventListener('scroll', updatePos, true)
      window.removeEventListener('resize', updatePos)
    })
    let syncing = false

    const currentValue = (): SelkitValue => {
      const sel = state.value.selected
      return props.multiple ? sel.map((o) => o.value) : (sel[0]?.value ?? null)
    }

    controller.on('change', (e) => {
      if (syncing) return
      emit('update:modelValue', e.value)
      emit('change', e)
    })

    controller.on('create', () => {
      query.value = ''
    })

    controller.on('announce', ({ message }) => {
      liveMessage.value = message
    })

    controller.on('close', () => {
      if (query.value !== '') {
        query.value = ''
        controller.setQuery('')
      }
    })

    // 外部 modelValue → controller 非受控橋接 用 syncing 旗標防止回灌迴圈
    watch(
      () => props.modelValue,
      (v) => {
        if (sameValue(v, currentValue())) return
        syncing = true
        controller.clear()
        const vals = Array.isArray(v) ? v : v == null ? [] : [v]
        for (const val of vals) controller.select(val)
        syncing = false
      },
    )

    watch(
      () => props.options,
      (opts) => controller.setOptions(opts),
    )
    watch(
      () => props.disabled,
      (d) => controller.setDisabled(d),
    )

    const onDocPointer = (e: Event): void => {
      const target = e.target as Node
      // portal 模式下拉在元件之外 需一併視為內部點擊
      const inside =
        rootRef.value?.contains(target) || dropdownRef.value?.contains(target)
      if (!inside) controller.close()
    }
    onMounted(() => document.addEventListener('pointerdown', onDocPointer))
    onUnmounted(() => document.removeEventListener('pointerdown', onDocPointer))

    expose({ controller })

    const onControlPointerdown = (e: PointerEvent): void => {
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
        const sel = state.value.selected[idx]
        if (sel) controller.deselect(sel.value)
        return
      }
      if (target.closest(`.${cls('input')}`)) {
        controller.open()
        return
      }
      e.preventDefault()
      inputRef.value?.focus()
      controller.toggle()
    }

    const onInput = (e: Event): void => {
      const v = (e.target as HTMLInputElement).value
      controller.open()
      controller.setQuery(v)
      // tokenization 可能改寫 query（切出 tag）以 core 的 query 為準
      query.value = controller.getState().query
    }

    const onKeydown = (e: KeyboardEvent): void => {
      const s = state.value
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
          if (props.multiple && query.value === '' && s.selected.length) {
            const last = s.selected[s.selected.length - 1]
            if (last) controller.deselect(last.value)
          }
          break
      }
    }

    return () => {
      const s = state.value
      const a11y = controller.a11y()
      const view = controller.getGroupedView()

      const fieldChildren: VNode[] = []
      if (props.multiple) {
        s.selected.forEach((opt, i) => {
          fieldChildren.push(
            h(
              'span',
              {
                class: cls('tag'),
                key: `tag-${opt.value}`,
                draggable: true,
                'data-index': String(i),
              },
              [
              h(
                'span',
                { class: cls('tag-label') },
                slots.selection
                  ? slots.selection({ option: opt, index: i, multiple: true })
                  : opt.label,
              ),
              h(
                'button',
                {
                  type: 'button',
                  class: cls('tag-remove'),
                  'data-index': String(i),
                  'aria-label': `Remove ${opt.label}`,
                },
                '×',
              ),
            ]),
          )
        })
      } else {
        const sel = s.selected[0]
        if (sel && query.value === '') {
          fieldChildren.push(
            h(
              'span',
              { class: cls('single-value'), key: 'single' },
              slots.selection
                ? slots.selection({ option: sel, index: 0, multiple: false })
                : sel.label,
            ),
          )
        }
      }
      fieldChildren.push(
        h('input', {
          key: 'input',
          ref: inputRef,
          class: cls('input'),
          type: 'text',
          autocomplete: 'off',
          'aria-autocomplete': 'list',
          value: query.value,
          placeholder: s.selected.length === 0 ? props.placeholder : '',
          disabled: s.disabled,
          readonly: !controller.isSearchable(),
          onInput,
        }),
      )

      const indicators: VNode[] = []
      const clearable = props.clearable ?? !props.multiple
      if (clearable && s.selected.length > 0) {
        indicators.push(
          h(
            'button',
            { type: 'button', class: cls('clear'), 'aria-label': 'Clear' },
            '×',
          ),
        )
      }
      indicators.push(h('span', { class: cls('arrow'), 'aria-hidden': 'true' }))

      const buildOption = (row: OptionRow): VNode => {
        const attrs = a11y.option(row.index)
        const optClasses = [cls('option')]
        if (row.index === s.activeIndex) optClasses.push(cls('option', 'active'))
        if (attrs['aria-selected']) optClasses.push(cls('option', 'selected'))
        const isDisabled = attrs['aria-disabled'] === true
        return h(
          'div',
          {
            key: `opt-${row.option.value}`,
            class: optClasses,
            id: attrs.id,
            role: 'option',
            'aria-selected': String(attrs['aria-selected']),
            ...(isDisabled ? { 'aria-disabled': 'true' } : {}),
            onPointerdown: (e: PointerEvent) => {
              if (isDisabled) return
              e.preventDefault()
              if (props.multiple) controller.toggleSelect(row.option.value)
              else controller.select(row.option.value)
            },
          },
          slots.option
            ? slots.option({
                option: row.option,
                index: row.index,
                active: row.index === s.activeIndex,
                selected: attrs['aria-selected'],
              })
            : row.option.label,
        )
      }

      const buildCreateRow = (row: CreateRow): VNode => {
        const attrs = a11y.option(row.index)
        const optClasses = [cls('option'), cls('create')]
        if (row.index === s.activeIndex) optClasses.push(cls('option', 'active'))
        return h(
          'div',
          {
            key: 'selkit-create',
            class: optClasses,
            id: attrs.id,
            role: 'option',
            'aria-selected': 'false',
            onPointerdown: (e: PointerEvent) => {
              e.preventDefault()
              controller.createTag()
            },
          },
          row.label,
        )
      }

      const spacer = (key: string, height: number): VNode =>
        h('div', { key, 'aria-hidden': 'true', style: { height: `${height}px` } })

      const dropdownChildren: VNode[] = []
      const hasGroups = view.rows.some((r) => r.type === 'group')
      if (view.rows.length === 0) {
        dropdownChildren.push(
          h('div', { class: cls('empty') }, controller.getEmptyMessage()),
        )
      } else if (props.virtualScroll && !hasGroups) {
        // 虛擬捲動僅在無分組的扁平清單啟用
        const range = computeVirtualRange({
          scrollTop: scrollTop.value,
          viewportHeight: dropdownRef.value?.clientHeight ?? 0,
          itemHeight: props.itemHeight,
          itemCount: view.rows.length,
        })
        dropdownChildren.push(spacer('vtop', range.paddingTop))
        for (let i = range.startIndex; i < range.endIndex; i++) {
          const row = view.rows[i]
          if (row?.type === 'option') dropdownChildren.push(buildOption(row))
          else if (row?.type === 'create')
            dropdownChildren.push(buildCreateRow(row))
        }
        dropdownChildren.push(spacer('vbot', range.paddingBottom))
      } else {
        for (const row of view.rows) {
          if (row.type === 'group') {
            dropdownChildren.push(h('div', { class: cls('group') }, row.label))
            continue
          }
          if (row.type === 'create') {
            dropdownChildren.push(buildCreateRow(row))
            continue
          }
          dropdownChildren.push(buildOption(row))
        }
      }

      const rootClasses = [prefix]
      if (props.multiple) rootClasses.push(cls('', 'multiple'))
      if (props.multiple && props.checkboxes) {
        rootClasses.push(cls('', 'checkboxes'))
      }
      if (s.isOpen) rootClasses.push(cls('', 'open'))
      if (s.disabled) rootClasses.push(cls('', 'disabled'))

      const portaled = props.dropdownParent != null
      const dropdownVNode = h(
        'div',
        {
          ref: dropdownRef,
          // portal 時補上 prefix class 讓 --selkit-* 變數能在此解析
          class: portaled ? [cls('dropdown'), prefix] : cls('dropdown'),
          id: a11y.listbox.id,
          role: 'listbox',
          ...(props.multiple ? { 'aria-multiselectable': 'true' } : {}),
          style: portaled
            ? {
                position: 'fixed',
                top: `${dropdownPos.value.top}px`,
                left: `${dropdownPos.value.left}px`,
                width: `${dropdownPos.value.width}px`,
              }
            : {
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: '0',
                width: '100%',
              },
          onPointerdown: (e: Event) => e.stopPropagation(),
          onScroll: (e: Event) => {
            const el = e.currentTarget as HTMLElement
            scrollTop.value = el.scrollTop
            if (
              el.scrollTop + el.clientHeight >=
              el.scrollHeight - LOAD_MORE_THRESHOLD
            ) {
              controller.loadMore()
            }
          },
        },
        dropdownChildren,
      )
      const dropdownSlot = !s.isOpen
        ? null
        : portaled
          ? h(Teleport, { to: props.dropdownParent }, [dropdownVNode])
          : dropdownVNode

      return h('div', { class: rootClasses, ref: rootRef }, [
        h(
          'div',
          {
            class: cls('control'),
            role: a11y.trigger.role,
            tabindex: 0,
            'aria-expanded': String(a11y.trigger['aria-expanded']),
            'aria-haspopup': a11y.trigger['aria-haspopup'],
            'aria-controls': a11y.trigger['aria-controls'],
            ...(a11y.trigger['aria-activedescendant']
              ? { 'aria-activedescendant': a11y.trigger['aria-activedescendant'] }
              : {}),
            ...(s.disabled ? { 'aria-disabled': 'true' } : {}),
            onPointerdown: onControlPointerdown,
            onKeydown,
          },
          [
            h(
              'div',
              {
                class: cls('field'),
                onDragstart: (e: DragEvent) => {
                  const tag = (e.target as HTMLElement).closest(
                    `.${cls('tag')}`,
                  ) as HTMLElement | null
                  if (!tag) return
                  dragFrom = Number(tag.dataset.index)
                  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
                },
                onDragover: (e: DragEvent) => {
                  if (dragFrom >= 0) e.preventDefault()
                },
                onDrop: (e: DragEvent) => {
                  if (dragFrom < 0) return
                  e.preventDefault()
                  const tag = (e.target as HTMLElement).closest(
                    `.${cls('tag')}`,
                  ) as HTMLElement | null
                  const to = tag
                    ? Number(tag.dataset.index)
                    : controller.getState().selected.length - 1
                  controller.moveSelected(dragFrom, to)
                  dragFrom = -1
                },
                onDragend: () => {
                  dragFrom = -1
                },
              },
              fieldChildren,
            ),
            h('div', { class: cls('indicators') }, indicators),
          ],
        ),
        dropdownSlot,
        // aria-live region：螢幕報讀公告 視覺隱藏
        h(
          'div',
          {
            class: cls('live'),
            role: 'status',
            'aria-live': 'polite',
            'aria-atomic': 'true',
            style: SR_ONLY,
          },
          liveMessage.value,
        ),
      ])
    }
  },
})
