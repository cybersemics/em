import { HOME_PATH, HOME_TOKEN } from '../../constants'
import { exportContext } from '../../selectors'
import setCursorFirstMatch from '../../test-helpers/setCursorFirstMatch'
import { initialState, reducerFlow } from '../../util'
import importText from '../importText'
// reducers
import newSubthought from '../newSubthought'
import newThought from '../newThought'
import setCursor from '../setCursor'
import subCategorizeAll from '../subCategorizeAll'

it('subcategorize multiple thoughts', () => {
  const steps = [newThought('a'), newSubthought('b'), newThought('c'), subCategorizeAll]

  // run steps through reducer flow and export as plaintext for readable test
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

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - ${'' /* prevent trim_trailing_whitespace */}
    - a
    - b`)
})

it('should do nothing with no cursor', () => {
  const steps = [newThought('a'), newSubthought('b'), setCursor({ path: null }), subCategorizeAll]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - b`)
})

it('set cursor on new empty thought', () => {
  const steps = [newThought('a'), newSubthought('a1'), newThought('a2'), subCategorizeAll]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor).toMatchObject([
    { value: 'a', rank: 0 },
    { value: '', rank: -1 },
  ])
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
    setCursorFirstMatch(['a', 'c']),
    subCategorizeAll,
  ]

  // run steps through reducer flow and export as plaintext for readable test
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
