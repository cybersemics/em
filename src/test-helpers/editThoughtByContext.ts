import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import editThoughtThunk from '../action-creators/editThought'
import editThought, { editThoughtPayload } from '../reducers/editThought'
import contextToPath from '../selectors/contextToPath'

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

    return editThought(state, {
      ...payload,
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

    dispatch(
      editThoughtThunk({
        ...payload,
        path,
      }),
    )
  }
}

export default editThoughtByContext
