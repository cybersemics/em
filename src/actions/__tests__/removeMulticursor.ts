import State from '../../@types/State'
import newThought from '../../actions/newThought'
import removeMulticursor from '../../actions/removeMulticursor'
import contextToPath from '../../selectors/contextToPath'
import addMulticursorAtFirstMatch from '../../test-helpers/addMulticursorAtFirstMatch'
import setCursor from '../../test-helpers/setCursorFirstMatch'
import hashPath from '../../util/hashPath'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'

describe('removeMulticursor', () => {
  it('removes a multicursor', () => {
    const steps = [
      newThought('a'),
      newThought('b'),
      setCursor(['a']),
      addMulticursorAtFirstMatch(['a']),
      addMulticursorAtFirstMatch(['b']),
      (state: State) => removeMulticursor(state, { path: contextToPath(state, ['a'])! }),
    ]

    const stateNew = reducerFlow(steps)(initialState())

    const b = contextToPath(stateNew, ['b'])!

    expect(stateNew.multicursors).toEqual({
      [hashPath(b)]: b,
    })
  })

  it('does nothing when removing non-existent multicursor', () => {
    const steps = [
      newThought('a'),
      newThought('b'),
      setCursor(['a']),
      addMulticursorAtFirstMatch(['a']),
      (state: State) => removeMulticursor(state, { path: contextToPath(state, ['b'])! }),
    ]

    const stateNew = reducerFlow(steps)(initialState())

    const a = contextToPath(stateNew, ['a'])!

    expect(stateNew.multicursors).toEqual({
      [hashPath(a)]: a,
    })
  })

  it('removes last multicursor', () => {
    const steps = [
      newThought('a'),
      setCursor(['a']),
      addMulticursorAtFirstMatch(['a']),
      (state: State) => removeMulticursor(state, { path: contextToPath(state, ['a'])! }),
    ]

    const stateNew = reducerFlow(steps)(initialState())

    expect(stateNew.multicursors).toEqual({})
  })
})
