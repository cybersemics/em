import State from '../@types/State'
import ThoughtspaceTransaction from '../@types/ThoughtspaceTransaction'
import Thunk from '../@types/Thunk'
import editThought, { editThoughtActionCreator } from '../actions/editThought'
import contextToPath from '../selectors/contextToPath'
import head from '../util/head'

/** Edits one context through the caller's transaction, preserving value-keyed fixture composition. */
const editThoughtByContext = (context: string[], newValue: string) =>
  Object.assign(
    (state: State, transaction?: ThoughtspaceTransaction): State => {
      const path = contextToPath(state, context)
      if (!path) throw new Error(`Thought not found at context: ${context}`)
      return editThought(state, { path, oldValue: head(context), newValue }, transaction)
    },
    { requiresDocument: true as const },
  )

/**
 * Edit thought at the given unranked path first matched.
 *
 * @param at: Unranked path to the thought.
 */
export const editThoughtByContextActionCreator = (context: string[], newValue: string): Thunk => {
  return (dispatch, getState) => {
    const path = contextToPath(getState(), context)
    if (!path) throw new Error(`Thought not found at context: ${context}`)

    dispatch(
      editThoughtActionCreator({
        path,
        newValue,
        oldValue: head(context),
      }),
    )
  }
}

export default editThoughtByContext
