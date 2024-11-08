import htmlToJson from '../htmlToJson'
import seekBlock from '../seekBlock'
import textToHtml from '../textToHtml'

const text = `
  - a
    - b
      - c
      - d
      - e
  - f
    - g
`

const json = htmlToJson(textToHtml(text))

it('seek to start', () => {
  expect(seekBlock(json, 0)).toEqual({ path: [], childIndex: 0 })
})

it('seek to child', () => {
  const a = json[0]
  expect(seekBlock(json, 1)).toEqual({ path: [a], childIndex: 0 })
})

it('seek to grandchild', () => {
  const a = json[0]
  const b = json[0].children[0]
  expect(seekBlock(json, 2)).toEqual({ path: [a, b], childIndex: 0 })
})

it('seek to great grandchild', () => {
  const a = json[0]
  const b = json[0].children[0]
  const c = json[0].children[0].children[0]
  expect(seekBlock(json, 3)).toEqual({ path: [a, b, c], childIndex: 0 })
})

it('seek to second sibling', () => {
  const a = json[0]
  const b = json[0].children[0]
  const d = json[0].children[0].children[1]
  expect(seekBlock(json, 4)).toEqual({ path: [a, b, d], childIndex: 1 })
})

it('seek to third sibling', () => {
  const a = json[0]
  const b = json[0].children[0]
  const e = json[0].children[0].children[2]
  expect(seekBlock(json, 5)).toEqual({ path: [a, b, e], childIndex: 2 })
})

it('seek to great uncle', () => {
  const f = json[1]
  expect(seekBlock(json, 6)).toEqual({ path: [f], childIndex: 1 })
})

it('seek to nephew', () => {
  const f = json[1]
  const g = json[1].children[0]
  expect(seekBlock(json, 7)).toEqual({ path: [f, g], childIndex: 0 })
})

it('seek negative', () => {
  expect(seekBlock(json, -1)).toEqual(null)
})

it('seek out of range', () => {
  expect(seekBlock(json, 99)).toEqual(null)
})
