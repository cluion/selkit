/**
 * @selkit/dom — 公開進入點
 */
export {
  createSelkitDom,
  createSelkitDom as sk,
  SelkitDom,
  SelkitDom as Selkit,
} from './dom'
export type { SelkitDomConfig, SelkitDomInstance } from './dom'
export {
  attachPositioner,
  computePosition,
  type Placement,
  type Positioner,
  type PositionerFactory,
  type PositionerOptions,
  type PositionResult,
  type Rect,
} from './positioner'
