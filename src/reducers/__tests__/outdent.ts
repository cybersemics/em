import { HOME_TOKEN } from '../../constants'
import contextToPath from '../../selectors/contextToPath'
import exportContext from '../../selectors/exportContext'
import setCursor from '../../test-helpers/setCursorFirstMatch'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'
import importText from '../importText'
import newSubthought from '../newSubthought'
import newThought from '../newThought'
import outdent from '../outdent'
import toggleContextView from '../toggleContextView'

describe('normal view', () => {
  it('outdent within root', () => {
    const steps = [newThought('a'), newSubthought('a1'), outdent]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - a
  - a1`)
  })

  it('outdent with no cursor should do nothing ', () => {
    const steps = [newThought('a'), newSubthought('a1'), setCursor(null), outdent]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - a1`)
  })

  it('outdent root thought should do nothing ', () => {
    const steps = [newThought('a'), newThought('b'), outdent]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - a
  - b`)
  })

  it('outdent grandchild', () => {
    const steps = [newThought('a'), newSubthought('a1'), newSubthought('a2'), outdent]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - a1
    - a2`)
  })

  it('preserve cursor', () => {
    const steps = [newThought('a'), newSubthought('a1'), newSubthought('a2'), outdent]

    const stateNew = reducerFlow(steps)(initialState())

    expect(stateNew.cursor).toMatchObject(contextToPath(stateNew, ['a', 'a2'])!)
  })
})

describe('context view', () => {
  it('outdent context view', () => {
    const text = `
      - a
        - m
          - x
      - b
        - m
          - y
    `
    const steps = [importText({ text }), setCursor(['a', 'm']), toggleContextView, outdent]

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

  it('outdent context should do nothing', () => {
    const text = `
      - a
        - m
          - x
      - b
        - m
          - y
    `
    const steps = [importText({ text }), setCursor(['a', 'm']), toggleContextView, setCursor(['a', 'm', 'b']), outdent]

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

  it('outdent subthought of context should do nothing', () => {
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
      setCursor(['a', 'm', 'b', 'x']),
      outdent,
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
})
