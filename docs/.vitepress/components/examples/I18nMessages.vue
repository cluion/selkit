<script setup lang="ts">
import { ref } from 'vue'
import { SelkitSelect } from '@selkit/vue'

const options = Array.from({ length: 30 }, (_, i) => ({
  value: `o-${i}`,
  label: `Option #${i + 1}`,
}))
const value = ref<string | null>(null)

// 自訂繁中空狀態訊息（loading / noResults / minInputLength）
</script>

<template>
  <SelkitSelect
    v-model="value"
    :options="options"
    :min-input-length="2"
    :messages="{
      loading: '載入中…',
      noResults: '查無資料',
      minInputLength: (n: number) => `再輸入 ${n} 個字`,
    }"
    placeholder="輸入以搜尋…"
  />
</template>
