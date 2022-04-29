import { State } from '../../@types'
import { HOME_TOKEN, ROOT_PARENT_ID } from '../../constants'
import { createId } from '../createId'
import { contextToThoughtId } from '../contextToThoughtId'
import { initialState } from '../initialState'
import { timestamp } from '../timestamp'

it('hashContext', () => {
  const state = initialState()

  const ids = Array.from({ length: 5 }).map(() => createId())

  const updatedState: State = {
    ...state,
    thoughts: {
      ...state.thoughts,
      thoughtIndex: {
        ...state.thoughts.thoughtIndex,
        [HOME_TOKEN]: {
          id: HOME_TOKEN,
          children: [ids[0]],
          lastUpdated: timestamp(),
          value: HOME_TOKEN,
          rank: 0,
          parentId: ROOT_PARENT_ID,
          updatedBy: '',
        },
        [ids[0]]: {
          id: ids[0],
          value: 'A',
          children: [ids[1]],
          lastUpdated: timestamp(),
          rank: 0,
          parentId: HOME_TOKEN,
          updatedBy: '',
        },
        [ids[1]]: {
          id: ids[1],
          value: 'B',
          children: [],
          lastUpdated: timestamp(),
          parentId: ids[0],
          rank: 0,
          updatedBy: '',
        },
      },
    },
  }

  expect(contextToThoughtId(updatedState, ['A', 'B'])).toBe(ids[1])
})
