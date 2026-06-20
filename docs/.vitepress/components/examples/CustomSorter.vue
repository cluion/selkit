<script setup lang="ts">
import { ref } from 'vue'
import { SelkitSelect } from '@selkit/vue'
import type { SelkitOption } from '@selkit/core'

const options = [
  { value: 'apple', label: 'Apple' },
  { value: 'apricot', label: 'Apricot' },
  { value: 'avocado', label: 'Avocado' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
]
const value = ref<string | null>(null)

// 自訂排序：以輸入開頭者優先排在前面（相關度排序）
const startsFirst = (a: SelkitOption, b: SelkitOption, q: string) => {
  const rank = (o: SelkitOption) =>
    o.label.toLowerCase().startsWith(q.toLowerCase()) ? 0 : 1
  return rank(a) - rank(b)
}
</script>

<template>
  <SelkitSelect
    v-model="value"
    :options="options"
    :sorter="startsFirst"
    placeholder='Type "a"…'
  />
</template>
