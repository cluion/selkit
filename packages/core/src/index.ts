/**
 * @selkit/core — 公開進入點
 */
export type * from './types'
export { createSelkit } from './createSelkit'
export { highlightMatches } from './highlight'
export {
  computeVirtualRange,
  computeScrollIntoView,
  computeVirtualWindow,
  computeScrollIntoViewVariable,
} from './virtual'
export type {
  VirtualRange,
  VirtualRangeInput,
  ScrollIntoViewInput,
  VirtualWindowInput,
  ScrollIntoViewVariableInput,
} from './virtual'
