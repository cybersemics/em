import { AlertType, HOME_TOKEN } from '../../constants'
import childIdsToThoughts from '../../selectors/childIdsToThoughts'
import exportContext from '../../selectors/exportContext'
import addMulticursorAtFirstMatch from '../../test-helpers/addMulticursorAtFirstMatch'
import setCursor from '../../test-helpers/setCursorFirstMatch'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'
import importText from '../importText'
import newThought from '../newThought'
import subcategorizeMulticursor from '../subcategorizeMulticursor'

describe('subcategorizeMulticursor', () => {
  it('subcategorize multiple thoughts', () => {
    const steps = [
      newThought('a'),
      newThought('b'),
      newThought('c'),
      newThought('d'),
      addMulticursorAtFirstMatch(['b']),
      addMulticursorAtFirstMatch(['c']),
      subcategorizeMulticursor,
    ]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - a
  - ${'' /* prevent trim_trailing_whitespace */}
    - b
    - c
  - d`)
  })

  it('set cursor on new empty thought', () => {
    const steps = [
      newThought('a'),
      newThought('b'),
      newThought('c'),
      setCursor(['b']),
      addMulticursorAtFirstMatch(['c']),
      subcategorizeMulticursor,
    ]

    const stateNew = reducerFlow(steps)(initialState())

    const cursorThoughts = childIdsToThoughts(stateNew, stateNew.cursor!)

    expect(cursorThoughts).toMatchObject([{ value: '', rank: expect.any(Number) }])
  })

  it('disallow subcategorizing thoughts from different parents', () => {
    const steps = [
      importText({
        text: `
        - a
          - b
        - c`,
      }),
      setCursor(['a', 'b']),
      addMulticursorAtFirstMatch(['a', 'b']),
      addMulticursorAtFirstMatch(['c']),
      subcategorizeMulticursor,
    ]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - b
  - c`)

    expect(stateNew.alert).toMatchObject({
      alertType: AlertType.MulticursorError,
      value: 'Cannot subcategorize thoughts from different parents.',
    })
  })

  it('subcategorize within alphabetically sorted context', () => {
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
      setCursor(['A', 'C']),
      addMulticursorAtFirstMatch(['A', 'C']),
      addMulticursorAtFirstMatch(['A', 'D']),
      subcategorizeMulticursor,
    ]

    const stateNew = reducerFlow(steps)(initialState())

    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')
    expect(exported).toBe(`- ${HOME_TOKEN}
  - A
    - =sort
      - Alphabetical
    - B
    - ${'' /* prevent trim_trailing_whitespace */}
      - C
      - D
    - E`)
  })
})
