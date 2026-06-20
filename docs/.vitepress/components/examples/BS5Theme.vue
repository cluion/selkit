<script setup lang="ts">
import { ref } from 'vue'
import { SelkitSelect } from '@selkit/vue'

const options = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
  { value: 'date', label: 'Date' },
]
const value = ref<string | null>(null)
</script>

<template>
  <!-- 容器加 selkit-theme-bs5 class 即套用 bs5.css；未載 Bootstrap 時走內建 fallback -->
  <div class="selkit-theme-bs5">
    <SelkitSelect v-model="value" :options="options" placeholder="Bootstrap 5 style…" />
  </div>
</template>
