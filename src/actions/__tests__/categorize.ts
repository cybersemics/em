import { HOME_TOKEN } from '../../constants'
import childIdsToThoughts from '../../selectors/childIdsToThoughts'
import exportContext from '../../selectors/exportContext'
import expectPathToEqual from '../../test-helpers/expectPathToEqual'
import setCursor from '../../test-helpers/setCursorFirstMatch'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'
import categorize from '../categorize'
import importText from '../importText'
import newSubthought from '../newSubthought'
import newThought from '../newThought'
import toggleContextView from '../toggleContextView'

describe('normal view', () => {
  it('categorize a thought', () => {
    const steps = [newThought('a'), newSubthought('b'), categorize]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - ${'' /* prevent trim_trailing_whitespace */}
      - b`)
  })

  it('categorize a thought in the root', () => {
    const steps = [newThought('a'), categorize]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - ${'' /* prevent trim_trailing_whitespace */}
    - a`)
  })

  it('categorize with no cursor should do nothing', () => {
    const steps = [newThought('a'), newSubthought('b'), setCursor(null), categorize]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - b`)
  })

  it('set cursor on new empty thought', () => {
    const steps = [newThought('a'), newSubthought('b'), categorize]

    const stateNew = reducerFlow(steps)(initialState())

    const cursorThoughts = childIdsToThoughts(stateNew, stateNew.cursor!)

    expect(cursorThoughts).toMatchObject([
      { value: 'a', rank: 0 },
      { value: '', rank: -1 },
    ])
  })

  it('categorize within alphabteically sorted context', () => {
    const steps = [
      importText({
        text: `
      - A
        - =sort
          - Alphabetical
        - B
        - C
        - D
        - E`,
      }),
      setCursor(['A', 'E']),
      categorize,
    ]

    const stateNew = reducerFlow(steps)(initialState())

    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')
    expect(exported).toBe(`- ${HOME_TOKEN}
  - A
    - =sort
      - Alphabetical
    - B
    - C
    - D
    - ${'' /* prevent trim_trailing_whitespace */}
      - E`)
  })
})

describe('context view', () => {
  it('categorize context', () => {
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
      setCursor(['a', 'm', 'b']),
      categorize,
    ]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - m
      - x
  - b
    - ${'' /* prevent trim_trailing_whitespace */}
      - m
        - y`)

    expectPathToEqual(stateNew, stateNew.cursor, ['a', 'm', ''])
  })

  it('categorize context subthought', () => {
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
      setCursor(['a', 'm', 'b', 'y']),
      categorize,
    ]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - m
      - x
  - b
    - m
      - ${''}
        - y`)
  })
})
