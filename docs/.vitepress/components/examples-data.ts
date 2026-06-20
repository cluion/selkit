import type { Component } from 'vue'
import BasicSelect from './examples/BasicSelect.vue'
import MultiSelect from './examples/MultiSelect.vue'
import Searchable from './examples/Searchable.vue'
import OptionsGroups from './examples/OptionsGroups.vue'
import Tagging from './examples/Tagging.vue'
import AsyncSelect from './examples/AsyncSelect.vue'
import VirtualScroll from './examples/VirtualScroll.vue'
import CustomTemplates from './examples/CustomTemplates.vue'

import basicVue from './examples/BasicSelect.vue?raw'
import multiVue from './examples/MultiSelect.vue?raw'
import searchableVue from './examples/Searchable.vue?raw'
import groupsVue from './examples/OptionsGroups.vue?raw'
import taggingVue from './examples/Tagging.vue?raw'
import asyncVue from './examples/AsyncSelect.vue?raw'
import virtualVue from './examples/VirtualScroll.vue?raw'
import templatesVue from './examples/CustomTemplates.vue?raw'

export interface Example {
  id: string
  title: string
  category: string
  description: string
  component: Component
  codeVue: string
  codeVanilla: string
  codeReact: string
}

export const examples: Example[] = [
  {
    id: 'basic',
    title: 'Basic select',
    category: 'Basics',
    description: '單選、placeholder、清除鈕。預設搜尋框可輸入即時過濾。',
    component: BasicSelect,
    codeVue: basicVue,
    codeVanilla: `import { createSelkitDom } from '@selkit/dom'

createSelkitDom('#selkit', {
  options: [
    { value: 'apple', label: 'Apple' },
    { value: 'banana', label: 'Banana' },
    { value: 'cherry', label: 'Cherry' },
  ],
  placeholder: 'Pick a fruit',
})`,
    codeReact: `import { useState } from 'react'
import { SelkitSelect } from '@selkit/react'

function Demo() {
  const [value, setValue] = useState(null)
  return (
    <SelkitSelect
      options={OPTIONS}
      value={value}
      onChange={setValue}
      placeholder="Pick a fruit"
    />
  )
}`,
  },
  {
    id: 'multiselect',
    title: 'Multiselect',
    category: 'Basics',
    description: '多選渲染為可移除的 tag；點已選項可取消。',
    component: MultiSelect,
    codeVue: multiVue,
    codeVanilla: `createSelkitDom('#selkit', {
  options,
  multiple: true,
  placeholder: 'Pick fruits',
})`,
    codeReact: `<SelkitSelect options={options} multiple value={value} onChange={setValue} placeholder="Pick fruits" />`,
  },
  {
    id: 'searchable',
    title: 'Searchable + fuzzy',
    category: 'Searching',
    description: 'fuzzy 子序列比對——「blbr」也能搜到「Blackberry」。大小寫與變音符號不敏感。',
    component: Searchable,
    codeVue: searchableVue,
    codeVanilla: `createSelkitDom('#selkit', {
  options,
  fuzzy: true, // 取代預設子字串比對
  placeholder: 'Type to search…',
})`,
    codeReact: `<SelkitSelect options={options} fuzzy placeholder="Type to search…" />`,
  },
  {
    id: 'groups',
    title: 'Options groups',
    category: 'Grouping',
    description: '選項帶 options 子陣列即自動分組（optgroup，僅一層）。',
    component: OptionsGroups,
    codeVue: groupsVue,
    codeVanilla: `createSelkitDom('#selkit', {
  options: [
    { label: 'Berries', options: [/* … */] },
    { label: 'Citrus', options: [/* … */] },
  ],
  placeholder: 'Pick one…',
})`,
    codeReact: `<SelkitSelect options={groupedOptions} placeholder="Pick one…" />`,
  },
  {
    id: 'tagging',
    title: 'Tagging / creatable',
    category: 'Tagging',
    description: 'taggable 允許建立不存在的選項；tokenSeparators 讓逗號／空白自動切出 tag。',
    component: Tagging,
    codeVue: taggingVue,
    codeVanilla: `createSelkitDom('#selkit', {
  options,
  multiple: true,
  taggable: true,
  createTag: (query) => ({ value: query, label: query }),
  tokenSeparators: [',', ' '],
  placeholder: 'Pick or type new…',
})`,
    codeReact: `<SelkitSelect
  options={options}
  multiple
  taggable
  createTag={(q) => ({ value: q, label: q })}
  tokenSeparators={[',', ' ']}
  placeholder="Pick or type new…"
/>`,
  },
  {
    id: 'async',
    title: 'Async with pagination',
    category: 'Async',
    description: 'loadOptions 搜尋時觸發、含 signal 取消舊請求；hasMore 開啟無限捲動載入。',
    component: AsyncSelect,
    codeVue: asyncVue,
    codeVanilla: `createSelkitDom('#selkit', {
  loadOptions: async (query, page, { signal }) => {
    const res = await fetch(\`/api/search?q=\${query}&page=\${page}\`, { signal })
    const { items, hasMore } = await res.json()
    return { items, hasMore }
  },
  debounce: 250,
  placeholder: 'Search…',
})`,
    codeReact: `<SelkitSelect
  loadOptions={async (q, page, { signal }) => {
    const res = await fetch(\`/api/search?q=\${q}&page=\${page}\`, { signal })
    return res.json()
  }}
  debounce={250}
  placeholder="Search…"
/>`,
  },
  {
    id: 'virtual',
    title: 'Virtualized',
    category: 'Performance',
    description: '數千選項只渲染可視切片；item-height 須與樣式列高一致。',
    component: VirtualScroll,
    codeVue: virtualVue,
    codeVanilla: `createSelkitDom('#selkit', {
  options, // 2000 筆
  virtualScroll: true,
  itemHeight: 36,
  placeholder: '2000 options',
})`,
    codeReact: `<SelkitSelect options={options} virtualScroll itemHeight={36} placeholder="2000 options" />`,
  },
  {
    id: 'templates',
    title: 'Custom templates',
    category: 'Customization',
    description: '自訂下拉選項與已選內容——外殼、class、a11y 與事件由元件保留。',
    component: CustomTemplates,
    codeVue: templatesVue,
    codeVanilla: `createSelkitDom('#selkit', {
  options,
  multiple: true,
  templateOption: (option) => \`\${option.emoji} \${option.label}\`,
  templateSelection: (option) => \`\${option.emoji} \${option.label}\`,
})`,
    codeReact: `<SelkitSelect
  options={options}
  multiple
  renderOption={(o) => \`\${o.emoji} \${o.label}\`}
  renderSelection={(o) => \`\${o.emoji} \${o.label}\`}
/>`,
  },
]
