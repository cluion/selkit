import { describe, expect, it } from 'vitest'
import { computePosition } from './positioner'

describe('computePosition', () => {
  it('下方空間足夠時放下方，對齊左緣與同寬', () => {
    const r = computePosition({ top: 100, bottom: 130, left: 20, width: 200 }, 150, 800)
    expect(r.placement).toBe('bottom')
    expect(r.top).toBe(134) // bottom + gap(4)
    expect(r.left).toBe(20)
    expect(r.width).toBe(200)
  })

  it('下方不足且上方較大時翻到上方', () => {
    const r = computePosition({ top: 600, bottom: 630, left: 0, width: 100 }, 200, 700)
    expect(r.placement).toBe('top')
    expect(r.top).toBe(600 - 4 - 200) // top - gap - height
  })

  it('下方不足但上方也不足時仍維持下方', () => {
    const r = computePosition({ top: 50, bottom: 630, left: 0, width: 100 }, 200, 700)
    expect(r.placement).toBe('bottom')
  })
})
