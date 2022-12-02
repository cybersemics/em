import { ABSOLUTE_TOKEN, HOME_TOKEN } from '../../constants'
import { importText, toggleContextView } from '../../reducers'
import contextToThoughtId from '../../selectors/contextToThoughtId'
import exportContext from '../../selectors/exportContext'
import { getLexeme } from '../../selectors/getLexeme'
import newThoughtAtFirstMatch from '../../test-helpers/newThoughtAtFirstMatch'
import setCursor from '../../test-helpers/setCursorFirstMatch'
import initialState from '../../util/initialState'
import pathToContext from '../../util/pathToContext'
import reducerFlow from '../../util/reducerFlow'
import newThought from '../newThought'

describe('normal view', () => {
  it('new thought in root', () => {
    const stateNew = newThought(initialState(), { value: 'a' })
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - a`)
  })

  it('new thought after', () => {
    const steps = [newThought('a'), newThought('b')]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - a
  - b`)
  })

  it('new thought before', () => {
    const steps = [newThought('a'), newThought({ value: 'b', insertBefore: true })]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - b
  - a`)
  })

  it('new subthought', () => {
    const steps = [newThought('a'), newThought({ value: 'b', insertNewSubthought: true })]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - b`)
  })

  it('new subthought top', () => {
    const steps = [
      newThought('a'),
      newThought({ value: 'b', insertNewSubthought: true }),
      newThought('c'),
      newThoughtAtFirstMatch({
        value: 'd',
        at: ['a'],
        insertNewSubthought: true,
        insertBefore: true,
      }),
    ]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - d
    - b
    - c`)
  })

  it('new thought to top of home context', () => {
    const steps = [newThought('a'), setCursor(null), newThought({ value: 'b', insertBefore: true })]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - b
  - a`)
  })

  it('update cursor to first new thought', () => {
    const stateNew = newThought(initialState(), { value: 'a' })

    expect(stateNew.cursor).toMatchObject([contextToThoughtId(stateNew, ['a'])!])
  })

  it('update cursor to new thought', () => {
    const steps = [newThought('a'), newThought('b')]

    const stateNew = reducerFlow(steps)(initialState())

    expect(stateNew.cursor).toMatchObject([contextToThoughtId(stateNew, ['b'])!])
  })
})

describe('context view', () => {
  it('new subthought on a context view adds the thought to a new context in the absolute context', () => {
    const text = `
    - a
      - m
        - x
    - b
      - m
        - y
  `
    const steps = [
      importText({ text }),
      setCursor(['a', 'm']),
      toggleContextView,
      newThought({ value: '', insertNewSubthought: true }),
    ]

    const stateNew = reducerFlow(steps)(initialState())

    // Lexeme should be properly updated
    const lexeme = getLexeme(stateNew, 'm')
    expect(lexeme?.contexts).toHaveLength(3)

    // root export will not contain the new thought created in the absolute context
    const exportedRoot = exportContext(stateNew, [HOME_TOKEN], 'text/plain')
    expect(exportedRoot).toBe(`- ${HOME_TOKEN}
  - a
    - m
      - x
  - b
    - m
      - y`)

    // absolute context should contain the new thought with m as a child
    const exportedAbs = exportContext(stateNew, [ABSOLUTE_TOKEN], 'text/plain')
    expect(exportedAbs).toBe(`- ${ABSOLUTE_TOKEN}
  - ${''}
    - m`)

    // cursor should be on the new context
    expect(pathToContext(stateNew, stateNew.cursor!)).toEqual(['a', 'm', ''])
  })
})
