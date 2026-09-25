import clearMulticursors from '../../actions/clearMulticursors'
import newThought from '../../actions/newThought'
import addMulticursorAtFirstMatch from '../../test-helpers/addMulticursorAtFirstMatch'
import initStore from '../../test-helpers/initStore'
import runDocumentCommand from '../../test-helpers/runDocumentCommand'
import setCursor from '../../test-helpers/setCursorFirstMatch'
import waitForThoughtspaceIdle from '../../test-helpers/waitForThoughtspaceIdle'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'

beforeEach(initStore)
afterEach(waitForThoughtspaceIdle)

describe('clearMulticursors', () => {
  it('clears all multicursors', () => {
    const steps = [
      newThought('a'),
      newThought('b'),
      setCursor(['a']),
      addMulticursorAtFirstMatch(['a']),
      addMulticursorAtFirstMatch(['b']),
      clearMulticursors,
    ]

    const stateNew = runDocumentCommand(reducerFlow(steps), initialState())

    expect(stateNew.multicursors).toEqual({})
  })

  it('does nothing when there are no multicursors', () => {
    const steps = [newThought('a'), setCursor(['a']), clearMulticursors]

    const stateNew = runDocumentCommand(reducerFlow(steps), initialState())

    expect(stateNew.multicursors).toEqual({})
  })
})
