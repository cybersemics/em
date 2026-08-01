import Index from '../../@types/IndexType'
import Thought from '../../@types/Thought'
import Timestamp from '../../@types/Timestamp'
import { HOME_PATH, HOME_TOKEN } from '../../constants'
import contextToThoughtId from '../../selectors/contextToThoughtId'
import exportContext from '../../selectors/exportContext'
import getThoughtById from '../../selectors/getThoughtById'
import expectPathToEqual from '../../test-helpers/expectPathToEqual'
import setCursor from '../../test-helpers/setCursorFirstMatch'
import initialState from '../../util/initialState'
import keyValueBy from '../../util/keyValueBy'
import reducerFlow from '../../util/reducerFlow'
import importText from '../importText'
import newThought from '../newThought'
import setSortPreference from '../setSortPreference'
import swapParent from '../swapParent'
import toggleContextView from '../toggleContextView'
import updateThoughts from '../updateThoughts'

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
    // B must be created as a separate step so its creation order is after A, C, D.
    const steps = [
      importText({
        text: `
        - a
        - c
        - d
      `,
      }),
      setCursor(['a']),
      setSortPreference({ simplePath: HOME_PATH, sortPreference: { type: 'Created', direction: 'Asc' } }),
      newThought({ value: 'b', insertNewSubthought: true }),
      setCursor(['a', 'b']),
      swapParent,
    ]

    const stateNew = reducerFlow(steps)(initialState())

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
  })
})

describe('reconcile', () => {
  // Regression test for https://github.com/cybersemics/em/issues/3948
  // A forced pull (e.g. RecentlyEdited's pullJumpHistory) re-reads thoughts from the data
  // provider and dispatches a non-local updateThoughts. If that stale snapshot (read before
  // the swap) lands after swapParent, it must not overwrite the newer post-swap thoughts.
  it('stale forced pull must not overwrite newer post-swap thoughts', () => {
    const text = `
    - AAA
      - BBB
        - CCC`

    const state1 = reducerFlow([importText({ text }), setCursor(['AAA', 'BBB', 'CCC'])])(initialState())

    // Snapshot the pre-swap thoughts, simulating data a forced pull read from the data provider
    // before the swap. lastUpdated is older than the swap's updates.
    const ids = ['AAA', 'BBB', 'CCC'].map(value => contextToThoughtId(state1, [value])!)
    const stalePull: Index<Thought> = keyValueBy(ids, id => ({
      [id]: { ...getThoughtById(state1, id)!, lastUpdated: 1 as Timestamp },
    }))

    const stateNew = reducerFlow([
      swapParent,
      updateThoughts({ thoughtIndexUpdates: stalePull, lexemeIndexUpdates: {}, local: false, remote: false }),
    ])(state1)

    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')
    expect(exported).toBe(`- ${HOME_TOKEN}
  - AAA
    - CCC
      - BBB`)
  })

  // A partial stale reconcile is the more dangerous case: when only a subset of the swapped
  // thoughts arrives stale (e.g. only the middle thought), the in-memory tree ends up with an
  // inconsistent parent/child link, forming a cycle (BBB claims CCC as a child while CCC still
  // claims BBB) that sends parent-chain traversal into an infinite loop and hangs the app.
  it('partial stale forced pull must not create a parent-chain cycle', () => {
    const text = `
    - AAA
      - BBB
        - CCC`

    const state1 = reducerFlow([importText({ text }), setCursor(['AAA', 'BBB', 'CCC'])])(initialState())

    // Snapshot only the middle thought (BBB) as read by a forced pull before the swap.
    const idBBB = contextToThoughtId(state1, ['AAA', 'BBB'])!
    const stalePull: Index<Thought> = {
      [idBBB]: { ...getThoughtById(state1, idBBB)!, lastUpdated: 1 as Timestamp },
    }

    const stateNew = reducerFlow([
      swapParent,
      updateThoughts({ thoughtIndexUpdates: stalePull, lexemeIndexUpdates: {}, local: false, remote: false }),
    ])(state1)

    // Without the last-write-wins guard, exportContext would recurse infinitely on the cycle.
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')
    expect(exported).toBe(`- ${HOME_TOKEN}
  - AAA
    - CCC
      - BBB`)
  })

  // The failure mode observed on-device (#3948): the reconcile that corrupts the tree does not carry an
  // *older* timestamp — it carries the *same* one. swapParent runs several moveThought reducers
  // synchronously in a single reducerFlow, so every thought it touches is stamped with the same
  // lastUpdated millisecond, and each moveThought queues its own push batch, including the transient
  // intermediate state where the moved-in child (CCC) has been added under AAA but the moved-out child
  // (BBB) has not yet been removed from AAA's childrenMap. A forced pull that reads that intermediate
  // snapshot re-delivers AAA with BBB still listed as a child, stamped with the swap's lastUpdated. If a
  // strict `<` guard let it through it would clobber the correct result, leaving BBB in two contexts
  // (AAA and CCC) → parent-chain cycle → hang.
  it('stale reconcile of the swap intermediate state (equal lastUpdated) must not create a cycle', () => {
    const text = `
    - AAA
      - BBB
        - CCC`

    const state1 = reducerFlow([importText({ text }), setCursor(['AAA', 'BBB', 'CCC'])])(initialState())
    const stateSwapped = swapParent(state1)

    // Reconstruct swapParent's intermediate AAA: the post-swap AAA with BBB added back to its childrenMap,
    // carrying the same lastUpdated as the swap result (as a forced pull reading the intermediate would).
    const idAAA = contextToThoughtId(stateSwapped, ['AAA'])!
    const idBBB = contextToThoughtId(stateSwapped, ['AAA', 'CCC', 'BBB'])!
    const aaa = getThoughtById(stateSwapped, idAAA)!
    const staleIntermediateAAA: Thought = {
      ...aaa,
      childrenMap: { ...aaa.childrenMap, [idBBB]: idBBB },
      lastUpdated: aaa.lastUpdated,
    }

    const stateNew = reducerFlow([
      updateThoughts({
        thoughtIndexUpdates: { [idAAA]: staleIntermediateAAA },
        lexemeIndexUpdates: {},
        local: false,
        remote: false,
      }),
    ])(stateSwapped)

    // With a strict `<` guard the stale intermediate slips through and exportContext recurses infinitely.
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')
    expect(exported).toBe(`- ${HOME_TOKEN}
  - AAA
    - CCC
      - BBB`)
  })
})
