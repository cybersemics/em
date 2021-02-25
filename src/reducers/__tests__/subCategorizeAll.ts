import { HOME_TOKEN } from '../../constants'
import { initialState, reducerFlow } from '../../util'
import { exportContext } from '../../selectors'

// reducers
import newSubthought from '../newSubthought'
import newThought from '../newThought'
import subCategorizeAll from '../subCategorizeAll'
import setCursor from '../setCursor'
import cursorBack from '../cursorBack'

it('subcategorize multiple thoughts', () => {

  const steps = [
    newThought('a'),
    newSubthought('b'),
    newThought('c'),
    subCategorizeAll,

  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - ${''/* prevent trim_trailing_whitespace */}
      - b
      - c`)

})

it('subcategorize multiple thoughts in the root', () => {

  const steps = [
    newThought('a'),
    newThought('b'),
    subCategorizeAll,

  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - ${''/* prevent trim_trailing_whitespace */}
    - a
    - b`)

})

it('should do nothing with no cursor', () => {

  const steps = [
    newThought('a'),
    newSubthought('b'),
    setCursor({ path: null }),
    subCategorizeAll,

  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - b`)

})

it('set cursor on new empty thought', () => {

  const steps = [
    newThought('a'),
    newSubthought('a1'),
    newThought('a2'),
    subCategorizeAll,

  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor)
    .toMatchObject([{ value: 'a', rank: 0 }, { value: '', rank: -1 }])

})

it('move all visible and hidden thoughts into a new empty thought after subcategorizeAll', () => {

  const steps = [
    newThought('b'),
    newSubthought('=archive'),
    newThought('c'),
    newSubthought('d'),
    cursorBack,
    subCategorizeAll
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  const expectedOutput = `- ${HOME_TOKEN}
  - b
    -${' '}
      - =archive
      - c
        - d`

  expect(exported).toEqual(expectedOutput)
})
