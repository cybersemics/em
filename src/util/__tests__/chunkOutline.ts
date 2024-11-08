import chunkOutline from '../chunkOutline'

it('splits a plain text outline into even chunks', () => {
  const chunks = chunkOutline(
    `- a
- b
- c
- d
- e
- f`,
    { chunkSize: 2 },
  )
  expect(chunks).toEqual([
    `- a
- b`,
    `- c
- d`,
    `- e
- f`,
  ])
})

it('place remainder lines in a chunk at the end', () => {
  const chunks = chunkOutline(
    `- a
- b
- c
- d
- e`,
    { chunkSize: 2 },
  )
  expect(chunks).toEqual([
    `- a
- b`,
    `- c
- d`,
    `- e`,
  ])
})

it('handle indent', () => {
  const chunks = chunkOutline(
    `    - a
    - b
    - c
    - d
    - e
    `,
    { chunkSize: 2 },
  )
  expect(chunks).toEqual([
    `    - a
    - b`,
    `    - c
    - d`,
    `    - e
    `,
  ])
})

describe('insert continuation line at the beginning of each chunk', () => {
  it('deeper', () => {
    const chunks = chunkOutline(
      `    - a
      - b
        - c
    `,
      { chunkSize: 2 },
    )
    expect(chunks.join('\n')).toEqual(`    - a
      - b
    - a
      - b
        - c
    `)
  })

  it('shallower', () => {
    const chunks = chunkOutline(
      `    - a
      - b
        - c
          - d
      - e
    `,
      { chunkSize: 2 },
    )
    expect(chunks.join('\n')).toEqual(`    - a
      - b
    - a
      - b
        - c
          - d
    - a
      - e
    `)
  })

  it('even', () => {
    const chunks = chunkOutline(
      `    - a
      - b
        - c
        - d
        - e
        - f
    `,
      { chunkSize: 2 },
    )
    expect(chunks.join('\n')).toEqual(`    - a
      - b
    - a
      - b
        - c
        - d
    - a
      - b
        - e
        - f
    `)
  })
})
