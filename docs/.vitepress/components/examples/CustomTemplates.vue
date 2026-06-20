<script setup lang="ts">
import { ref } from 'vue'
import { SelkitSelect } from '@selkit/vue'

const options = [
  { value: 'apple', label: 'Apple', emoji: '🍎' },
  { value: 'banana', label: 'Banana', emoji: '🍌' },
  { value: 'cherry', label: 'Cherry', emoji: '🍒' },
  { value: 'date', label: 'Date', emoji: '🌴' },
]
const value = ref<string[]>([])

// option / selection slot 自訂下拉選項與已選標籤的內容（外殼與 a11y 由元件保留）
</script>

<template>
  <SelkitSelect
    v-model="value"
    :options="options"
    multiple
    placeholder="Pick fruits"
  >
    <template #option="{ option, active, selected }">
      <span :class="['ex-option', { active, selected }]">
        <span class="ex-emoji">{{ option.emoji }}</span>
        {{ option.label }}
      </span>
    </template>
    <template #selection="{ option }">
      <span>{{ option.emoji }} {{ option.label }}</span>
    </template>
  </SelkitSelect>
</template>

<style scoped>
.ex-option {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ex-option.active {
  font-weight: 600;
}
.ex-emoji {
  font-size: 1.1em;
}
</style>
