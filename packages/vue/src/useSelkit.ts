/**
 * @selkit/vue — useSelkit composable
 *
 * 建立 core controller 並把它的不可變 state 橋接成 Vue 的 shallowRef
 * core 每次 patch 都產生新 state 物件 因此 shallowRef 賦值即可觸發響應式重繪
 */
import { onScopeDispose, shallowRef, type ShallowRef } from 'vue'
import {
  createSelkit,
  type SelkitConfig,
  type SelkitController,
  type SelkitState,
} from '@selkit/core'

export interface UseSelkitReturn<T = unknown> {
  controller: SelkitController<T>
  state: ShallowRef<Readonly<SelkitState<T>>>
}

export function useSelkit<T = unknown>(
  config: SelkitConfig<T> = {},
): UseSelkitReturn<T> {
  const controller = createSelkit<T>(config)
  const state = shallowRef<Readonly<SelkitState<T>>>(controller.getState())

  const unsubscribe = controller.subscribe((next) => {
    state.value = next
  })

  onScopeDispose(() => {
    unsubscribe()
    controller.destroy()
  })

  return { controller, state }
}
