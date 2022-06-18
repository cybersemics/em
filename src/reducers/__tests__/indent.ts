import { HOME_TOKEN } from '../../constants'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'
import exportContext from '../../selectors/exportContext'
import contextToPath from '../../selectors/contextToPath'
import indent from '../../reducers/indent'
import newSubthought from '../../reducers/newSubthought'
import newThought from '../../reducers/newThought'
import setCursor from '../../reducers/setCursor'

it('indent within root', () => {
  const steps = [newThought('a'), newThought('b'), indent]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - b`)
})

it('indent with no cursor should do nothing ', () => {
  const steps = [newThought('a'), newThought('b'), setCursor({ path: null }), indent]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
  - b`)
})

it('indent fully indented thought should do nothing ', () => {
  const steps = [newThought('a'), newSubthought('b'), indent]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - b`)
})

it('indent within context', () => {
  const steps = [newThought('a'), newSubthought('a1'), newThought('a2'), indent]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - a1
      - a2`)
})

it('indent on cursor thought should update cursor', () => {
  const steps = [newThought('a'), newSubthought('a1'), newThought('a2'), indent]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor).toMatchObject(contextToPath(stateNew, ['a', 'a1', 'a2'])!)
})
