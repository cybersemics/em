import { initialState, pathToContext, rankThoughtsSequential } from '../../util'
import { chain } from '../../selectors'

it('single chain', () => {
  expect(chain(
    initialState(),
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
    initialState(),
    [
      rankThoughtsSequential(['2', 'A']),
      rankThoughtsSequential(['1', 'A', 'Nope']),
    ],
    rankThoughtsSequential(['START', 'B', 'Nope', 'Butter', 'Bread'])
  ))).toEqual(['2', 'A', '1', 'Nope', 'B', 'Butter', 'Bread'])
})

it('chain with circular paths', () => {

  /*
    Circular path
    - a
      - b
        - c
            - d
                - c ~
                    - a.b.c
                    - a.b.c.d.c (cursor) Here the last `c` is the pivot value.
  */

  expect(pathToContext(chain(
    initialState(),
    [
      rankThoughtsSequential(['a', 'b', 'c', 'd', 'c']),
    ],
    rankThoughtsSequential(['a', 'b', 'c', 'd', 'c']),
    4 // index of the pivot value in the child of the context view (in this case cursor)
  ))).toEqual(['a', 'b', 'c', 'd', 'c', 'd'])
})
