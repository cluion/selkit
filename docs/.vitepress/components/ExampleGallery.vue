<script setup lang="ts">
import { computed, ref } from 'vue'
import { examples } from './examples-data'

const currentId = ref(examples[0]!.id)
const codeTab = ref<'vue' | 'vanilla' | 'react'>('vue')
const copied = ref(false)

const current = computed(
  () => examples.find((e) => e.id === currentId.value)!,
)

// 按 category 分組（保序、去重）
const groups = computed(() => {
  const seen = new Set<string>()
  return examples.reduce<
    { category: string; items: typeof examples }[]
  >((acc, ex) => {
    if (!seen.has(ex.category)) {
      seen.add(ex.category)
      acc.push({ category: ex.category, items: [] })
    }
    acc[acc.length - 1]!.items.push(ex)
    return acc
  }, [])
})

const currentCode = computed(() => {
  const c = current.value
  return codeTab.value === 'vue'
    ? c.codeVue
    : codeTab.value === 'vanilla'
      ? c.codeVanilla
      : c.codeReact
})

function select(id: string): void {
  currentId.value = id
}

async function copy(): Promise<void> {
  await navigator.clipboard.writeText(currentCode.value)
  copied.value = true
  setTimeout(() => (copied.value = false), 1200)
}
</script>

<template>
  <div class="gallery">
    <aside class="gallery__nav">
      <div v-for="g in groups" :key="g.category" class="gallery__group">
        <div class="gallery__group-title">{{ g.category }}</div>
        <button
          v-for="ex in g.items"
          :key="ex.id"
          type="button"
          class="gallery__item"
          :class="{ 'gallery__item--active': ex.id === currentId }"
          @click="select(ex.id)"
        >
          {{ ex.title }}
        </button>
      </div>
    </aside>

    <section class="gallery__main">
      <header class="gallery__head">
        <h3>{{ current.title }}</h3>
        <p>{{ current.description }}</p>
      </header>

      <div class="gallery__demo">
        <component :is="current.component" />
      </div>

      <div class="gallery__code">
        <div class="gallery__code-bar">
          <div class="gallery__tabs">
            <button
              v-for="tab in ['vue', 'vanilla', 'react'] as const"
              :key="tab"
              type="button"
              class="gallery__tab"
              :class="{ 'gallery__tab--active': codeTab === tab }"
              @click="codeTab = tab"
            >
              {{ tab }}
            </button>
          </div>
          <button
            type="button"
            class="gallery__copy"
            :class="{ 'gallery__copy--done': copied }"
            @click="copy"
          >
            {{ copied ? 'Copied!' : 'Copy' }}
          </button>
        </div>
        <pre><code>{{ currentCode }}</code></pre>
      </div>
    </section>
  </div>
</template>

<style scoped>
.gallery {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 24px;
  align-items: start;
  margin: 24px 0;
}
@media (max-width: 720px) {
  .gallery {
    grid-template-columns: 1fr;
  }
  .gallery__nav {
    position: static;
    border-left: 0;
    border-bottom: 2px solid var(--vp-c-divider);
    padding-left: 0;
    padding-bottom: 12px;
  }
}
.gallery__nav {
  position: sticky;
  top: 80px;
  border-left: 2px solid var(--vp-c-divider);
  padding-left: 12px;
}
.gallery__group {
  margin-bottom: 14px;
}
.gallery__group-title {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--vp-c-text-2);
  margin: 0 0 6px;
}
.gallery__item {
  display: block;
  width: 100%;
  text-align: left;
  background: none;
  border: 0;
  padding: 5px 8px;
  border-radius: 6px;
  cursor: pointer;
  color: var(--vp-c-text-1);
  font-size: 0.875rem;
}
.gallery__item:hover {
  background: var(--vp-c-bg-soft);
}
.gallery__item--active {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  font-weight: 600;
}
.gallery__main {
  min-width: 0;
}
.gallery__head h3 {
  margin: 0 0 4px;
  font-size: 1.05rem;
}
.gallery__head p {
  margin: 0 0 16px;
  color: var(--vp-c-text-2);
  font-size: 0.9rem;
}
.gallery__demo {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 24px;
  background: var(--vp-c-bg-soft);
  display: flex;
  align-items: flex-start;
}
.gallery__demo :deep(.selkit) {
  max-width: 320px;
  width: 100%;
}
.gallery__code {
  margin-top: 16px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
}
.gallery__code-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-divider);
  padding: 6px 6px 6px 12px;
}
.gallery__tabs {
  display: flex;
  gap: 4px;
}
.gallery__tab {
  background: none;
  border: 0;
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
  text-transform: capitalize;
}
.gallery__tab--active {
  background: var(--vp-c-bg);
  color: var(--vp-c-brand-1);
  font-weight: 600;
  box-shadow: 0 0 0 1px var(--vp-c-divider);
}
.gallery__copy {
  background: none;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 0.78rem;
  cursor: pointer;
  color: var(--vp-c-text-1);
}
.gallery__copy:hover {
  background: var(--vp-c-bg);
}
.gallery__copy--done {
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
}
.gallery__code pre {
  margin: 0;
  padding: 16px;
  overflow-x: auto;
  font-size: 0.82rem;
  line-height: 1.5;
}
.gallery__code code {
  font-family: var(--vp-font-family-mono);
}
</style>
