import { describe, expect, it } from 'vitest'
import { highlightMatches } from './highlight'

describe('highlightMatches', () => {
  it('空 query 整段不 match', () => {
    expect(highlightMatches('Hello World', '', false)).toEqual([
      { text: 'Hello World', match: false },
    ])
  })

  it('子字串 — 單命中（大小寫不敏感）', () => {
    expect(highlightMatches('Hello World', 'world', false)).toEqual([
      { text: 'Hello ', match: false },
      { text: 'World', match: true },
    ])
  })

  it('子字串 — 多個不重疊命中', () => {
    expect(highlightMatches('Banana', 'ANA', false)).toEqual([
      { text: 'B', match: false },
      { text: 'ana', match: true },
      { text: 'na', match: false },
    ])
    expect(highlightMatches('ababab', 'ab', false)).toEqual([
      { text: 'ababab', match: true },
    ])
  })

  it('子字串 — 無命中整段不 match', () => {
    expect(highlightMatches('hello', 'xyz', false)).toEqual([
      { text: 'hello', match: false },
    ])
  })

  it('子字串 — 去變音符（預組 café ↔ cafe）', () => {
    expect(highlightMatches('café', 'cafe', false)).toEqual([
      { text: 'café', match: true },
    ])
    // 反向：query 帶變音符也能命中無變音符的 label
    expect(highlightMatches('cafe', 'café', false)).toEqual([
      { text: 'cafe', match: true },
    ])
  })

  it('子字串 — 分解形式變音符（e + 結合符）不標錯位置', () => {
    // "café" 以分解形式表達：c a f é
    const label = 'café'
    expect(highlightMatches(label, 'cafe', false)).toEqual([
      { text: label, match: true },
    ])
    // 只命中結尾的基底字元（含其變音符）
    expect(highlightMatches(label, 'e', false)).toEqual([
      { text: 'caf', match: false },
      { text: 'é', match: true },
    ])
  })

  it('fuzzy 子序列 — 標命中的字元位置', () => {
    expect(highlightMatches('Apple Banana', 'ab', true)).toEqual([
      { text: 'A', match: true },
      { text: 'pple ', match: false },
      { text: 'B', match: true },
      { text: 'anana', match: false },
    ])
  })

  it('fuzzy — 無法構成子序列時整段不 match', () => {
    expect(highlightMatches('abc', 'd', true)).toEqual([
      { text: 'abc', match: false },
    ])
  })

  it('fuzzy — 去變音符子序列', () => {
    expect(highlightMatches('café', 'café', true)).toEqual([
      { text: 'café', match: true },
    ])
  })

  it('空 label', () => {
    expect(highlightMatches('', 'x', false)).toEqual([
      { text: '', match: false },
    ])
  })

  it('相鄰同性質片段合併，不產生零碎片段', () => {
    const parts = highlightMatches('mississippi', 'ss', false)
    // normLabel "mississippi"，命中 idx2-3 與 5-6
    expect(parts).toEqual([
      { text: 'mi', match: false },
      { text: 'ss', match: true },
      { text: 'i', match: false },
      { text: 'ss', match: true },
      { text: 'ippi', match: false },
    ])
  })
})
