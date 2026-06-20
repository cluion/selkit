import type { Component } from 'vue'

import BasicSelect from './examples/BasicSelect.vue'
import MultiSelect from './examples/MultiSelect.vue'
import CheckboxOptions from './examples/CheckboxOptions.vue'
import HideSelectedDrag from './examples/HideSelectedDrag.vue'
import Searchable from './examples/Searchable.vue'
import MinInputLength from './examples/MinInputLength.vue'
import HideSearchBox from './examples/HideSearchBox.vue'
import CustomSorter from './examples/CustomSorter.vue'
import OptionsGroups from './examples/OptionsGroups.vue'
import Tagging from './examples/Tagging.vue'
import RestoreBackspace from './examples/RestoreBackspace.vue'
import AsyncSelect from './examples/AsyncSelect.vue'
import VirtualScroll from './examples/VirtualScroll.vue'
import VirtualGrouped from './examples/VirtualGrouped.vue'
import AutogrowInput from './examples/AutogrowInput.vue'
import AutoWidth from './examples/AutoWidth.vue'
import CustomTemplates from './examples/CustomTemplates.vue'
import SwappableParts from './examples/SwappableParts.vue'
import I18nMessages from './examples/I18nMessages.vue'
import BS5Theme from './examples/BS5Theme.vue'
import RtlSelect from './examples/RtlSelect.vue'

