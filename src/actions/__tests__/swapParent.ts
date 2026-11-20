import { HOME_PATH, HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import getThoughtById from '../../selectors/getThoughtById'
import store from '../../stores/app'
import contextToPathOrThrow from '../../test-helpers/contextToPathOrThrow'
import expectPathToEqual from '../../test-helpers/expectPathToEqual'
import importToContext from '../../test-helpers/importToContext'
import initStore from '../../test-helpers/initStore'
import setCursor, { setCursorFirstMatchActionCreator as setCursorAction } from '../../test-helpers/setCursorFirstMatch'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'
import importText from '../importText'
import newThought from '../newThought'
import { pullAncestorsActionCreator as pullAncestors } from '../pullAncestors'
import setSortPreference from '../setSortPreference'
import swapParent, { swapParentActionCreator as swapParentAction } from '../swapParent'
import toggleContextView from '../toggleContextView'

it('no-op if cursor is not set', () => {
  const text = `
  - x
  - a
    - b
     - c`

  const steps = [importText({ text }), swapParent]

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

  const steps = [importText({ text }), setCursor(['a']), swapParent]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')
  expect(exported).toBe(`- ${HOME_TOKEN}
  - x
  - a
    - b
      - c`)
})

it('swaps two empty thoughts without error', () => {
  // Create an empty parent with an empty child and swap them.
  // Both thoughts have value '' (empty string), which previously triggered an unwanted merge.
  const steps = [newThought({ value: '' }), newThought({ value: '', insertNewSubthought: true }), swapParent]

  // Should not throw
  const stateNew = reducerFlow(steps)(initialState())

  // No error alert should appear
  expect(stateNew.alert?.value).toBeFalsy()

  // Cursor should be on the child thought (which is now at root level after the swap)
  const cursorId = stateNew.cursor?.[stateNew.cursor.length - 1]
  expect(cursorId).toBeTruthy()
  const cursorThought = getThoughtById(stateNew, cursorId!)
  expect(cursorThought).toBeTruthy()
  expect(cursorThought!.value).toBe('')
})

// https://github.com/cybersemics/em/issues/3628
it('preserves both notes when swapping a parent and child that each have a note', () => {
  const text = `
    - parent
      - =note
        - parent note
      - child
        - =note
          - child note
  `

  const steps = [importText({ text }), setCursor(['parent', 'child']), swapParent]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')
  expect(exported).toBe(`- ${HOME_TOKEN}
  - child
    - =note
      - parent note
    - parent
      - =note
        - child note`)
})

// https://github.com/cybersemics/em/issues/3725
it('carries =favorite with its thought while =pin keeps its position', () => {
  const text = `
    - a
      - =pin
        - true
      - b
        - =favorite
        - c
      - d
  `

  const steps = [importText({ text }), setCursor(['a', 'b']), swapParent]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')
  expect(exported).toBe(`- ${HOME_TOKEN}
  - b
    - =favorite
    - =pin
      - true
    - a
      - c
    - d`)
})

// https://github.com/cybersemics/em/issues/3725
it('leaves =favorite with the parent', () => {
  const text = `
    - a
      - =favorite
      - b
        - c
  `

  const steps = [importText({ text }), setCursor(['a', 'b']), swapParent]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')
  expect(exported).toBe(`- ${HOME_TOKEN}
  - b
    - a
      - =favorite
      - c`)
})

// https://github.com/cybersemics/em/issues/3725
it('preserves child order when swapping into a favorited parent', () => {
  const state = reducerFlow([
    newThought({ value: 'a' }),
    newThought({ value: '=favorite', insertNewSubthought: true }),
    setCursor(['a']),
    newThought({ value: 'b', insertNewSubthought: true }),
    newThought({ value: 'y', insertNewSubthought: true }),
    newThought({ value: 'z' }),
    setCursor(['a', 'b', 'y']),
    newThought({ value: 'x', insertBefore: true }),
    setCursor(['a', 'b']),
  ])(initialState())

  expect(exportContext(state, [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - a
    - =favorite
    - b
      - x
      - y
      - z`)

  const stateNew = swapParent(state)

  expect(exportContext(stateNew, [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - b
    - a
      - =favorite
      - x
      - y
      - z`)
})

it('swaps child thought with parent', () => {
  const text = `
  - x
  - a
    - b
     - c`

  const steps = [importText({ text }), setCursor(['a', 'b']), swapParent]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')
  expect(exported).toBe(`- ${HOME_TOKEN}
  - x
  - b
    - a
      - c`)

  expectPathToEqual(stateNew, stateNew.cursor, ['b'])
})

it('swaps a leaf thought with parent', () => {
  const text = `
  - x
  - a
    - b
     - c`

  const steps = [importText({ text }), setCursor(['a', 'b', 'c']), swapParent]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')
  expect(exported).toBe(`- ${HOME_TOKEN}
  - x
  - a
    - c
      - b`)

  expectPathToEqual(stateNew, stateNew.cursor, ['a', 'c'])
})

it('preserve siblings', () => {
  const text = `
    - a
      - b
        - c
      - d
  `

  const steps = [importText({ text }), setCursor(['a', 'b']), swapParent]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')
  expect(exported).toBe(`- ${HOME_TOKEN}
  - b
    - a
      - c
    - d`)
})

it('swapped parent should take the rank of the child', () => {
  const text = `
    - a
      - b
        - c
      - d
  `

  const steps = [importText({ text }), setCursor(['a', 'd']), swapParent]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')
  expect(exported).toBe(`- ${HOME_TOKEN}
  - d
    - b
      - c
    - a`)

  expectPathToEqual(stateNew, stateNew.cursor, ['d'])
})

// Regression test for the sibling reordering reported in
// https://github.com/cybersemics/em/pull/5058#issuecomment-5382410421
// The parent and the siblings move under the child before the child's own children have left it. Reusing the ranks
// they held under the parent collided with the ranks already there, and the rerank that a collision triggers
// resolved the tie in an arbitrary order, moving a sibling the swap should not have touched.
it('does not reorder the siblings around the parent moving into the cursor thought', () => {
  const text = `
    - a
      - b
        - w
        - c
          - d
          - e
        - f
  `

  const steps = [importText({ text }), setCursor(['a', 'b', 'c']), swapParent]

  const stateNew = reducerFlow(steps)(initialState())

  // b takes the slot c vacated, between w and f. f in particular stays last.
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')
  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - c
      - w
      - b
        - d
        - e
      - f`)
})

describe('context view', () => {
  it('swap as normal and preserve cursor in descendants of contexts in the context view', () => {
    const text = `
    - a
      - m
        - x
    - b
      - m
        - y
          - y1
  `

    const steps = [
      importText({ text }),
      setCursor(['a', 'm']),
      toggleContextView,
      setCursor(['a', 'm', 'b', 'y', 'y1']),
      swapParent,
    ]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')
    expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - m
      - x
  - b
    - m
      - y1
        - y`)

    expectPathToEqual(stateNew, stateNew.cursor, ['a', 'm', 'b', 'y1'])
  })

  it('disallow on contexts in the context view', () => {
    const text = `
    - a
      - m
        - x
    - b
      - m
        - y
          - y1
    `

    const steps = [
      importText({ text }),
      setCursor(['a', 'm']),
      toggleContextView,
      setCursor(['a', 'm', 'a']),
      swapParent,
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

    expectPathToEqual(stateNew, stateNew.cursor, ['a', 'm', 'a'])

    expect(stateNew.alert?.value).toBeTruthy()
  })

  it('disallow on child of context in the context view', () => {
    const text = `
    - a
      - m
        - x
    - b
      - m
        - y
          - y1
    `

    const steps = [
      importText({ text }),
      setCursor(['a', 'm']),
      toggleContextView,
      setCursor(['a', 'm', 'a', 'x']),
      swapParent,
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

    expectPathToEqual(stateNew, stateNew.cursor, ['a', 'm', 'a', 'x'])

    expect(stateNew.alert?.value).toBeTruthy()
  })
})

describe('sort', () => {
  it('does not throw when re-swapping parent with Created sort active', () => {
    const text = `
    - a
      - b
    - c
    - d
  `

    const steps = [
      importText({ text }),
      setSortPreference({ simplePath: HOME_PATH, sortPreference: { type: 'Created', direction: 'Desc' } }),
      setCursor(['a', 'b']),
      swapParent,
      swapParent,
    ]

    // Should not throw
    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')
    expect(exported).toContain('- a')
    expect(exported).toContain('- b')
  })

  it('root children are re-sorted after swapParent with active sort', () => {
    // Reproduce the issue: cursor on A, set Created sort, create subthought B, swap B with A.
    // B must be created in a later millisecond than A, C, and D: Created sort falls back to alphabetical order on
    // thoughts created in the same millisecond, which would put b first regardless of the swap. The reducers run
    // synchronously, so the clock has to be advanced explicitly between the two creation steps.
    vi.useFakeTimers()
    let stateNew
    try {
      const stateBefore = reducerFlow([
        importText({
          text: `
        - a
        - c
        - d
      `,
        }),
        setCursor(['a']),
        setSortPreference({ simplePath: HOME_PATH, sortPreference: { type: 'Created', direction: 'Asc' } }),
      ])(initialState())

      vi.advanceTimersByTime(1000)

      stateNew = reducerFlow([
        newThought({ value: 'b', insertNewSubthought: true }),
        setCursor(['a', 'b']),
        swapParent,
      ])(stateBefore)
    } finally {
      vi.useRealTimers()
    }

    // Use excludeMeta to focus on regular thoughts only.
    // b was created last (separate newThought step), so it always sorts after c and d in Created Asc order.
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain', { excludeMeta: true })

    // After swapParent, b is at root and a is b's child.
    // Without the fix, b would inherit a's rank (first) and appear before c and d.
    // With sort(HOME_TOKEN), b is ranked last since it was created after c and d.
    expect(exported).toBe(`- ${HOME_TOKEN}
  - c
  - d
  - b
    - a`)

    vi.useRealTimers()
  })
})

// A forced pull can still read the pre-swap tree from SQLite and overwrite the optimistic Redux swap.
// Re-enable once pull results are checked for intervening writes before they are applied.
// https://github.com/cybersemics/em/issues/3947
// https://github.com/cybersemics/em/issues/3948
it.skip('keeps the former parent visible after swapping during a forced pull', async () => {
  await initStore()
  store.dispatch([importToContext('- AAA\n  - BBB'), setCursorAction(['AAA', 'BBB'])])
  await vi.runAllTimersAsync()

  const path = contextToPathOrThrow(store.getState(), ['AAA', 'BBB'], 'swapParent')
  // Recently Edited starts a forced ancestor pull that can still be running when the swap begins.
  const pull = store.dispatch(pullAncestors(path, { force: true, maxDepth: 0 }))
  store.dispatch(swapParentAction())
  await pull
  await vi.runAllTimersAsync()

  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - BBB
    - AAA`)
})
