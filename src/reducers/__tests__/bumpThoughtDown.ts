import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import expectPathToEqual from '../../test-helpers/expectPathToEqual'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'
import bumpThoughtDown from '../bumpThoughtDown'
import cursorBack from '../cursorBack'
import newSubthought from '../newSubthought'
import newThought from '../newThought'

it('bump leaf', () => {
  const steps = [newThought('a'), newSubthought('b'), bumpThoughtDown({})]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - ${''}
      - b`)
})

it('cursor should stay in empty thought', () => {
  const steps = [newThought('a'), newSubthought('b'), bumpThoughtDown({})]

  const stateNew = reducerFlow(steps)(initialState())

  expectPathToEqual(stateNew, stateNew.cursor, [
    { value: 'a', rank: 0 },
    { value: '', rank: -1 },
  ])
})

it('bump thought with children', () => {
  const steps = [newThought('a'), newSubthought('b'), newSubthought('c'), cursorBack, bumpThoughtDown({})]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - ${''}
      - b
      - c`)
})

it('bump thought with children multiple times', () => {
  const steps = [
    newThought('a'),
    newSubthought('b'),
    newSubthought('c'),
    cursorBack,
    bumpThoughtDown({}),
    bumpThoughtDown({}),
  ]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - ${''}
      - ${''}
      - b
      - c`)
})

it('bump root leaf', () => {
  const steps = [newThought('a'), bumpThoughtDown({})]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - ${''}
    - a`)
})

it('bump root thought with children', () => {
  const steps = [newThought('a'), newSubthought('b'), cursorBack, bumpThoughtDown({})]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - ${''}
    - a
    - b`)
})
