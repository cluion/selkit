import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// autoUpdate 依賴 ResizeObserver / IntersectionObserver（jsdom 無）且初次呼叫時序不穩
// glue 測試只關心「update 被呼叫、destroy 委派 cleanup」 故攔截 autoUpdate 保留其餘真實實作
const cleanupSpy = vi.hoisted(() => vi.fn())
vi.mock('@floating-ui/dom', async (importActual) => {
  const actual = await importActual<typeof import('@floating-ui/dom')>()
  return {
    ...actual,
    autoUpdate: vi.fn((_ref: unknown, _floating: unknown, update: () => void) => {
      update()
      return cleanupSpy
    }),
  }
})

import {
  applyPosition,
  createFloatingPositioner,
  position,
  type FloatingResult,
} from './floating'

const REF_RECT = {
  top: 100,
  bottom: 130,
  left: 20,
  right: 220,
  width: 200,
  height: 30,
  x: 20,
  y: 100,
} as DOMRect

const RESULT: FloatingResult = {
  x: 20,
  y: 134,
  placement: 'bottom-start',
  availableWidth: 300,
  availableHeight: 250,
}

// ── applyPosition：純函式 套用結果到元素 ──────────────────────────
describe('applyPosition', () => {
  let floating: HTMLElement

  beforeEach(() => {
    floating = document.createElement('div')
  })

  it('套用 fixed 座標與可用高度', () => {
    applyPosition(floating, 200, RESULT)
    expect(floating.style.position).toBe('fixed')
    expect(floating.style.left).toBe('20px')
    expect(floating.style.top).toBe('134px')
    expect(floating.style.maxHeight).toBe('250px')
  })

  it('預設等寬模式：寬度貼齊控制項', () => {
    applyPosition(floating, 200, RESULT)
    expect(floating.style.width).toBe('200px')
    expect(floating.style.minWidth).toBe('')
  })

  it('autoWidth 模式：至少同寬、內容更寬時增長', () => {
    applyPosition(floating, 200, RESULT, { autoWidth: true })
    expect(floating.style.minWidth).toBe('200px')
    expect(floating.style.width).toBe('max-content')
  })

  it('bottom 方位 data-placement 設為 bottom', () => {
    applyPosition(floating, 200, RESULT)
    expect(floating.dataset.placement).toBe('bottom')
  })

  it('翻轉到上方時 data-placement 設為 top', () => {
    applyPosition(floating, 200, { ...RESULT, placement: 'top-start' })
    expect(floating.dataset.placement).toBe('top')
  })
})

// ── position：framework-agnostic 計算（真實 floating-ui smoke）────
describe('position', () => {
  let reference: HTMLElement
  let floating: HTMLElement

  beforeEach(() => {
    reference = document.createElement('div')
    floating = document.createElement('div')
    document.body.append(reference, floating)
    reference.getBoundingClientRect = () => REF_RECT
  })

  afterEach(() => {
    document.body.replaceChildren()
  })

  it('回傳數值座標、最終方位與可用空間', async () => {
    const r = await position(reference, floating)
    expect(typeof r.x).toBe('number')
    expect(typeof r.y).toBe('number')
    expect(typeof r.placement).toBe('string')
    expect(typeof r.availableHeight).toBe('number')
  })
})

// ── createFloatingPositioner：相容 PositionerFactory 的 glue ─────
describe('createFloatingPositioner', () => {
  let reference: HTMLElement
  let floating: HTMLElement

  beforeEach(() => {
    cleanupSpy.mockClear()
    reference = document.createElement('div')
    floating = document.createElement('div')
    document.body.append(reference, floating)
    reference.getBoundingClientRect = () => REF_RECT
  })

  afterEach(() => {
    document.body.replaceChildren()
  })

  it('回傳含 update / destroy 的 Positioner', () => {
    const p = createFloatingPositioner(reference, floating)
    expect(typeof p.update).toBe('function')
    expect(typeof p.destroy).toBe('function')
  })

  it('建立後自動套用定位（position:fixed 與 data-placement、貼齊控制項寬）', async () => {
    createFloatingPositioner(reference, floating)
    // autoUpdate（已攔截）同步呼叫一次 update；內部 position() 為非同步 需等微任務
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(floating.style.position).toBe('fixed')
    expect(['top', 'bottom']).toContain(floating.dataset.placement)
    expect(floating.style.width).toBe('200px')
  })

  it('autoWidth 透傳到套用結果', async () => {
    createFloatingPositioner(reference, floating, { autoWidth: true })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(floating.style.minWidth).toBe('200px')
    expect(floating.style.width).toBe('max-content')
  })

  it('destroy 委派給 autoUpdate 的 cleanup', () => {
    const p = createFloatingPositioner(reference, floating)
    expect(cleanupSpy).not.toHaveBeenCalled()
    p.destroy()
    expect(cleanupSpy).toHaveBeenCalledTimes(1)
  })
})
