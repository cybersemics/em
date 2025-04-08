import archiveThought from '../../actions/archiveThought'
import cursorUp from '../../actions/cursorUp'
import newSubthought from '../../actions/newSubthought'
import newThought from '../../actions/newThought'
import toggleContextView from '../../actions/toggleContextView'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import getContexts from '../../selectors/getContexts'
import expectPathToEqual from '../../test-helpers/expectPathToEqual'
import setCursor from '../../test-helpers/setCursorFirstMatch'
// TODO: Why does util have to be imported before selectors and reducers?
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'
import importText from '../importText'

describe('normal view', () => {
  it('archive a thought', () => {
    const steps = [newThought('a'), newThought('b'), archiveThought({})]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - =archive
    - b
  - a`)
  })

  it('deduplicate archived thoughts with the same value', () => {
    const steps = [newThought('a'), newThought('b'), newThought('b'), archiveThought({}), archiveThought({})]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')
    expect(exported).toBe(`- ${HOME_TOKEN}
  - =archive
    - b
  - a`)
  })

  it('do nothing if there is no cursor', () => {
    const steps = [newThought('a'), setCursor(null), archiveThought({})]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - a`)
  })

  it('move to top of archive', () => {
    const steps = [newThought('a'), newThought('b'), newThought('c'), archiveThought({}), archiveThought({})]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - =archive
    - b
    - c
  - a`)
  })

  it('permanently delete empty thought', () => {
    const steps = [newThought('a'), newThought(''), archiveThought({})]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - a`)
  })

  it('permanently delete thought from archive', () => {
    const steps = [
      newThought('a'),
      newThought('b'),
      archiveThought({}),
      setCursor(['=archive', 'b']),
      archiveThought({}),
    ]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - =archive
  - a`)
  })

  it('permanently delete archive', () => {
    const steps = [newThought('a'), newThought('b'), archiveThought({}), setCursor(['=archive']), archiveThought({})]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - a`)

    // ensure =archive is removed from lexemeIndex
    expect(getContexts(stateNew, '=archive')).toHaveLength(0)
  })

  it('permanently delete archive with descendants', () => {
    const steps = [
      newThought('a'),
      newSubthought('b'),
      setCursor(['a']),
      archiveThought({}),
      setCursor(['=archive']),
      archiveThought({}),
    ]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}`)

    // ensure =archive is removed from lexemeIndex
    expect(getContexts(stateNew, '=archive')).toHaveLength(0)

    // ensure descendants are remvoed from lexemeIndex
    expect(getContexts(stateNew, 'a')).toHaveLength(0)
  })

  it('cursor should move to prev sibling', () => {
    const steps = [
      newThought('a'),
      newSubthought('a1'),
      newThought('a2'),
      newThought('a3'),
      cursorUp,
      archiveThought({}),
    ]

    const stateNew = reducerFlow(steps)(initialState())
    expectPathToEqual(stateNew, stateNew.cursor, ['a', 'a1'])
  })

  it('cursor should move to next sibling if there is no prev sibling', () => {
    const steps = [
      newThought('a'),
      newSubthought('a1'),
      newThought('a2'),
      newThought('a3'),
      cursorUp,
      cursorUp,
      archiveThought({}),
    ]

    const stateNew = reducerFlow(steps)(initialState())

    expectPathToEqual(stateNew, stateNew.cursor, ['a', 'a2'])
  })

  it('cursor should move to parent if the deleted thought has no siblings', () => {
    const steps = [newThought('a'), newSubthought('a1'), archiveThought({})]

    const stateNew = reducerFlow(steps)(initialState())

    expectPathToEqual(stateNew, stateNew.cursor, ['a'])
  })

  it('cursor should be removed if the last thought is deleted', () => {
    const steps = [newThought('a'), archiveThought({})]

    const stateNew = reducerFlow(steps)(initialState())

    expect(stateNew.cursor).toBe(null)
  })

  it('empty thought should be archived if it has descendants', () => {
    const steps = [newThought('a'), newThought(''), newSubthought('b'), setCursor(['']), archiveThought({})]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - =archive
    - ${'' /* prevent trim_trailing_whitespace */}
      - b
  - a`)
  })
})

describe('context view', () => {
  it('archive thought from context view', () => {
    const steps = [
      importText({
        text: `
          - a
            - m
              - x
          - b
            - m
              - y
            - n
        `,
      }),
      setCursor(['a', 'm']),
      toggleContextView,
      setCursor(['a', 'm', 'b']),
      archiveThought({}),
    ]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')
    const expected = `- ${HOME_TOKEN}
  - a
    - m
      - x
  - b
    - =archive
      - m
        - y
    - n`
    expect(exported).toBe(expected)
  })

  it('cursor should move to next sibling by default', () => {
    const steps = [
      importText({
        text: `
          - a
            - m
              - x
          - b
            - m
              - y
            - n
          - c
            - m
              - z
        `,
      }),
      setCursor(['a', 'm']),
      toggleContextView,
      setCursor(['a', 'm', 'b']),
      archiveThought({}),
    ]

    const stateNew = reducerFlow(steps)(initialState())

    expectPathToEqual(stateNew, stateNew.cursor, ['a', 'm', 'c'])
  })

  it('cursor should move to previous sibling if there is no next sibling', () => {
    const steps = [
      importText({
        text: `
          - a
            - m
              - x
          - b
            - m
              - y
            - n
          - c
            - m
              - z
        `,
      }),
      setCursor(['b', 'm']),
      toggleContextView,
      setCursor(['b', 'm', 'a']),
      archiveThought({}),
    ]

    const stateNew = reducerFlow(steps)(initialState())

    expectPathToEqual(stateNew, stateNew.cursor, ['b', 'm', 'b'])
  })

  it('cursor should move to parent when there is only one context left', () => {
    const steps = [
      importText({
        text: `
          - a
            - m
              - x
          - b
            - m
              - y
            - n
        `,
      }),
      setCursor(['a', 'm']),
      toggleContextView,
      setCursor(['a', 'm', 'b']),
      archiveThought({}),
    ]

    const stateNew = reducerFlow(steps)(initialState())

    expectPathToEqual(stateNew, stateNew.cursor, ['a', 'm'])
  })
})
