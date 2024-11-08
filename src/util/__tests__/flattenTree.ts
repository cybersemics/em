import flattenTree from '../flattenTree'
import htmlToJson from '../htmlToJson'
import textToHtml from '../textToHtml'

it('one node', () => {
  const text = `
  - a
`

  const json = htmlToJson(textToHtml(text))
  expect(flattenTree(json, block => block.scope)).toEqual(['a'])
})

it('siblings', () => {
  const text = `
    - a
    - b
    - c
  `

  const json = htmlToJson(textToHtml(text))
  expect(flattenTree(json, block => block.scope)).toEqual(['a', 'b', 'c'])
})

it('children', () => {
  const text = `
    - a
      - b
        - c
  `

  const json = htmlToJson(textToHtml(text))
  expect(flattenTree(json, block => block.scope)).toEqual(['a', 'b', 'c'])
})

it('uncle', () => {
  const text = `
    - a
      - b
        - c
      - d
  `

  const json = htmlToJson(textToHtml(text))
  expect(flattenTree(json, block => block.scope)).toEqual(['a', 'b', 'c', 'd'])
})

it('great uncle', () => {
  const text = `
    - a
      - b
        - c
    - d
  `

  const json = htmlToJson(textToHtml(text))
  expect(flattenTree(json, block => block.scope)).toEqual(['a', 'b', 'c', 'd'])
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
  expect(flattenTree(json, block => block.scope)).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g'])
})

describe('resume', () => {
  it('index 0 starts from the beginning', () => {
    const text = `
      - a
      - b
      - c
    `

    const json = htmlToJson(textToHtml(text))
    expect(flattenTree(json, block => block.scope, { start: 0 })).toEqual(['a', 'b', 'c'])
  })

  it('resume from second sibling', () => {
    const text = `
      - a
      - b
      - c
    `

    const json = htmlToJson(textToHtml(text))
    expect(flattenTree(json, block => block.scope, { start: 1 })).toEqual(['b', 'c'])
  })

  it('resume from second sibling with children', () => {
    const text = `
      - a
      - b
        - c
        - d
    `

    const json = htmlToJson(textToHtml(text))
    expect(flattenTree(json, block => block.scope, { start: 1 })).toEqual(['b', 'c', 'd'])
  })

  it('resume from second level', () => {
    const text = `
      - a
        - b
          - c
    `

    const json = htmlToJson(textToHtml(text))
    expect(flattenTree(json, block => block.scope, { start: 1 })).toEqual(['b', 'c'])
  })

  it('resume from second level with uncle', () => {
    const text = `
      - a
        - b
      - c
    `

    const json = htmlToJson(textToHtml(text))
    expect(flattenTree(json, block => block.scope, { start: 1 })).toEqual(['b', 'c'])
  })

  it('resume from second level of second sibling', () => {
    const text = `
      - a
        - b
      - c
        - d
          - e
    `

    const json = htmlToJson(textToHtml(text))
    expect(flattenTree(json, block => block.scope, { start: 4 })).toEqual(['e'])
  })

  it('resume from third level with great uncle', () => {
    const text = `
      - a
        - b
          - c
      - d
        - e
    `

    const json = htmlToJson(textToHtml(text))
    expect(flattenTree(json, block => block.scope, { start: 2 })).toEqual(['c', 'd', 'e'])
  })

  it('resume from second child of second level', () => {
    const text = `
      - a
        - b
        - c
          - d
          - e
    `

    const json = htmlToJson(textToHtml(text))
    expect(flattenTree(json, block => block.scope, { start: 2 })).toEqual(['c', 'd', 'e'])
  })

  it('resume from third level with great uncle and multiple siblings', () => {
    const text = `
      - a
      - a1
        - b
        - b1
          - c
          - c1
      - d
      - d1
        - e
        - e1
    `

    const json = htmlToJson(textToHtml(text))
    expect(flattenTree(json, block => block.scope, { start: 5 })).toEqual(['c1', 'd', 'd1', 'e', 'e1'])
  })

  it('pass the index to the mapping function', () => {
    const text = `
      - a
      - b
        - c
        - d
          - e
          - f
      - g
      - h
        - i
        - j
    `

    const json = htmlToJson(textToHtml(text))
    expect(flattenTree(json, (block, ancestors, i) => i)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
  })

  it('mapping function index should be relative to the total number of blocks (not start index)', () => {
    const text = `
      - a
      - b
        - c
        - d
          - e
          - f
      - g
      - h
        - i
        - j
    `

    const json = htmlToJson(textToHtml(text))
    expect(flattenTree(json, (block, ancestors, i) => i, { start: 5 })).toEqual([5, 6, 7, 8, 9])
  })

  it('ancestors', () => {
    const text = `
      - a
        - b
          - c
            - d
            - e
          - f
      - g
        - h
      - i
        - j
    `

    const json = htmlToJson(textToHtml(text))
    expect(flattenTree(json, (block, ancestors, i) => ancestors.map(b => b.scope))).toMatchObject([
      [],
      ['a'],
      ['a', 'b'],
      ['a', 'b', 'c'],
      ['a', 'b', 'c'],
      ['a', 'b'],
      [],
      ['g'],
      [],
      ['i'],
    ])
  })
})
