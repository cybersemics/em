import importText from '../../actions/importText'
import newThought from '../../actions/newThought'
import sort from '../../actions/sort'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import { getChildrenRanked, isVisible } from '../../selectors/getChildren'
import contextToThought from '../../test-helpers/contextToThought'
import deleteThoughtAtFirstMatch from '../../test-helpers/deleteThoughtAtFirstMatch'
import initStore from '../../test-helpers/initStore'
import runDocumentCommand from '../../test-helpers/runDocumentCommand'
import setCursorFirstMatch from '../../test-helpers/setCursorFirstMatch'
import waitForThoughtspaceIdle from '../../test-helpers/waitForThoughtspaceIdle'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'

beforeEach(initStore)
afterEach(waitForThoughtspaceIdle)

describe('sort', () => {
  it('no-op when context is already in sorted order', () => {
    const text = `
      - =sort
        - Alphabetical
      - a
      - b
      - c
    `
    const state = runDocumentCommand(reducerFlow([importText({ text })]), initialState())

    // Apply sort to the home context
    const stateAfterSort = runDocumentCommand((state, document) => sort(state, HOME_TOKEN, document), state)

    // State reference should be the same (true no-op)
    expect(stateAfterSort).toBe(state)
  })

  it('no-op when context is already in sorted order but has non-zero ranks', () => {
    // Import with '!' first — punctuation sorts before letters in alphabetical order.
    // This gives '!' a lower rank than 'a', 'b', 'c' in the thought store.
    // After deleting '!', the remaining thoughts retain their non-zero ranks.
    const text = `
      - =sort
        - Alphabetical
      - !
      - a
      - b
      - c
    `
    const stateWithPlaceholder = runDocumentCommand(reducerFlow([importText({ text })]), initialState())
    const stateWithGappedRanks = runDocumentCommand(deleteThoughtAtFirstMatch(['!']), stateWithPlaceholder)

    const a = contextToThought(stateWithGappedRanks, ['a'])!
    const b = contextToThought(stateWithGappedRanks, ['b'])!
    const c = contextToThought(stateWithGappedRanks, ['c'])!

    // Verify ranks are non-zero and still in ascending order
    expect(a.rank).toBeGreaterThan(0)
    expect(b.rank).toBeGreaterThan(a.rank)
    expect(c.rank).toBeGreaterThan(b.rank)

    // Apply sort — should be a no-op since the relative order is already correct
    const stateAfterSort = runDocumentCommand(
      (state, document) => sort(state, HOME_TOKEN, document),
      stateWithGappedRanks,
    )

    // State reference should be the same (true no-op)
    expect(stateAfterSort).toBe(stateWithGappedRanks)
  })

  it('only updates thoughts whose ranks change when sorting is needed', () => {
    // Import 'a', 'c', 'b' in that order with the sort preference already set.
    // Calling sort as a separate action then demonstrates that only the thoughts
    // whose ranks need to change are updated.
    const text = `
      - =sort
        - Alphabetical
      - a
      - c
      - b
    `
    const state = runDocumentCommand(reducerFlow([importText({ text })]), initialState())

    const a1 = contextToThought(state, ['a'])!
    const b1 = contextToThought(state, ['b'])!
    const c1 = contextToThought(state, ['c'])!

    // Apply sort in a separate step
    const stateAfterSort = runDocumentCommand((state, document) => sort(state, HOME_TOKEN, document), state)

    const exported = exportContext(stateAfterSort, HOME_TOKEN, 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - =sort
    - Alphabetical
  - a
  - b
  - c`)

    const a2 = contextToThought(stateAfterSort, ['a'])!
    const b2 = contextToThought(stateAfterSort, ['b'])!
    const c2 = contextToThought(stateAfterSort, ['c'])!

    // a was already in the correct sorted position — its rank did not change
    expect(a2.rank).toBe(a1.rank)
    // verify the thought object itself was not recreated (it was not in thoughtIndexUpdates)
    expect(a2).toBe(a1)

    // b and c were out of sorted order — their ranks changed
    expect(b2.rank).not.toBe(b1.rank)
    expect(c2.rank).not.toBe(c1.rank)
  })

  // https://github.com/cybersemics/em/pull/4952#pullrequestreview-4993273973
  it('sorts an empty thought to the top', () => {
    const text = `
      - =sort
        - Alphabetical
      - b
      - c
    `
    const state = runDocumentCommand(
      reducerFlow([importText({ text }), setCursorFirstMatch(['c']), newThought({ value: '' })]),
      initialState(),
    )

    const stateAfterSort = runDocumentCommand((state, document) => sort(state, HOME_TOKEN, document), state)

    // the rendered order is rank order, so assert the ranked children
    const children = getChildrenRanked(stateAfterSort, HOME_TOKEN).filter(child => isVisible(stateAfterSort, child))
    expect(children.map(child => child.value)).toEqual(['', 'b', 'c'])
  })
})
