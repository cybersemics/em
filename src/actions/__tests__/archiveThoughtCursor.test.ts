import { describe, it, expect } from 'vitest'
import archiveThought from '../../actions/archiveThought'
import newThought from '../../actions/newThought'
import setCursorHelper from '../../test-helpers/setCursorFirstMatch'
import contextToThought from '../../test-helpers/contextToThought'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'
import expectPathToEqual from '../../test-helpers/expectPathToEqual'

describe('archiveThought cursor via explicit path (drag)', () => {
  it('STR A: should move cursor to prev sibling when archiving via explicit path with cursor on same thought', () => {
    const steps = [
      newThought('One'),
      newThought('Two'),
      newThought('Three'),
      setCursorHelper(['Two']),
    ]
    const state = reducerFlow(steps)(initialState())
    const stateAfter = archiveThought(state, { path: state.cursor! })
    expectPathToEqual(stateAfter, stateAfter.cursor, ['One'])
  })

  it('STR B: cursor on Three, should move cursor when archiving Two via explicit path', () => {
    const steps = [
      newThought('One'),
      newThought('Two'),
      newThought('Three'),
      setCursorHelper(['Three']),
    ]
    const state = reducerFlow(steps)(initialState())
    const twoThought = contextToThought(state, ['Two'])!
    const stateAfter = archiveThought(state, { path: [twoThought.id] })
    expectPathToEqual(stateAfter, stateAfter.cursor, ['One'])
  })
})
