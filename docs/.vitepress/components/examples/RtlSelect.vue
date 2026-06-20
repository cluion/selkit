<script setup lang="ts">
import { ref } from 'vue'
import { SelkitSelect } from '@selkit/vue'

const options = [
  { value: 'apple', label: 'تفاح' },
  { value: 'banana', label: 'موز' },
  { value: 'cherry', label: 'كرز' },
  { value: 'date', label: 'تمر' },
]
const value = ref<string[]>([])
</script>

<template>
  <!-- 容器 dir="rtl" selkit 即自動適配（箭頭、捲軸、對齊） -->
  <div dir="rtl">
    <SelkitSelect v-model="value" :options="options" multiple placeholder="اختر…" />
  </div>
</template>
