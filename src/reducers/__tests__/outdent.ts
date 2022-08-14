import { HOME_TOKEN } from '../../constants'
import contextToPath from '../../selectors/contextToPath'
import exportContext from '../../selectors/exportContext'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'
import newSubthought from '../newSubthought'
import newThought from '../newThought'
import outdent from '../outdent'
import setCursor from '../setCursor'

it('outdent within root', () => {
  const steps = [newThought('a'), newSubthought('a1'), outdent]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
  - a1`)
})

it('outdent with no cursor should do nothing ', () => {
  const steps = [newThought('a'), newSubthought('a1'), setCursor({ path: null }), outdent]

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

it('outdent within context', () => {
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
