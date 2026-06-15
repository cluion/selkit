/**
 * @selkit/core — 公開進入點
 */
export type * from './types'
export { createSelkit } from './createSelkit'
export { computeVirtualRange, computeScrollIntoView } from './virtual'
export type {
  VirtualRange,
  VirtualRangeInput,
  ScrollIntoViewInput,
} from './virtual'
