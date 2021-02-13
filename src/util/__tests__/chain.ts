import { initialState, pathToContext, rankThoughtsSequential } from '../../util'
import { chain } from '../../selectors'
import { SimplePath } from '../../types'

it('single chain', () => {
  expect(chain(
    initialState(),
    [
      [{ value: 'a', rank: 0 }, { value: 'b', rank: 0 }] as SimplePath
    ],
    [{ value: 'a', rank: 0 }, { value: 'b', rank: 0 }, { value: 'c', rank: 0 }] as SimplePath
  )).toEqual([
    { value: 'a', rank: 0 },
    { value: 'b', rank: 0 },
    { value: 'a', rank: 0 },
    { value: 'c', rank: 0 }
  ])
})

it('multiple chains', () => {
  expect(pathToContext(chain(
    initialState(),
    [
      rankThoughtsSequential(['2', 'A']) as SimplePath,
      rankThoughtsSequential(['1', 'A', 'Nope']) as SimplePath,
    ],
    rankThoughtsSequential(['START', 'B', 'Nope', 'Butter', 'Bread']) as SimplePath
  ))).toEqual(['2', 'A', '1', 'Nope', 'B', 'Butter', 'Bread'])
})

it('match pivot value in plural form', () => {
  expect(pathToContext(chain(
    initialState(),
    [
      rankThoughtsSequential(['a', 'cats']),
    ],
    rankThoughtsSequential(['b', 'cat'])
  ))).toEqual(['a', 'cats', 'b'])
})
