import importText from '../../actions/importText'
import newThought from '../../actions/newThought'
import toggleHiddenThoughts from '../../actions/toggleHiddenThoughts'
import { HOME_TOKEN } from '../../constants'
import { getChildren, getSortComparator } from '../../selectors/getChildren'
import contextToThought from '../../test-helpers/contextToThought'
import initStore from '../../test-helpers/initStore'
import reducerFlow from '../../test-helpers/reducerFlow'
import waitForThoughtspaceIdle from '../../test-helpers/waitForThoughtspaceIdle'
import initialState from '../../util/initialState'

beforeEach(initStore)
afterEach(waitForThoughtspaceIdle)

describe('get visible children', () => {
  it('when showHiddenThoughts is off', () => {
    const steps = [newThought('a'), newThought('=b')]

    const stateNew = reducerFlow(steps)(initialState())

    expect(getChildren(stateNew, HOME_TOKEN)).toMatchObject([{ value: 'a' }])
  })

  it('when showHiddenThoughts is off', () => {
    const steps = [newThought('a'), newThought('=b'), toggleHiddenThoughts]

    const stateNew = reducerFlow(steps)(initialState())

    expect(getChildren(stateNew, HOME_TOKEN)).toMatchObject([{ value: 'a' }, { value: '=b' }])
  })
})

it.each([
  ['Created', 'Asc'],
  ['Created', 'Desc'],
  ['Updated', 'Asc'],
  ['Updated', 'Desc'],
  ['Note', 'Asc'],
  ['Note', 'Desc'],
])('keeps canonical sibling order when %s %s sort keys are equal', (type, direction) => {
  const state = reducerFlow([
    importText({
      text: `
        - =sort
          - ${type}
            - ${direction}
        - x
          - =note
            - same note
        - y
          - =note
            - same note
      `,
    }),
  ])(initialState())
  const x = contextToThought(state, ['x'])!
  const y = contextToThought(state, ['y'])!
  const compare = getSortComparator(state, HOME_TOKEN)!

  expect(compare(x, y)).toBe(-1)
  expect(compare(y, x)).toBe(1)
  expect(compare(x, x)).toBe(0)
})
