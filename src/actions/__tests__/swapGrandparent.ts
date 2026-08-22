import State from '../../@types/State'
import { HOME_PATH, HOME_TOKEN } from '../../constants'
import contextToPath from '../../selectors/contextToPath'
import exportContext from '../../selectors/exportContext'
import expectPathToEqual from '../../test-helpers/expectPathToEqual'
import setCursor from '../../test-helpers/setCursorFirstMatch'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'
import importText from '../importText'
import newThought from '../newThought'
import setSortPreference from '../setSortPreference'
import swapGrandparent from '../swapGrandparent'
import toggleAttribute from '../toggleAttribute'
import toggleContextView from '../toggleContextView'

/** A reducer that pins the thought at the given unranked path, giving it a =pin child. */
const pin =
  (at: string[]) =>
  (state: State): State =>
    toggleAttribute(state, { path: contextToPath(state, at), values: ['=pin', 'true'] })

it('no-op if cursor is not set', () => {
  const text = `
  - x
  - a
    - b
      - c`

  const steps = [importText({ text }), swapGrandparent]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')
  expect(exported).toBe(`- ${HOME_TOKEN}
  - x
  - a
    - b
      - c`)
})

it('no-op if cursor is a root thought', () => {
  const text = `
  - x
  - a
    - b
      - c`

  const steps = [importText({ text }), setCursor(['a']), swapGrandparent]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')
  expect(exported).toBe(`- ${HOME_TOKEN}
  - x
  - a
    - b
      - c`)
})

it('no-op if the cursor has no grandparent', () => {
  const text = `
  - x
  - a
    - b
      - c`

  const steps = [importText({ text }), setCursor(['a', 'b']), swapGrandparent]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')
  expect(exported).toBe(`- ${HOME_TOKEN}
  - x
  - a
    - b
      - c`)
})

it('swaps child thought with grandparent, leaving the parent in between', () => {
  const text = `
  - x
  - a
    - b
      - c`

  const steps = [importText({ text }), setCursor(['a', 'b', 'c']), swapGrandparent]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')
  expect(exported).toBe(`- ${HOME_TOKEN}
  - x
  - c
    - b
      - a`)

  expectPathToEqual(stateNew, stateNew.cursor, ['c'])
})

it("moves the child's children under the grandparent", () => {
  const text = `
  - a
    - b
      - c
        - d`

  const steps = [importText({ text }), setCursor(['a', 'b', 'c']), swapGrandparent]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')
  expect(exported).toBe(`- ${HOME_TOKEN}
  - c
    - b
      - a
        - d`)
})

it("moves the grandparent's other children under the child", () => {
  const text = `
  - a
    - b
      - c
    - e`

  const steps = [importText({ text }), setCursor(['a', 'b', 'c']), swapGrandparent]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')
  expect(exported).toBe(`- ${HOME_TOKEN}
  - c
    - b
      - a
    - e`)
})

it("preserves the parent's other children", () => {
  const text = `
  - a
    - b
      - c
      - f`

  const steps = [importText({ text }), setCursor(['a', 'b', 'c']), swapGrandparent]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')
  expect(exported).toBe(`- ${HOME_TOKEN}
  - c
    - b
      - a
      - f`)
})

it('swapped grandparent should take the rank of the child', () => {
  const text = `
  - a
    - b
      - c
      - f`

  const steps = [importText({ text }), setCursor(['a', 'b', 'f']), swapGrandparent]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')
  expect(exported).toBe(`- ${HOME_TOKEN}
  - f
    - b
      - c
      - a`)

  expectPathToEqual(stateNew, stateNew.cursor, ['f'])
})

it('swaps below the root, preserving the great-grandparent', () => {
  const text = `
  - root
    - a
      - b
        - c`

  const steps = [importText({ text }), setCursor(['root', 'a', 'b', 'c']), swapGrandparent]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')
  expect(exported).toBe(`- ${HOME_TOKEN}
  - root
    - c
      - b
        - a`)

  expectPathToEqual(stateNew, stateNew.cursor, ['root', 'c'])
})

// Regression test for https://github.com/cybersemics/em/pull/5058#issuecomment-5382369074
// The grandparent's children move under the child before the child's own children have left it. Reusing the ranks
// they held under the grandparent collided with the ranks already there, and the rerank that a collision triggers
// resolved the tie in an arbitrary order, moving a thought the swap should not have touched.
it('does not reorder the children of any context other than the two swapped thoughts', () => {
  const text = `
  - a
    - b
      - c
        - d
          - e
        - f
      - g
    - h
  - i`

  const steps = [
    importText({ text }),
    // Pin c and d, so that each gains a =pin child at a rank below its other children.
    pin(['a', 'b', 'c']),
    pin(['a', 'b', 'c', 'd']),
    setCursor(['a', 'b', 'c', 'd']),
    swapGrandparent,
  ]

  const stateNew = reducerFlow(steps)(initialState())

  // Only d and b change places. g in particular stays after c, where it was after b.
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')
  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - d
      - c
        - =pin
        - b
          - =pin
          - e
        - f
      - g
    - h
  - i`)
})

describe('context view', () => {
  it('disallow on descendants of contexts in the context view', () => {
    const text = `
    - a
      - m
        - x
    - b
      - m
        - y
          - y1`

    const steps = [
      importText({ text }),
      setCursor(['a', 'm']),
      toggleContextView,
      setCursor(['a', 'm', 'b', 'y', 'y1']),
      swapGrandparent,
    ]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')
    expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - m
      - x
  - b
    - m
      - y
        - y1`)

    expectPathToEqual(stateNew, stateNew.cursor, ['a', 'm', 'b', 'y', 'y1'])

    expect(stateNew.alert?.value).toBeTruthy()
  })
})

