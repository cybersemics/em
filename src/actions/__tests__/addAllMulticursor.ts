import addAllMulticursor from '../../actions/addAllMulticursor'
import importText from '../../actions/importText'
import newSubthought from '../../actions/newSubthought'
import newThought from '../../actions/newThought'
import toggleContextView from '../../actions/toggleContextView'
import contextToPath from '../../selectors/contextToPath'
import addMulticursorAtFirstMatch from '../../test-helpers/addMulticursorAtFirstMatch'
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
  })

  it('works with existing multicursors', () => {
    const steps = [
      newThought('a'),
      newThought('b'),
      newThought('c'),
      newThought('d'),
      setCursor(['b']),
      addMulticursorAtFirstMatch(['c']),
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
  })

  it('selects all contexts at the cursor level inside a context view', () => {
    const text = `
      - a
        - m
          - x
          - y
          - z
      - b
        - m
          - t
          - u
          - v
    `

    const stateNew = reducerFlow([
      importText({ text }),
      setCursor(['a', 'm']),
      toggleContextView,
      setCursor(['a', 'm', 'a']),
      addAllMulticursor,
    ])(initialState())

    const a = contextToPath(stateNew, ['a', 'm', 'a'])!
    const b = contextToPath(stateNew, ['a', 'm', 'b'])!

    expect(stateNew.multicursors).toEqual({
      [hashPath(a)]: a,
      [hashPath(b)]: b,
    })
  })

  it('selects all siblings of a context after crossing a context view boundary', () => {
    const text = `
      - a
        - m
          - x
          - y
          - z
      - b
        - m
          - t
          - u
          - v
    `

    const stateNew = reducerFlow([
      importText({ text }),
      setCursor(['a', 'm']),
      toggleContextView,
      setCursor(['a', 'm', 'b', 't']),
      addAllMulticursor,
    ])(initialState())

    const t = contextToPath(stateNew, ['a', 'm', 'b', 't'])!
    const u = contextToPath(stateNew, ['a', 'm', 'b', 'u'])!
    const v = contextToPath(stateNew, ['a', 'm', 'b', 'v'])!

    expect(stateNew.multicursors).toEqual({
      [hashPath(t)]: t,
      [hashPath(u)]: u,
      [hashPath(v)]: v,
    })
  })

  it('selects all contexts at the cursor level inside a nested context view', () => {
    const text = `
      - a
        - m
          - p
            - n
              - ap
          - q
            - n
              - aq
      - b
        - m
          - r
            - n
              - br
          - s
            - n
              - bs
    `

    const stateNew = reducerFlow([
      importText({ text }),
      setCursor(['a', 'm']),
      toggleContextView,
      setCursor(['a', 'm', 'a', 'p', 'n']),
      toggleContextView,
      setCursor(['a', 'm', 'a', 'p', 'n', 'p']),
      addAllMulticursor,
    ])(initialState())

    const p = contextToPath(stateNew, ['a', 'm', 'a', 'p', 'n', 'p'])!
    const q = contextToPath(stateNew, ['a', 'm', 'a', 'p', 'n', 'q'])!
    const r = contextToPath(stateNew, ['a', 'm', 'a', 'p', 'n', 'r'])!
    const s = contextToPath(stateNew, ['a', 'm', 'a', 'p', 'n', 's'])!

    expect(stateNew.multicursors).toEqual({
      [hashPath(p)]: p,
      [hashPath(q)]: q,
      [hashPath(r)]: r,
      [hashPath(s)]: s,
    })
  })
})
