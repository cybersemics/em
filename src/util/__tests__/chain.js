import {
  chain,
  pathToContext,
  rankThoughtsSequential,
} from '../../util'

it('single chain', () => {
  expect(chain(
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
    [
      rankThoughtsSequential(['2', 'A']),
      rankThoughtsSequential(['1', 'A', 'Nope']),
    ],
    rankThoughtsSequential(['START', 'B', 'Nope', 'Butter', 'Bread'])
  ))).toEqual(['2', 'A', '1', 'Nope', 'B', 'Butter', 'Bread'])
})
