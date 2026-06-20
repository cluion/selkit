<script setup lang="ts">
import { ref } from 'vue'
import { SelkitSelect } from '@selkit/vue'

const options = [
  {
    label: 'Fruit',
    options: [
      { value: 'apple', label: 'Apple' },
      { value: 'banana', label: 'Banana' },
    ],
  },
  {
    label: 'Veg',
    options: [
      { value: 'carrot', label: 'Carrot' },
      { value: 'potato', label: 'Potato' },
    ],
  },
]
const value = ref<string[]>([])
</script>

<template>
  <SelkitSelect
    v-model="value"
    :options="options"
    multiple
    placeholder="Swappable parts…"
  >
    <!-- 替換結構零件的「內容」：外殼、class、click 行為與 a11y 由元件保留 -->
    <template #arrow="{ open }">{{ open ? '▾' : '▸' }}</template>
    <template #clear>🧹</template>
    <template #tag-remove>✖</template>
    <template #group="{ label }">— {{ label }} —</template>
    <template #empty="{ reason, message }">
      {{ reason === 'no-results' ? '🤷 找不到符合的項目' : message }}
    </template>
  </SelkitSelect>
</template>
