import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  external: ['react', 'react-dom'],
  // 標記整個 entry 為 client component：Next.js App Router 需要此 directive，
  // 否則會嘗試把用到了 useState/useEffect/createPortal 的元件當 server component。
  // 用 banner 而非原始碼頂層字串——esbuild 會把頂層 string literal 當無副作用敘述移除。
  banner: { js: "'use client'" },
})
