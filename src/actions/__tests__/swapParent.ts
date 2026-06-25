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
  // .skip keeps normal CI green while the test is red; remove the .skip when the fix lands.
  it.skip('stale forced pull must not overwrite newer post-swap thoughts', () => {
    const text = `
    - AAA
      - BBB
        - CCC`

    const state1 = reducerFlow([importText({ text }), setCursor(['AAA', 'BBB', 'CCC'])])(initialState())

    // Snapshot the pre-swap thoughts, simulating data a forced pull read from the data provider
    // before the swap. lastUpdated is older than the swap's updates.
    const ids = ['AAA', 'BBB', 'CCC'].map(value => contextToThoughtId(state1, [value])!)
    const stalePull = keyValueBy(ids, id => ({
      [id]: { ...getThoughtById(state1, id), lastUpdated: 1 },
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
})
