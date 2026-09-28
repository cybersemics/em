import importText from '../../actions/importText'
import newThought from '../../actions/newThought'
import sort from '../../actions/sort'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import { getChildrenRanked, isVisible } from '../../selectors/getChildren'
import contextToThought from '../../test-helpers/contextToThought'
import deleteThoughtAtFirstMatch from '../../test-helpers/deleteThoughtAtFirstMatch'
import initStore from '../../test-helpers/initStore'
import reducerFlow from '../../test-helpers/reducerFlow'
import runDocumentCommand from '../../test-helpers/runDocumentCommand'
import setCursorFirstMatch from '../../test-helpers/setCursorFirstMatch'
import waitForThoughtspaceIdle from '../../test-helpers/waitForThoughtspaceIdle'
import initialState from '../../util/initialState'

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
    const state = reducerFlow([importText({ text })])(initialState())

    // Apply sort to the home context
    const stateAfterSort = runDocumentCommand(sort(HOME_TOKEN), state)

    // State reference should be the same (true no-op)
    expect(stateAfterSort).toBe(state)
  })

  it('remains a no-op after deleting an earlier sibling', () => {
    const text = `
      - =sort
        - Alphabetical
      - !
      - a
      - b
      - c
    `
    const stateWithPlaceholder = reducerFlow([importText({ text })])(initialState())
    const stateAfterDelete = runDocumentCommand(deleteThoughtAtFirstMatch(['!']), stateWithPlaceholder)

    const a = contextToThought(stateAfterDelete, ['a'])!
    const b = contextToThought(stateAfterDelete, ['b'])!
    const c = contextToThought(stateAfterDelete, ['c'])!

    // The sort attribute occupies the first canonical position.
    expect([a, b, c].map(thought => stateAfterDelete.thoughts.getPosition(thought.id))).toEqual([1, 2, 3])

    // Apply sort — should be a no-op since the relative order is already correct
    const stateAfterSort = runDocumentCommand(sort(HOME_TOKEN), stateAfterDelete)

    // State reference should be the same (true no-op)
    expect(stateAfterSort).toBe(stateAfterDelete)
  })

  it('changes sibling order without recreating unchanged thoughts', () => {
    // Import 'a', 'c', 'b' in that order with the sort preference already set.
    // Sorting changes topology without changing any child payload or parent.
    const text = `
      - =sort
        - Alphabetical
      - a
      - c
      - b
    `
    const state = reducerFlow([importText({ text })])(initialState())

    const a1 = contextToThought(state, ['a'])!
    const b1 = contextToThought(state, ['b'])!
    const c1 = contextToThought(state, ['c'])!

    // Apply sort in a separate step
    const stateAfterSort = runDocumentCommand(sort(HOME_TOKEN), state)

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

    expect(stateAfterSort.thoughts.getPosition(a2.id)).toBe(state.thoughts.getPosition(a1.id))
    expect(a2).toBe(a1)

    expect(stateAfterSort.thoughts.getPosition(b2.id)).not.toBe(state.thoughts.getPosition(b1.id))
    expect(stateAfterSort.thoughts.getPosition(c2.id)).not.toBe(state.thoughts.getPosition(c1.id))
    expect(b2).toBe(b1)
    expect(c2).toBe(c1)
  })

  // https://github.com/cybersemics/em/pull/4952#pullrequestreview-4993273973
  it('sorts an empty thought to the top', () => {
    const text = `
      - =sort
        - Alphabetical
      - b
      - c
    `
    const state = reducerFlow([importText({ text }), setCursorFirstMatch(['c']), newThought({ value: '' })])(
      initialState(),
    )

    const stateAfterSort = runDocumentCommand(sort(HOME_TOKEN), state)

    // the rendered order is rank order, so assert the ranked children
    const children = getChildrenRanked(stateAfterSort, HOME_TOKEN).filter(child => isVisible(stateAfterSort, child))
    expect(children.map(child => child.value)).toEqual(['', 'b', 'c'])
  })
})
