# 選取與 tagging

## 單選與多選

預設是單選。設定 `multiple: true` 改為多選，已選項會渲染成可移除的 tag：

```js
createSelkit({ options, multiple: true })
```

綁定值在單選時是單值，多選時是陣列。

## 選取上限

限制一次最多可選幾項：

```js
createSelkit({ options, multiple: true, maxSelections: 3 })
```

達到上限後，後續的 `select` 呼叫會被忽略。

## 隱藏已選

開啟 `hideSelected` 後，已選項會從下拉清單移除 — 多選 UI 常見做法。已選的值會被過濾出
`visibleOptions`，因此 `getGroupedView()` 會略過它們，所有 adapter 不需任何特別的程式
碼即可隱藏：

```js
createSelkit({ options, multiple: true, hideSelected: true })
```

取消選取後，該項會回到清單。

## Tagging

用 `taggable` 與 `createTag` factory，允許使用者建立尚不存在的選項：

```js
createSelkit({
  options,
  taggable: true,
  createTag: (query) => ({ value: query.toLowerCase(), label: query }),
})
```

在沒有相符選項時按 Enter 會建立並選取新 tag，並觸發 `create` 事件。若已存在同名 label
的選項，則改為選取既有選項，不會重複建立。

## 重新排序 tag

`moveSelected(from, to)` 以不可變方式重排已選陣列，並以新順序觸發 `change`。adapter 把
它接上拖放：tag 為 `draggable`，把一個 tag 放到另一個上即呼叫 `moveSelected`：

```js
controller.moveSelected(0, 2) // 把第一個 tag 移到索引 2
```

## 清除

`clear()` 會移除所有選取；`clearable` 選項（單選預設 `true`）會在 indicators 區顯示清除鈕。
