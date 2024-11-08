import { HOME_PATH, HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import expectPathToEqual from '../../test-helpers/expectPathToEqual'
import setCursor from '../../test-helpers/setCursorFirstMatch'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'
import importText from '../importText'
import newSubthought from '../newSubthought'
import newThought from '../newThought'
import subCategorizeAll from '../subCategorizeAll'
import toggleContextView from '../toggleContextView'

describe('normal view', () => {
  it('subcategorize multiple thoughts', () => {
    const steps = [newThought('a'), newSubthought('b'), newThought('c'), subCategorizeAll]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - ${'' /* prevent trim_trailing_whitespace */}
      - b
      - c`)
  })

  it('subcategorize multiple thoughts in the root', () => {
    const steps = [newThought('a'), newThought('b'), subCategorizeAll]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - ${'' /* prevent trim_trailing_whitespace */}
    - a
    - b`)
  })

  it('should do nothing with no cursor', () => {
    const steps = [newThought('a'), newSubthought('b'), setCursor(null), subCategorizeAll]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - b`)
  })

  it('set cursor on new empty thought', () => {
    const steps = [newThought('a'), newSubthought('a1'), newThought('a2'), subCategorizeAll]

    const stateNew = reducerFlow(steps)(initialState())

    expectPathToEqual(stateNew, stateNew.cursor, ['a', ''])
  })

  it('move all non meta thoughts and only allowed meta thoughts into new empty thought after subCategorizeAll', () => {
    const text = `
  - a
    - =archive
    - =bullet
    - =focus
    - =label
    - =note
    - =pin
    - =publish
    - =style
    - =view
    - c
    - d
    - e`

    const steps = [
      importText({
        text,
        path: HOME_PATH,
      }),
      setCursor(['a', 'c']),
      subCategorizeAll,
    ]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - ${'' /* prevent trim_trailing_whitespace */}
      - =style
      - =view
      - c
      - d
      - e
    - =archive
    - =bullet
    - =focus
    - =label
    - =note
    - =pin
    - =publish`)
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
      subCategorizeAll,
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

  it('subcategorize context subthoughts', () => {
    const text = `
      - a
        - m
          - x
      - b
        - m
          - y1
          - y2
    `
    const steps = [
      importText({ text }),
      setCursor(['a', 'm']),
      toggleContextView,
      setCursor(['a', 'm', 'b', 'y1']),
      subCategorizeAll,
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
        - y1
        - y2`)

    expectPathToEqual(stateNew, stateNew.cursor, ['a', 'm', 'b', ''])
  })
})
