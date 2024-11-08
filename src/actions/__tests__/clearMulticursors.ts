import clearMulticursors from '../../actions/clearMulticursors'
import newThought from '../../actions/newThought'
import addMulticursorAtFirstMatch from '../../test-helpers/addMulticursorAtFirstMatch'
import setCursor from '../../test-helpers/setCursorFirstMatch'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'

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

    const stateNew = reducerFlow(steps)(initialState())

    expect(stateNew.multicursors).toEqual({})
  })

  it('does nothing when there are no multicursors', () => {
    const steps = [newThought('a'), setCursor(['a']), clearMulticursors]

    const stateNew = reducerFlow(steps)(initialState())

    expect(stateNew.multicursors).toEqual({})
  })
})
