import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import editThought, { editThoughtActionCreator } from '../actions/editThought'
import contextToPath from '../selectors/contextToPath'
import head from '../util/head'

/**
 * Edit thought at the given Context.
 *
 * @param at: Unranked path to the thought.
 *
 */
const editThoughtByContext = _.curryRight((state: State, context: string[], newValue: string) => {
  const path = contextToPath(state, context)
  if (!path) throw new Error(`Thought not found at context: ${context}`)
  return editThought(state, { path, oldValue: head(context), newValue })
})

/**
 * Edit thought at the given unranked path first matched.
 *
 * @param at: Unranked path to the thought.
 */
export const editThoughtByContextActionCreator = (
  context: string[],
  newValue: string,
  { rankInContext }: { rankInContext?: number } = {},
): Thunk => {
  return (dispatch, getState) => {
    const path = contextToPath(getState(), context)
    if (!path) throw new Error(`Thought not found at context: ${context}`)

    dispatch(
      editThoughtActionCreator({
        path,
        newValue,
        oldValue: head(context),
        rankInContext,
      }),
    )
  }
}

export default editThoughtByContext
