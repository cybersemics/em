import { ABSOLUTE_TOKEN, HOME_TOKEN } from '../../constants'
import contextToPath from '../../selectors/contextToPath'
import exportContext from '../../selectors/exportContext'
import { getAllChildren } from '../../selectors/getChildren'
import { getLexeme } from '../../selectors/getLexeme'
import setCursor from '../../test-helpers/setCursorFirstMatch'
import initialState from '../../util/initialState'
import pathToContext from '../../util/pathToContext'
import reducerFlow from '../../util/reducerFlow'
import archiveThought from '../archiveThought'
import cursorBack from '../cursorBack'
import cursorUp from '../cursorUp'
import deleteEmptyThought from '../deleteEmptyThought'
import importText from '../importText'
import newSubthought from '../newSubthought'
import newThought from '../newThought'
import splitThought from '../splitThought'
import toggleContextView from '../toggleContextView'

describe('normal view', () => {
  it('delete empty thought', () => {
    const steps = [newThought('a'), newThought(''), deleteEmptyThought]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - a`)
  })

  it('do not delete non-empty thought', () => {
    const steps = [newThought('a'), deleteEmptyThought]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - a`)
  })

  it('do not delete thought with children', () => {
    const steps = [newThought(''), newSubthought('1'), cursorBack, deleteEmptyThought]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - ${'' /* prevent trim_trailing_whitespace */}
    - 1`)
  })

  it(`archive thought with hidden children - archive all children in cursor's parent`, () => {
    const steps = [
      importText({
        text: `
        -
          - =a
          - =b`,
      }),
      setCursor(['']),
      deleteEmptyThought,
    ]

    const stateNew = reducerFlow(steps)(initialState())

    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - =archive
    - =a
    - =b`)
  })

  it(`archive thought with archived and hidden children - archive all children in cursor's parent`, () => {
    const steps = [
      importText({
        text: `
        -
          - =a
          - b
          - =c`,
      }),
      setCursor(['', 'b']),
      archiveThought({}),
      setCursor(['']),
      deleteEmptyThought,
    ]

    const stateNew = reducerFlow(steps)(initialState())

    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - =archive
    - =a
    - =c
    - b`)
  })

  it('do nothing if there is no cursor', () => {
    const steps = [newThought('a'), newThought('b'), setCursor(null), deleteEmptyThought]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - a
  - b`)
  })

  it('merge thoughts', () => {
    // set the cursor
    const steps = [
      newThought('a'),
      newThought('b'),
      // reset the cursor to ensure that cursor offset is 0
      setCursor(null),
      setCursor(['b']),
      deleteEmptyThought,
    ]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - ab`)
  })

  it(`insert second thought's children`, () => {
    const steps = [
      newThought('a'),
      newThought('b'),
      newSubthought('b1'),
      newThought('b2'),
      cursorBack,
      deleteEmptyThought,
    ]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - ab
    - b1
    - b2`)
  })

  it(`do not change first thought's children`, () => {
    const steps = [
      newThought('a'),
      newSubthought('a1'),
      newThought('a2'),
      cursorBack,
      newThought('b'),
      // reset the cursor to ensure that cursor offset is 0
      setCursor(null),
      setCursor(['b']),
      deleteEmptyThought,
    ]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - ab
    - a1
    - a2`)
  })

  it('cursor should move to next sibling if there is no prev sibling', () => {
    const steps = [
      newThought('a'),
      newSubthought(''),
      newThought('a2'),
      newThought('a3'),
      cursorUp,
      cursorUp,
      deleteEmptyThought,
    ]

    const stateNew = reducerFlow(steps)(initialState())

    expect(stateNew.cursor).toMatchObject(contextToPath(stateNew, ['a', 'a2'])!)
  })

  it('cursor should move to parent if the deleted thought has no siblings', () => {
    const steps = [newThought('a'), newSubthought(''), deleteEmptyThought]

    const stateNew = reducerFlow(steps)(initialState())

    expect(stateNew.cursor).toMatchObject(contextToPath(stateNew, ['a'])!)
  })

  it('cursor should be removed if the last thought is deleted', () => {
    const steps = [newThought(''), deleteEmptyThought]

    const stateNew = reducerFlow(steps)(initialState())

    expect(stateNew.cursor).toBe(null)
  })
})

describe('context view', () => {
  it(`delete empty context`, () => {
    const steps = [
      importText({
        text: `
          - a
            - m
              - x
          - b
            - m
              - y
        `,
      }),
      setCursor(['a', 'm']),
      toggleContextView,
      newThought({ insertNewSubthought: true }),
      deleteEmptyThought,
    ]

    const stateNew = reducerFlow(steps)(initialState())

    // empty context should be deleted from the Lexeme
    const lexeme = getLexeme(stateNew, 'm')
    expect(lexeme?.contexts).toHaveLength(2)

    // absolute context should be empty
    const children = getAllChildren(stateNew, ABSOLUTE_TOKEN)
    expect(children).toHaveLength(0)

    // cursor should be on the next context
    expect(pathToContext(stateNew, stateNew.cursor!)).toEqual(['a', 'm', 'a'])
  })
})

it('merge thought should respect space if any (whitespace at end of left splitted value)', () => {
  const steps = [
    newThought('hello world'),
    splitThought({
      splitResult: {
        left: 'hello ',
        right: 'world',
      },
    }),
    deleteEmptyThought,
  ]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - hello world`)
})

it('merge thought should respect space if any (whitespace at front of right splitted value)', () => {
  const steps = [
    newThought('hello world'),
    splitThought({
      splitResult: {
        left: 'hello',
        right: ' world',
      },
    }),
    deleteEmptyThought,
  ]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - hello world`)
})
