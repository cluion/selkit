/**
 * @selkit/dom — 公開進入點
 */
export { createSelkitDom } from './dom'
export type { SelkitDomConfig, SelkitDomInstance } from './dom'
export {
  attachPositioner,
  computePosition,
  type Placement,
  type Positioner,
  type PositionResult,
  type Rect,
} from './positioner'
