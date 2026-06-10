/**
 * @selkit/dom — createSelkitDom
 *
 * 以 @selkit/core 為大腦的原生 JS 渲染層：建構 DOM、綁定事件
 * 套用 a11y 屬性、訂閱 state 重繪、開啟時用預設定位器定位
 * 不實作任何「行為」——所有邏輯都委派給 core controller
 */
import { createSelkit } from '@selkit/core'
import type {
  SelkitConfig,
  SelkitController,
  SelkitState,
} from '@selkit/core'
import { attachPositioner, type Positioner } from './positioner'

export interface SelkitDomConfig<T = unknown> extends SelkitConfig<T> {
  /** class 前綴 預設 "selkit"  */
  classPrefix?: string
}

export interface SelkitDomInstance<T = unknown> {
  readonly controller: SelkitController<T>
  readonly element: HTMLElement
  destroy(): void
}

export class SelkitDom<T> implements SelkitDomInstance<T> {
  readonly controller: SelkitController<T>
  readonly element: HTMLElement

  readonly #prefix: string
  readonly #multiple: boolean
  readonly #clearable: boolean
  readonly #placeholder: string

  readonly #control: HTMLElement
  readonly #field: HTMLElement
  readonly #input: HTMLInputElement
  readonly #indicators: HTMLElement
  readonly #dropdown: HTMLElement

  #positioner: Positioner | null = null
  readonly #unsubscribe: () => void
  readonly #offClose: () => void
  readonly #onDocPointer: (e: Event) => void

  constructor(target: HTMLElement | string, config: SelkitDomConfig<T>) {
    const host =
      typeof target === 'string'
        ? document.querySelector<HTMLElement>(target)
        : target
    if (!host) {
      throw new Error(`[selkit] 找不到掛載目標 ${String(target)}`)
    }
    this.#prefix = config.classPrefix ?? 'selkit'
    this.#multiple = config.multiple ?? false
    this.#clearable = config.clearable ?? !this.#multiple
    this.#placeholder = config.placeholder ?? ''
    this.controller = createSelkit<T>(config)

    this.element = document.createElement('div')
    this.element.className = this.#prefix
    if (this.#multiple) this.element.classList.add(this.#cls('', 'multiple'))

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

    this.#indicators = document.createElement('div')
    this.#indicators.className = this.#cls('indicators')

    this.#dropdown = document.createElement('div')
    this.#dropdown.className = this.#cls('dropdown')
    this.#dropdown.hidden = true

    this.#field.append(this.#input)
    this.#control.append(this.#field, this.#indicators)
    this.element.append(this.#control, this.#dropdown)
    host.append(this.element)

    this.#bindEvents()

    this.#onDocPointer = (e: Event): void => {
      if (!this.element.contains(e.target as Node)) this.controller.close()
    }
    document.addEventListener('pointerdown', this.#onDocPointer)

    // 關閉時清空搜尋字 回復完整選項
    this.#offClose = this.controller.on('close', () => {
      if (this.#input.value !== '') {
        this.#input.value = ''
        this.controller.setQuery('')
      }
    })

    this.#unsubscribe = this.controller.subscribe((s) => this.#render(s))
    this.#render(this.controller.getState())
  }

  destroy(): void {
    this.#unsubscribe()
    this.#offClose()
    this.#positioner?.destroy()
    document.removeEventListener('pointerdown', this.#onDocPointer)
    this.controller.destroy()
    this.element.remove()
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
    })

    this.#control.addEventListener('keydown', (e) => this.#onKeydown(e))

    this.#dropdown.addEventListener('pointerdown', (e) => {
      e.stopPropagation() // 內部互動不冒泡到 outside-click handler
      const optEl = (e.target as HTMLElement).closest(
        `.${this.#cls('option')}`,
      ) as HTMLElement | null
      if (!optEl || optEl.getAttribute('aria-disabled') === 'true') return
      e.preventDefault()
      const index = Number(optEl.dataset.index)
      const opt = this.controller.getState().visibleOptions[index]
      if (opt) this.controller.select(opt.value)
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
          const last = st.selected[st.selected.length - 1]
          if (last) this.controller.deselect(last.value)
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
    this.element.classList.toggle(this.#cls('', 'open'), s.isOpen)
    this.element.classList.toggle(this.#cls('', 'disabled'), s.disabled)
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

        const label = document.createElement('span')
        label.className = this.#cls('tag-label')
        label.textContent = opt.label

        const remove = document.createElement('button')
        remove.type = 'button'
        remove.className = this.#cls('tag-remove')
        remove.dataset.index = String(i)
        remove.setAttribute('aria-label', `Remove ${opt.label}`)
        remove.textContent = '×'

        tag.append(label, remove)
        frag.append(tag)
      })
    } else {
      const sel = s.selected[0]
      if (sel && this.#input.value === '') {
        const single = document.createElement('span')
        single.className = this.#cls('single-value')
        single.textContent = sel.label
        frag.append(single)
      }
    }

    this.#field.insertBefore(frag, this.#input)
    this.#input.placeholder = s.selected.length === 0 ? this.#placeholder : ''
  }

  #renderIndicators(s: Readonly<SelkitState<T>>): void {
    this.#indicators.replaceChildren()

    if (this.#clearable && s.selected.length > 0) {
      const clear = document.createElement('button')
      clear.type = 'button'
      clear.className = this.#cls('clear')
      clear.setAttribute('aria-label', 'Clear')
      clear.textContent = '×'
      this.#indicators.append(clear)
    }

    const arrow = document.createElement('span')
    arrow.className = this.#cls('arrow')
    arrow.setAttribute('aria-hidden', 'true')
    this.#indicators.append(arrow)
  }

  #renderOptions(s: Readonly<SelkitState<T>>): void {
    this.#dropdown.replaceChildren()
    const a11y = this.controller.a11y()
    const view = this.controller.getGroupedView()

    if (view.rows.length === 0) {
      const empty = document.createElement('div')
      empty.className = this.#cls('empty')
      empty.textContent = s.loading ? 'Loading…' : 'No results'
      this.#dropdown.append(empty)
      return
    }

    for (const row of view.rows) {
      if (row.type === 'group') {
        const group = document.createElement('div')
        group.className = this.#cls('group')
        if (row.disabled) group.classList.add(this.#cls('group', 'disabled'))
        group.textContent = row.label
        this.#dropdown.append(group)
        continue
      }

      const attrs = a11y.option(row.index)
      const option = document.createElement('div')
      option.className = this.#cls('option')
      option.id = attrs.id
      option.dataset.index = String(row.index)
      option.setAttribute('role', 'option')
      option.setAttribute('aria-selected', String(attrs['aria-selected']))
      if (attrs['aria-disabled']) option.setAttribute('aria-disabled', 'true')
      if (row.index === s.activeIndex) {
        option.classList.add(this.#cls('option', 'active'))
      }
      if (attrs['aria-selected']) {
        option.classList.add(this.#cls('option', 'selected'))
      }
      option.textContent = row.option.label
      this.#dropdown.append(option)
    }
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
  }

  #syncOpen(s: Readonly<SelkitState<T>>): void {
    if (s.isOpen) {
      this.#dropdown.hidden = false
      if (this.#positioner) this.#positioner.update()
      else this.#positioner = attachPositioner(this.#control, this.#dropdown)
    } else {
      this.#dropdown.hidden = true
      this.#positioner?.destroy()
      this.#positioner = null
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
