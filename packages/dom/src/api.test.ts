import { describe, expect, it } from 'vitest'
import { Selkit, createSelkitDom, sk } from './index'

const OPTIONS = [{ value: 'a', label: 'Apple' }]

describe('API 別名', () => {
  it('createSelkitDom / sk / new Selkit 三者皆可建立元件', () => {
    const makers = [
      () => createSelkitDom(document.createElement('div'), { options: OPTIONS }),
      () => sk(document.createElement('div'), { options: OPTIONS }),
      () => new Selkit(document.createElement('div'), { options: OPTIONS }),
    ]
    for (const make of makers) {
      const inst = make()
      expect(inst.element.querySelector('.selkit__control')).toBeTruthy()
      expect(inst.controller).toBeDefined()
      inst.destroy()
    }
  })

  it('host 可傳 selector 字串 (Tom Select 風格)', () => {
    const host = document.createElement('div')
    host.id = 'sk-target'
    document.body.append(host)
    const inst = sk('#sk-target', { options: OPTIONS })
    expect(host.querySelector('.selkit__control')).toBeTruthy()
    inst.destroy()
    host.remove()
  })

  it('selector 找不到對應元素時拋錯', () => {
    expect(() => createSelkitDom('#does-not-exist', { options: OPTIONS })).toThrow()
  })
})
