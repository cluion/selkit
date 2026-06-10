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
  watch,
  type PropType,
  type VNode,
} from 'vue'
import type { SelkitItem, SelkitValue } from '@selkit/core'
import { useSelkit } from './useSelkit'

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
    placeholder: { type: String, default: '' },
    searchable: { type: Boolean, default: true },
    clearable: { type: Boolean, default: undefined },
    disabled: { type: Boolean, default: false },
    classPrefix: { type: String, default: 'selkit' },
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
      ...(props.clearable !== undefined ? { clearable: props.clearable } : {}),
    })

    const query = ref('')
    const rootRef = ref<HTMLElement | null>(null)
    const inputRef = ref<HTMLInputElement | null>(null)
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
      if (rootRef.value && !rootRef.value.contains(e.target as Node)) {
        controller.close()
      }
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
      query.value = (e.target as HTMLInputElement).value
      controller.open()
      controller.setQuery(query.value)
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
            h('span', { class: cls('tag'), key: `tag-${opt.value}` }, [
              h('span', { class: cls('tag-label') }, opt.label),
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
            h('span', { class: cls('single-value'), key: 'single' }, sel.label),
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

      const dropdownChildren: VNode[] = []
      if (view.rows.length === 0) {
        dropdownChildren.push(
          h('div', { class: cls('empty') }, s.loading ? 'Loading…' : 'No results'),
        )
      } else {
        for (const row of view.rows) {
          if (row.type === 'group') {
            dropdownChildren.push(h('div', { class: cls('group') }, row.label))
            continue
          }
          const attrs = a11y.option(row.index)
          const optClasses = [cls('option')]
          if (row.index === s.activeIndex) optClasses.push(cls('option', 'active'))
          if (attrs['aria-selected']) optClasses.push(cls('option', 'selected'))
          const isDisabled = attrs['aria-disabled'] === true
          dropdownChildren.push(
            h(
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
                  controller.select(row.option.value)
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
            ),
          )
        }
      }

      const rootClasses = [prefix]
      if (props.multiple) rootClasses.push(cls('', 'multiple'))
      if (s.isOpen) rootClasses.push(cls('', 'open'))
      if (s.disabled) rootClasses.push(cls('', 'disabled'))

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
            h('div', { class: cls('field') }, fieldChildren),
            h('div', { class: cls('indicators') }, indicators),
          ],
        ),
        s.isOpen
          ? h(
              'div',
              {
                class: cls('dropdown'),
                id: a11y.listbox.id,
                role: 'listbox',
                ...(props.multiple ? { 'aria-multiselectable': 'true' } : {}),
                style: {
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  left: '0',
                  width: '100%',
                },
                onPointerdown: (e: Event) => e.stopPropagation(),
              },
              dropdownChildren,
            )
          : null,
      ])
    }
  },
})
