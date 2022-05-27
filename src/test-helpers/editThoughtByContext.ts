import { contextToPath } from '../selectors'

import { State, Thunk } from '../@types'
import editThought, { editThoughtPayload } from '../reducers/editThought'
import _ from 'lodash'
import { parentOf } from '../util'
import { HOME_TOKEN } from '../constants'
import { editThought as editThoughtThunk } from '../action-creators'

/**
 * Edit thought at the given Context.
 *
 * @param at: Unranked path to the thought.
 *
 */
const editThoughtByContext = _.curryRight(
  (state: State, payload: Omit<editThoughtPayload, 'context' | 'path'> & { at: string[] }) => {
    const path = contextToPath(state, payload.at)
    if (!path) throw new Error(`Ranked thoughts not found for context: ${payload.at}`)

    const context = payload.at.length > 1 ? parentOf(payload.at) : [HOME_TOKEN]

    return editThought(state, {
      ...payload,
      context,
      path,
    })
  },
)

/**
 * Edit thought at the given unranked path first matched.
 *
 * @param at: Unranked path to the thought.
 */
export const editThoughtByContextActionCreator = (
  payload: Omit<editThoughtPayload, 'context' | 'path'> & { at: string[] },
): Thunk => {
  return (dispatch, getState) => {
    const path = contextToPath(getState(), payload.at)
    if (!path) throw new Error(`Ranked thoughts not found for context: ${payload.at}`)

    const context = payload.at.length > 1 ? parentOf(payload.at) : [HOME_TOKEN]

    dispatch(
      editThoughtThunk({
        ...payload,
        context,
        path,
      }),
    )
  }
}

export default editThoughtByContext
