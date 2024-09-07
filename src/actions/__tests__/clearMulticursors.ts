import State from '../../@types/State'
import addMulticursor from '../../actions/addMulticursor'
import clearMulticursors from '../../actions/clearMulticursors'
import newThought from '../../actions/newThought'
import contextToPath from '../../selectors/contextToPath'
import setCursor from '../../test-helpers/setCursorFirstMatch'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'

describe('clearMulticursors', () => {
  it('clears all multicursors', () => {
    const steps = [
      newThought('a'),
      newThought('b'),
      setCursor(['a']),
      (state: State) => addMulticursor(state, { path: contextToPath(state, ['a'])! }),
      (state: State) => addMulticursor(state, { path: contextToPath(state, ['b'])! }),
      clearMulticursors,
    ]

    const stateNew = reducerFlow(steps)(initialState())

    expect(stateNew.multicursors).toEqual({})
    expect(stateNew.cursorBeforeMulticursor).toBeNull()
  })

  it('does nothing when there are no multicursors', () => {
    const steps = [newThought('a'), setCursor(['a']), clearMulticursors]

    const stateNew = reducerFlow(steps)(initialState())

    expect(stateNew.multicursors).toEqual({})
    expect(stateNew.cursorBeforeMulticursor).toBeNull()
  })

  it('clears cursorBeforeMulticursor', () => {
    const steps = [
      newThought('a'),
      setCursor(['a']),
      (state: State) => addMulticursor(state, { path: contextToPath(state, ['a'])! }),
      clearMulticursors,
    ]

    const stateNew = reducerFlow(steps)(initialState())

    expect(stateNew.multicursors).toEqual({})
    expect(stateNew.cursorBeforeMulticursor).toBeNull()
  })
})