describe('sort', () => {
  it('root children are re-sorted after swapGrandparent with active sort', () => {
    // c must be created in a later millisecond than a, x, and z: Created sort falls back to alphabetical order on
    // thoughts created in the same millisecond, which would put c first regardless of the swap. The reducers run
    // synchronously, so the clock has to be advanced explicitly between the two creation steps.
    vi.useFakeTimers()
    let stateNew
    try {
      const stateBefore = reducerFlow([
        importText({
          text: `
          - a
            - b
          - x
          - z
        `,
        }),
        setCursor(['a', 'b']),
        setSortPreference({ simplePath: HOME_PATH, sortPreference: { type: 'Created', direction: 'Asc' } }),
      ])(initialState())

      vi.advanceTimersByTime(1000)

      stateNew = reducerFlow([
        newThought({ value: 'c', insertNewSubthought: true }),
        setCursor(['a', 'b', 'c']),
        swapGrandparent,
      ])(stateBefore)
    } finally {
      vi.useRealTimers()
    }

    // c was created last, so it always sorts after x and z in Created Asc order.
    // Without sort(greatGrandparentId), c would inherit a's rank (first) and appear before x and z.
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain', { excludeMeta: true })

    expect(exported).toBe(`- ${HOME_TOKEN}
  - x
  - z
  - c
    - b
      - a`)
  })

  it("the parent's children are re-sorted after the grandparent moves in", () => {
    vi.useFakeTimers()
    let stateNew
    try {
      const stateBefore = reducerFlow([
        importText({
          text: `
          - root
            - z
              - b
                - =sort
                  - Created
        `,
        }),
        setCursor(['root', 'z', 'b']),
      ])(initialState())

      vi.advanceTimersByTime(1000)

      const stateA = reducerFlow([newThought({ value: 'a', insertNewSubthought: true })])(stateBefore)

      vi.advanceTimersByTime(1000)

      stateNew = reducerFlow([newThought({ value: 'c' }), setCursor(['root', 'z', 'b', 'c']), swapGrandparent])(stateA)
    } finally {
      vi.useRealTimers()
    }

    // z was created before a, so Created Asc puts it first. Without sort(parentId) z would inherit c's rank and
    // land after a.
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain', { excludeMeta: true })
    expect(exported).toBe(`- ${HOME_TOKEN}
  - root
    - c
      - b
        - z
        - a`)
  })

  it("a sorted grandparent's children keep their order when they move under the child", () => {
    vi.useFakeTimers()
    let stateNew
    try {
      const stateBefore = reducerFlow([
        importText({
          text: `
          - a
            - =sort
              - Created
            - b
              - c
        `,
        }),
        setCursor(['a', 'b']),
      ])(initialState())

      vi.advanceTimersByTime(1000)

      const stateZ = reducerFlow([newThought({ value: 'z' })])(stateBefore)

      vi.advanceTimersByTime(1000)

      stateNew = reducerFlow([newThought({ value: 'm' }), setCursor(['a', 'b', 'c']), swapGrandparent])(stateZ)
    } finally {
      vi.useRealTimers()
    }

    // The child receives exactly the grandparent's children, including its =sort, so their Created order (b, z, m)
    // must survive the move.
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain', { excludeMeta: true })
    expect(exported).toBe(`- ${HOME_TOKEN}
  - c
    - b
      - a
    - z
    - m`)
  })

  it("a sorted child's children keep their order when they move under the grandparent", () => {
    vi.useFakeTimers()
    let stateNew
    try {
      const stateBefore = reducerFlow([
        importText({
          text: `
          - a
            - b
              - c
                - =sort
                  - Created
        `,
        }),
        setCursor(['a', 'b', 'c']),
      ])(initialState())

      vi.advanceTimersByTime(1000)

      const stateZ = reducerFlow([newThought({ value: 'z', insertNewSubthought: true })])(stateBefore)

      vi.advanceTimersByTime(1000)

      stateNew = reducerFlow([newThought({ value: 'm' }), setCursor(['a', 'b', 'c']), swapGrandparent])(stateZ)
    } finally {
      vi.useRealTimers()
    }

    // The grandparent receives exactly the child's children, including its =sort, so their Created order (z, m)
    // must survive the move.
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain', { excludeMeta: true })
    expect(exported).toBe(`- ${HOME_TOKEN}
  - c
    - b
      - a
        - z
        - m`)
  })
})
