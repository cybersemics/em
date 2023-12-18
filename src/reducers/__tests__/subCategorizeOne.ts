import { HOME_TOKEN } from '../../constants'
import childIdsToThoughts from '../../selectors/childIdsToThoughts'
import exportContext from '../../selectors/exportContext'
import setCursor from '../../test-helpers/setCursorFirstMatch'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'
import importText from '../importText'
import newSubthought from '../newSubthought'
import newThought from '../newThought'
import subCategorizeOne from '../subCategorizeOne'
import toggleContextView from '../toggleContextView'

describe('normal view', () => {
  it('subcategorize a thought', () => {
    const steps = [newThought('a'), newSubthought('b'), subCategorizeOne]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - ${'' /* prevent trim_trailing_whitespace */}
      - b`)
  })

  it('subcategorize a thought in the root', () => {
    const steps = [newThought('a'), subCategorizeOne]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - ${'' /* prevent trim_trailing_whitespace */}
    - a`)
  })

  it('subcategorize with no cursor should do nothing', () => {
    const steps = [newThought('a'), newSubthought('b'), setCursor(null), subCategorizeOne]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - b`)
  })

  it('set cursor on new empty thought', () => {
    const steps = [newThought('a'), newSubthought('b'), subCategorizeOne]

    const stateNew = reducerFlow(steps)(initialState())

    const cursorThoughts = childIdsToThoughts(stateNew, stateNew.cursor!)

    expect(cursorThoughts).toMatchObject([
      { value: 'a', rank: 0 },
      { value: '', rank: -1 },
    ])
  })

  it('subcategorize within alphabteically sorted context', () => {
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
      subCategorizeOne,
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
  it('disallow subcategorize context', () => {
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
      subCategorizeOne,
    ]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - m
      - x
  - b
    - m
      - y`)
  })

  it('subcategorize context subthought', () => {
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
      subCategorizeOne,
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
