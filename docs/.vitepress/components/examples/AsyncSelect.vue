<script setup lang="ts">
import { ref } from 'vue'
import { SelkitSelect } from '@selkit/vue'

const value = ref<string | null>(null)

// 模擬遠端資料：依 query 過濾本地資料庫、分頁回傳；hasMore 觸發無限捲動。
// signal 用來取消被取代的舊請求（實際 fetch 傳給 fetch() 即可真正中斷）。
const database = Array.from({ length: 200 }, (_, i) => ({
  value: `item-${i}`,
  label: `Remote item #${i + 1}`,
}))

const loadOptions = async (
  query: string,
  page: number,
  { signal }: { signal: AbortSignal },
) => {
  await new Promise((r) => setTimeout(r, 250))
  if (signal.aborted) return []
  const filtered = database.filter((o) => o.label.includes(query))
  const pageSize = 20
  const items = filtered.slice((page - 1) * pageSize, page * pageSize)
  return { items, hasMore: filtered.length > page * pageSize }
}
</script>

<template>
  <SelkitSelect
    v-model="value"
    :load-options="loadOptions"
    :debounce="250"
    placeholder="Search, then scroll to load more…"
  />
</template>
