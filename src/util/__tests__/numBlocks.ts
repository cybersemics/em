import htmlToJson from '../htmlToJson'
import numBlocks from '../numBlocks'
import textToHtml from '../textToHtml'

it('one node', () => {
  const text = `
  - a
`

  const json = htmlToJson(textToHtml(text))
  expect(numBlocks(json)).toEqual(1)
})

it('siblings', () => {
  const text = `
  - a
  - b
  - c
`

  const json = htmlToJson(textToHtml(text))
  expect(numBlocks(json)).toEqual(3)
})

it('children', () => {
  const text = `
  - a
    - b
      - c
`

  const json = htmlToJson(textToHtml(text))
  expect(numBlocks(json)).toEqual(3)
})

it('uncle', () => {
  const text = `
  - a
    - b
      - c
    - d
`

  const json = htmlToJson(textToHtml(text))
  expect(numBlocks(json)).toEqual(4)
})

it('great uncle', () => {
  const text = `
  - a
    - b
      - c
  - d
`

  const json = htmlToJson(textToHtml(text))
  expect(numBlocks(json)).toEqual(4)
})

it('combo', () => {
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
  expect(numBlocks(json)).toEqual(7)
})
