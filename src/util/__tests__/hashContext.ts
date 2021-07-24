import { State } from '../../@types'
import { HOME_TOKEN } from '../../constants'
import { createId } from '../createId'
import { hashContext } from '../hashContext'
import { initialState } from '../initialState'
import { timestamp } from '../timestamp'

it('hashContext', () => {
  const state = initialState()

  const ids = Array.from({ length: 5 }).map(() => createId())

  const updatedState: State = {
    ...state,
    thoughts: {
      ...state.thoughts,
      contextIndex: {
        ...state.thoughts.contextIndex,
        [HOME_TOKEN]: {
          id: HOME_TOKEN,
          children: [
            {
              id: ids[0],
              value: 'A',
              rank: 0,
            },
          ],
          context: [],
          lastUpdated: timestamp(),
          value: HOME_TOKEN,
        },
        [ids[0]]: {
          id: ids[0],
          value: 'A',
          children: [
            {
              id: ids[1],
              value: 'B',
              rank: 0,
            },
          ],
          context: [HOME_TOKEN],
          lastUpdated: timestamp(),
        },
        [ids[1]]: {
          id: ids[1],
          value: 'B',
          children: [],
          context: ['A'],
          lastUpdated: timestamp(),
        },
      },
    },
  }

  expect(hashContext(updatedState, ['A', 'B'])).toBe(ids[1])
})
