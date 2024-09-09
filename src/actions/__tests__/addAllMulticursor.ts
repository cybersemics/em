import State from '../../@types/State'
import addAllMulticursor from '../../actions/addAllMulticursor'
import addMulticursor from '../../actions/addMulticursor'
import newSubthought from '../../actions/newSubthought'
import newThought from '../../actions/newThought'
import contextToPath from '../../selectors/contextToPath'
import setCursor from '../../test-helpers/setCursorFirstMatch'
import hashPath from '../../util/hashPath'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'

describe('addAllMulticursor', () => {
  it('adds all siblings to multicursor when cursor is set', () => {
    const steps = [newThought('a'), newThought('b'), newThought('c'), setCursor(['b']), addAllMulticursor]

    const stateNew = reducerFlow(steps)(initialState())

    const a = contextToPath(stateNew, ['a'])!
    const b = contextToPath(stateNew, ['b'])!
    const c = contextToPath(stateNew, ['c'])!

    expect(stateNew.multicursors).toEqual({
      [hashPath(a)]: a,
      [hashPath(b)]: b,
      [hashPath(c)]: c,
    })
    expect(stateNew.cursorBeforeMulticursor).toEqual(b)
  })

  it('adds all root thoughts to multicursor when no cursor is set', () => {
    const steps = [newThought('a'), newThought('b'), newThought('c'), setCursor(null), addAllMulticursor]

    const stateNew = reducerFlow(steps)(initialState())

    const a = contextToPath(stateNew, ['a'])!
    const b = contextToPath(stateNew, ['b'])!
    const c = contextToPath(stateNew, ['c'])!

    expect(stateNew.multicursors).toEqual({
      [hashPath(a)]: a,
      [hashPath(b)]: b,
      [hashPath(c)]: c,
    })
    expect(stateNew.cursorBeforeMulticursor).toBeNull()
  })

  it('does not add subthoughts to multicursor', () => {
    const steps = [
      newThought('a'),
      newSubthought('a1'),
      setCursor(['a']),
      newThought('b'),
      setCursor(['a']),
      addAllMulticursor,
    ]

    const stateNew = reducerFlow(steps)(initialState())

    const a = contextToPath(stateNew, ['a'])!
    const b = contextToPath(stateNew, ['b'])!

    expect(stateNew.multicursors).toEqual({
      [hashPath(a)]: a,
      [hashPath(b)]: b,
    })
    expect(stateNew.cursorBeforeMulticursor).toEqual(a)
  })

  it('works with existing multicursors', () => {
    const steps = [
      newThought('a'),
      newThought('b'),
      newThought('c'),
      newThought('d'),
      setCursor(['b']),
      (state: State) => addMulticursor(state, { path: contextToPath(state, ['c'])! }),
      addAllMulticursor,
    ]

    const stateNew = reducerFlow(steps)(initialState())

    const a = contextToPath(stateNew, ['a'])!
    const b = contextToPath(stateNew, ['b'])!
    const c = contextToPath(stateNew, ['c'])!
    const d = contextToPath(stateNew, ['d'])!

    expect(stateNew.multicursors).toEqual({
      [hashPath(a)]: a,
      [hashPath(b)]: b,
      [hashPath(c)]: c,
      [hashPath(d)]: d,
    })
    expect(stateNew.cursorBeforeMulticursor).toEqual(b)
  })

  it('selects all siblings when a subthought is selected', () => {
    const steps = [
      newThought('a'),
      newSubthought('a1'),
      newThought('a2'),
      newThought('a3'),
      setCursor(['a', 'a2']),
      addAllMulticursor,
    ]

    const stateNew = reducerFlow(steps)(initialState())

    const a1 = contextToPath(stateNew, ['a', 'a1'])!
    const a2 = contextToPath(stateNew, ['a', 'a2'])!
    const a3 = contextToPath(stateNew, ['a', 'a3'])!

    expect(stateNew.multicursors).toEqual({
      [hashPath(a1)]: a1,
      [hashPath(a2)]: a2,
      [hashPath(a3)]: a3,
    })
    expect(stateNew.cursorBeforeMulticursor).toEqual(a2)
  })
})
