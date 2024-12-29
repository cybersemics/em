import State from '../../@types/State'
import addMulticursor from '../../actions/addMulticursor'
import newSubthought from '../../actions/newSubthought'
import newThought from '../../actions/newThought'
import contextToPath from '../../selectors/contextToPath'
import setCursor from '../../test-helpers/setCursorFirstMatch'
import hashPath from '../../util/hashPath'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'

describe('addMulticursor', () => {
  it('adds first multicursor', () => {
    const steps = [
      newThought('a'),
      newThought('b'),
      setCursor(['a']),
      (state: State) => addMulticursor(state, { path: contextToPath(state, ['b'])! }),
    ]

    const stateNew = reducerFlow(steps)(initialState())

    const b = contextToPath(stateNew, ['b'])!

    expect(stateNew.multicursors).toEqual({
      [hashPath(b)]: b,
    })
  })

  it('adds current cursor as first multicursor', () => {
    const steps = [
      newThought('a'),
      newThought('b'),
      setCursor(['b']),
      (state: State) => addMulticursor(state, { path: contextToPath(state, ['b'])! }),
    ]

    const stateNew = reducerFlow(steps)(initialState())

    const b = contextToPath(stateNew, ['b'])!

    expect(stateNew.multicursors).toEqual({
      [hashPath(b)]: b,
    })
  })

  it('adds second multicursor', () => {
    const steps = [
      newThought('a'),
      newThought('b'),
      setCursor(['b']),
      (state: State) => addMulticursor(state, { path: contextToPath(state, ['b'])! }),
      (state: State) => addMulticursor(state, { path: contextToPath(state, ['a'])! }),
    ]

    const stateNew = reducerFlow(steps)(initialState())

    const a = contextToPath(stateNew, ['a'])!
    const b = contextToPath(stateNew, ['b'])!

    expect(stateNew.multicursors).toEqual({
      [hashPath(a)]: a,
      [hashPath(b)]: b,
    })
  })

  it('adds subthought to multicursor', () => {
    const steps = [
      newThought('a'),
      newSubthought('a1'),
      setCursor(['a']),
      (state: State) => addMulticursor(state, { path: contextToPath(state, ['a'])! }),
      (state: State) => addMulticursor(state, { path: contextToPath(state, ['a', 'a1'])! }),
    ]

    const stateNew = reducerFlow(steps)(initialState())

    const a = contextToPath(stateNew, ['a'])!
    const a1 = contextToPath(stateNew, ['a', 'a1'])!

    expect(stateNew.multicursors).toEqual({
      [hashPath(a)]: a,
      [hashPath(a1)]: a1,
    })
  })

  it('do nothing when adding existing multicursor', () => {
    const steps = [
      newThought('a'),
      newThought('b'),
      setCursor(['b']),
      (state: State) => addMulticursor(state, { path: contextToPath(state, ['b'])! }),
      (state: State) => addMulticursor(state, { path: contextToPath(state, ['b'])! }),
    ]

    const stateNew = reducerFlow(steps)(initialState())

    const b = contextToPath(stateNew, ['b'])!

    expect(stateNew.multicursors).toEqual({
      [hashPath(b)]: b,
    })
  })

  it('add multicursor when there is no cursor', () => {
    const steps = [
      newThought('a'),
      newThought('b'),
      setCursor(null),
      (state: State) => addMulticursor(state, { path: contextToPath(state, ['a'])! }),
    ]

    const stateNew = reducerFlow(steps)(initialState())

    const a = contextToPath(stateNew, ['a'])!

    expect(stateNew.multicursors).toEqual({
      [hashPath(a)]: a,
    })
  })

  it('add multicursor and ignore cursor', () => {
    const steps = [
      newThought('a'),
      newThought('b'),
      setCursor(['a']),
      (state: State) => addMulticursor(state, { path: contextToPath(state, ['b'])! }),
    ]

    const stateNew = reducerFlow(steps)(initialState())

    const b = contextToPath(stateNew, ['b'])!

    expect(stateNew.multicursors).toEqual({
      [hashPath(b)]: b,
    })
  })
})
