import { store } from '../../store'

// util
import {
  pathToContext,
  rankThoughtsSequential,
} from '../../util'

// selectors
import {
  chain,
} from '../../selectors'

it('single chain', () => {
  expect(chain(
    store.getState(),
    [
      [{ value: 'a', rank: 0 }, { value: 'b', rank: 0 }]
    ],
    [{ value: 'a', rank: 0 }, { value: 'b', rank: 0 }, { value: 'c', rank: 0 }]
  )).toEqual([
    { value: 'a', rank: 0 },
    { value: 'b', rank: 0 },
    { value: 'a', rank: 0 },
    { value: 'c', rank: 0 }
  ])
})

it('multiple chains', () => {
  expect(pathToContext(chain(
    store.getState(),
    [
      rankThoughtsSequential(['2', 'A']),
      rankThoughtsSequential(['1', 'A', 'Nope']),
    ],
    rankThoughtsSequential(['START', 'B', 'Nope', 'Butter', 'Bread'])
  ))).toEqual(['2', 'A', '1', 'Nope', 'B', 'Butter', 'Bread'])
})
