// jsdom 未提供 PointerEvent 建構子 用 MouseEvent 代理讓 fireEvent.pointerDown 可運作
if (typeof globalThis.PointerEvent === 'undefined') {
  globalThis.PointerEvent = globalThis.MouseEvent as unknown as typeof PointerEvent
}
