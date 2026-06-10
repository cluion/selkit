/**
 * @selkit/react — useSelkit hook
 *
 * 用 useSyncExternalStore 把 core controller 的不可變 state 接進 React
 * core 每次 patch 產生新 state 物件 useSyncExternalStore 以 Object.is 比較即可正確觸發重繪
 */
import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'
import {
  createSelkit,
  type SelkitConfig,
  type SelkitController,
  type SelkitState,
} from '@selkit/core'

export interface UseSelkitReturn<T = unknown> {
  controller: SelkitController<T>
  state: Readonly<SelkitState<T>>
}

export function useSelkit<T = unknown>(
  config: SelkitConfig<T> = {},
): UseSelkitReturn<T> {
  const ref = useRef<SelkitController<T> | null>(null)
  if (ref.current === null) ref.current = createSelkit<T>(config)
  const controller = ref.current

  useEffect(() => {
    return () => controller.destroy()
  }, [controller])

  const subscribe = useCallback(
    (onStoreChange: () => void) => controller.subscribe(() => onStoreChange()),
    [controller],
  )
  const getSnapshot = useCallback(() => controller.getState(), [controller])

  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  return { controller, state }
}
