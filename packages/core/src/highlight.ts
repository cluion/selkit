/** 將 label 依 query 切成命中片段序列，match 段供 adapter 包 <mark> */
import { normalizeText } from './utils'
import type { HighlightPart } from './types'

/** 正規化比對單位：一個基底字元（含其附加變音符） */
interface NormUnit {
  original: string // label 對應的原文片段
  norm: string // 去變音符小寫後的字元
}

const DIACRITIC = /\p{Diacritic}/u

/** 將 label 拆成正規化單位序列；附加變音符併入前一基底字元 */
function splitUnits(label: string): NormUnit[] {
  const units: NormUnit[] = []
  for (const ch of label) {
    if (DIACRITIC.test(ch)) {
      const last = units[units.length - 1]
      if (last) last.original += ch
    } else {
      units.push({ original: ch, norm: normalizeText(ch) })
    }
  }
  return units
}

/** 合併相鄰同性質片段 */
function coalesce(parts: HighlightPart[]): HighlightPart[] {
  if (parts.length === 0) return parts
  const out: HighlightPart[] = [{ ...parts[0]! }]
  for (let i = 1; i < parts.length; i++) {
    const cur = parts[i]!
    const prev = out[out.length - 1]!
    if (prev.match === cur.match) prev.text += cur.text
    else out.push({ ...cur })
  }
  return out
}

/** 依 query 將 label 切成高亮片段；fuzzy 採子序列，否則子字串。空 query 或無命中時整段不 match */
export function highlightMatches(
  label: string,
  query: string,
  fuzzy: boolean,
): HighlightPart[] {
  if (query === '') return [{ text: label, match: false }]

  const units = splitUnits(label)
  if (units.length === 0) return [{ text: label, match: false }]

  const normLabel = units.map((u) => u.norm).join('')
  const normQuery = normalizeText(query)
  if (normQuery === '') return [{ text: label, match: false }]

  const hit = new Array<boolean>(units.length).fill(false)

  if (fuzzy) {
    const qChars = [...normQuery]
    let qi = 0
    for (let ui = 0; ui < units.length && qi < qChars.length; ui++) {
      if (units[ui]!.norm === qChars[qi]) {
        hit[ui] = true
        qi += 1
      }
    }
    if (qi < qChars.length) return [{ text: label, match: false }]
  } else {
    let from = 0
    while (true) {
      const found = normLabel.indexOf(normQuery, from)
      if (found === -1) break
      for (let k = found; k < found + normQuery.length; k++) hit[k] = true
      from = found + normQuery.length
    }
  }

  return coalesce(
    units.map((u, i) => ({ text: u.original, match: hit[i]! })),
  )
}
