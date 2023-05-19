import htmlToJson from '../htmlToJson'
import textToHtml from '../textToHtml'
import traverseTree from '../traverseTree'

it('bread-first search', () => {
  const text = `
  - a
    - b
      - c
      - d
      - e
  - f
    - g
  - h
`

  const json = htmlToJson(textToHtml(text))
  const root = { children: json, scope: 'root' }
  const results: { scope: string; i: number }[] = []
  traverseTree(root, (block, i) => {
    // eslint-disable-next-line fp/no-mutating-methods
    results.push({ scope: block.scope, i })
  })
  expect(results).toEqual([
    { scope: 'root', i: 0 },
    { scope: 'a', i: 1 },
    { scope: 'f', i: 2 },
    { scope: 'h', i: 3 },
    { scope: 'b', i: 4 },
    { scope: 'g', i: 5 },
    { scope: 'c', i: 6 },
    { scope: 'd', i: 7 },
    { scope: 'e', i: 8 },
  ])
})

it('abort', () => {
  const text = `
  - a
    - b
      - c
      - d
      - e
  - f
    - g
  - h
`

  const json = htmlToJson(textToHtml(text))
  const root = { children: json, scope: 'root' }
  const results: { scope: string; i: number }[] = []
  traverseTree(root, (block, i) => {
    // eslint-disable-next-line fp/no-mutating-methods
    results.push({ scope: block.scope, i })
    if (block.scope === 'b') return false
  })
  expect(results).toEqual([
    { scope: 'root', i: 0 },
    { scope: 'a', i: 1 },
    { scope: 'f', i: 2 },
    { scope: 'h', i: 3 },
    { scope: 'b', i: 4 },
  ])
})