import basicVue from './examples/BasicSelect.vue?raw'
import multiVue from './examples/MultiSelect.vue?raw'
import checkboxVue from './examples/CheckboxOptions.vue?raw'
import hideDragVue from './examples/HideSelectedDrag.vue?raw'
import searchableVue from './examples/Searchable.vue?raw'
import minInputVue from './examples/MinInputLength.vue?raw'
import hideSearchVue from './examples/HideSearchBox.vue?raw'
import sorterVue from './examples/CustomSorter.vue?raw'
import groupsVue from './examples/OptionsGroups.vue?raw'
import taggingVue from './examples/Tagging.vue?raw'
import restoreVue from './examples/RestoreBackspace.vue?raw'
import asyncVue from './examples/AsyncSelect.vue?raw'
import virtualVue from './examples/VirtualScroll.vue?raw'
import virtualGroupedVue from './examples/VirtualGrouped.vue?raw'
import autogrowVue from './examples/AutogrowInput.vue?raw'
import autoWidthVue from './examples/AutoWidth.vue?raw'
import templatesVue from './examples/CustomTemplates.vue?raw'
import swappableVue from './examples/SwappableParts.vue?raw'
import i18nVue from './examples/I18nMessages.vue?raw'
import bs5Vue from './examples/BS5Theme.vue?raw'
import rtlVue from './examples/RtlSelect.vue?raw'

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
    codeVanilla: `createSelkitDom('#selkit', {
  options,
  placeholder: 'Pick a fruit',
})`,
    codeReact: `<SelkitSelect options={options} value={value} onChange={setValue} placeholder="Pick a fruit" />`,
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
    id: 'checkboxes',
    title: 'Checkbox options',
    category: 'Basics',
    description: '多選時選項顯示打勾（checkbox 樣式），點擊 toggle、不隱藏已選。',
    component: CheckboxOptions,
    codeVue: checkboxVue,
    codeVanilla: `createSelkitDom('#selkit', {
  options,
  multiple: true,
  checkboxes: true,
  placeholder: 'Tick fruits…',
})`,
    codeReact: `<SelkitSelect options={options} multiple checkboxes placeholder="Tick fruits…" />`,
  },
  {
    id: 'hide-selected',
    title: 'Hide selected + drag reorder',
    category: 'Basics',
    description: 'hideSelected 把已選從下拉移除；tags 可拖曳排序（moveSelected）。',
    component: HideSelectedDrag,
    codeVue: hideDragVue,
    codeVanilla: `createSelkitDom('#selkit', {
  options,
  multiple: true,
  hideSelected: true,
  placeholder: 'Pick & drag tags…',
})`,
    codeReact: `<SelkitSelect options={options} multiple hideSelected placeholder="Pick & drag tags…" />`,
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
  fuzzy: true,
  placeholder: 'Type to search…',
})`,
    codeReact: `<SelkitSelect options={options} fuzzy placeholder="Type to search…" />`,
  },
  {
    id: 'min-input',
    title: 'Min input length',
    category: 'Searching',
    description: 'minInputLength：未達字數不過濾（適合遠端搜尋，避免太短查詢打 API）。',
    component: MinInputLength,
    codeVue: minInputVue,
    codeVanilla: `createSelkitDom('#selkit', {
  options,
  minInputLength: 2,
  placeholder: 'Type 2+ chars…',
})`,
    codeReact: `<SelkitSelect options={options} minInputLength={2} placeholder="Type 2+ chars…" />`,
  },
  {
    id: 'hide-search',
    title: 'Hide search box',
    category: 'Searching',
    description: 'minResultsForSearch：選項少於此數時隱藏搜尋框（仍可鍵盤導航）。',
    component: HideSearchBox,
    codeVue: hideSearchVue,
    codeVanilla: `createSelkitDom('#selkit', {
  options,
  minResultsForSearch: 10,
  placeholder: 'No search box…',
})`,
    codeReact: `<SelkitSelect options={options} minResultsForSearch={10} placeholder="No search box…" />`,
  },
  {
    id: 'sorter',
    title: 'Custom sorter',
    category: 'Searching',
    description: '自訂結果排序——這裡讓「以輸入開頭」的選項優先（相關度排序）。',
    component: CustomSorter,
    codeVue: sorterVue,
    codeVanilla: `createSelkitDom('#selkit', {
  options,
  sorter: (a, b, q) =>
    (b.label.toLowerCase().startsWith(q.toLowerCase()) ? 1 : 0) -
    (a.label.toLowerCase().startsWith(q.toLowerCase()) ? 1 : 0),
})`,
    codeReact: `<SelkitSelect options={options} sorter={(a, b, q) => /* … */} />`,
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
})`,
    codeReact: `<SelkitSelect options={groupedOptions} />`,
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
  createTag: (q) => ({ value: q, label: q }),
  tokenSeparators: [',', ' '],
})`,
    codeReact: `<SelkitSelect options={options} multiple taggable tokenSeparators={[',', ' ']} />`,
  },
  {
    id: 'restore',
    title: 'Restore on backspace',
    category: 'Tagging',
    description: '多選輸入框為空時按 Backspace 刪最後一個 tag，並把其文字回填輸入框供編輯。',
    component: RestoreBackspace,
    codeVue: restoreVue,
    codeVanilla: `createSelkitDom('#selkit', {
  options,
  multiple: true,
  taggable: true,
  createTag,
  restoreOnBackspace: true,
})`,
    codeReact: `<SelkitSelect options={options} multiple taggable restoreOnBackspace />`,
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
    return res.json() // { items, hasMore }
  },
  debounce: 250,
})`,
    codeReact: `<SelkitSelect loadOptions={async (q, p, { signal }) => fetch(...).then(r => r.json())} debounce={250} />`,
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
})`,
    codeReact: `<SelkitSelect options={options} virtualScroll itemHeight={36} />`,
  },
  {
    id: 'virtual-grouped',
    title: 'Virtualized + groups',
    category: 'Performance',
    description: '虛擬捲動也支援分組——header 與選項列高不同，以 groupHeight 標明。',
    component: VirtualGrouped,
    codeVue: virtualGroupedVue,
    codeVanilla: `createSelkitDom('#selkit', {
  options: groupedMany, // 10 群 × 100
  virtualScroll: true,
  itemHeight: 36,
  groupHeight: 28,
})`,
    codeReact: `<SelkitSelect options={groupedMany} virtualScroll itemHeight={36} groupHeight={28} />`,
  },
  {
    id: 'autogrow',
    title: 'Autogrow input',
    category: 'Layout',
    description: 'autogrow：輸入框寬度隨輸入字數增長（取代預設 flex 撐滿）。',
    component: AutogrowInput,
    codeVue: autogrowVue,
    codeVanilla: `createSelkitDom('#selkit', {
  options,
  multiple: true,
  autogrow: true,
})`,
    codeReact: `<SelkitSelect options={options} multiple autogrow />`,
  },
  {
    id: 'auto-width',
    title: 'Auto dropdown width',
    category: 'Layout',
    description: 'dropdownAutoWidth：下拉貼齊最寬內容（至少與控制項同寬），長標籤不截斷。',
    component: AutoWidth,
    codeVue: autoWidthVue,
    codeVanilla: `createSelkitDom('#selkit', {
  options: longOpts,
  dropdownAutoWidth: true,
})`,
    codeReact: `<SelkitSelect options={longOpts} dropdownAutoWidth />`,
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
  templateOption: (o) => \`\${o.emoji} \${o.label}\`,
  templateSelection: (o) => \`\${o.emoji} \${o.label}\`,
})`,
    codeReact: `<SelkitSelect options={options} multiple renderOption={(o) => \`\${o.emoji} \${o.label}\`} />`,
  },
  {
    id: 'swappable',
    title: 'Swappable parts',
    category: 'Customization',
    description: '替換結構零件的內容（箭頭／清除／tag 移除／群組標題／空狀態）——外殼與行為保留。',
    component: SwappableParts,
    codeVue: swappableVue,
    codeVanilla: `createSelkitDom('#selkit', {
  options: grouped,
  multiple: true,
  templateArrow: ({ open }) => (open ? '▾' : '▸'),
  templateClear: () => '🧹',
  templateGroup: ({ label }) => \`— \${label} —\`,
  templateEmpty: ({ reason }) => (reason === 'no-results' ? '🤷 找不到' : '…'),
})`,
    codeReact: `<SelkitSelect options={grouped} multiple
  renderArrow={({ open }) => (open ? '▾' : '▸')}
  renderClear={() => '🧹'}
  renderGroup={({ label }) => \`— \${label} —\`}
/>`,
  },
  {
    id: 'i18n',
    title: 'i18n messages',
    category: 'i18n',
    description: '自訂空狀態訊息（loading / noResults / minInputLength 等），逐鍵覆寫。',
    component: I18nMessages,
    codeVue: i18nVue,
    codeVanilla: `createSelkitDom('#selkit', {
  options,
  minInputLength: 2,
  messages: {
    loading: '載入中…',
    noResults: '查無資料',
    minInputLength: (n) => \`再輸入 \${n} 個字\`,
  },
})`,
    codeReact: `<SelkitSelect options={options} minInputLength={2}
  messages={{ loading: '載入中…', noResults: '查無資料' }}
/>`,
  },
  {
    id: 'bs5',
    title: 'Bootstrap 5 theme',
    category: 'Theming',
    description: '容器加 selkit-theme-bs5 class 套用 bs5.css（--bs-* 變數，未載 Bootstrap 走 fallback）。',
    component: BS5Theme,
    codeVue: bs5Vue,
    codeVanilla: `<!-- 載入 bs5.css；容器加 class -->
<div class="selkit-theme-bs5">
  <div id="selkit"></div>
</div>
createSelkitDom('#selkit', { options })`,
    codeReact: `<div className="selkit-theme-bs5">
  <SelkitSelect options={options} />
</div>`,
  },
  {
    id: 'rtl',
    title: 'RTL',
    category: 'Theming',
    description: '容器設 dir="rtl"，selkit 自動適配（箭頭、對齊、捲軸）。',
    component: RtlSelect,
    codeVue: rtlVue,
    codeVanilla: `<div dir="rtl">
  <div id="selkit"></div>
</div>
createSelkitDom('#selkit', { options, multiple: true })`,
    codeReact: `<div dir="rtl">
  <SelkitSelect options={options} multiple />
</div>`,
  },
]
