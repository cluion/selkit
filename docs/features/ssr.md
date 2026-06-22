# Server-Side Rendering (SSR)

Selkit is SSR-safe across all packages — it renders without errors in Next.js,
Nuxt, VitePress, and other SSR frameworks, and hydrates cleanly.

| Package | SSR | Notes |
| --- | :---: | --- |
| `@selkit/core` | ✅ | Pure state machine — zero DOM access. |
| `@selkit/dom` | ✅ | Imperative client API (`createSelkitDom`). Only makes sense to call in the browser; importing the package never touches the DOM. |
| `@selkit/vue` | ✅ | `setup()` registers listeners, but all DOM access is inside `onMounted` / non-immediate `watch`. Verified with `renderToString`. |
| `@selkit/react` | ✅ | Portal target resolves in `useEffect`, never during render. Ships a `"use client"` directive. Verified with `renderToStaticMarkup`. |
| `@selkit/floating` | ✅ | Thin wrapper over `@floating-ui/dom`, which touches the DOM only inside its positioning callbacks. |
| `@selkit/themes` | ✅ | Plain CSS. |

## How it stays safe

- **Core is DOM-free.** `@selkit/core` is a pure TypeScript state machine. It
  computes selection, search, virtualization, and a11y attributes with no
  reference to `document` or `window`, so it runs identically on the server.
- **Adapters defer DOM to the client lifecycle.** The Vue and React adapters
  touch the DOM only inside `onMounted` / `useEffect` and event handlers — code
  paths that never execute during SSR. React resolves a `dropdownParent` portal
  target in an effect rather than during render, so the server pass never reads
  `document`.

## React (Next.js)

`@selkit/react` ships with a `"use client"` directive built in, so it works in
the Next.js App Router with **no extra configuration**:

```tsx
// app/page.tsx — a Server Component can import and render it directly
import { SelkitSelect } from '@selkit/react'

export default function Page() {
  return <SelkitSelect options={options} />
}
```

In the Pages Router, or any non-Next setup, no directive is needed — render it
as usual.

## Vue (Nuxt)

`@selkit/vue` is SSR-safe out of the box:

```vue
<script setup lang="ts">
import { SelkitSelect } from '@selkit/vue'
</script>

<template>
  <SelkitSelect :options="options" />
</template>
```

## Vanilla JS (`@selkit/dom`)

`@selkit/dom` is an imperative API — you call `createSelkitDom(el, config)` to
mount onto a real element, which only exists in the browser. Importing the
package is side-effect free; just call it from client code (a `<script>` at the
end of the body, or a `DOMContentLoaded` / framework mount hook), never during
server rendering.
