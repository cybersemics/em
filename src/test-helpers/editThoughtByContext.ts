import State from '../@types/State'
import ThoughtspaceTransaction from '../@types/ThoughtspaceTransaction'
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
function editThoughtByContext(
  state: State,
  context: string[],
  newValue: string,
  document?: ThoughtspaceTransaction,
): State
function editThoughtByContext(
  context: string[],
  newValue: string,
): (state: State, document?: ThoughtspaceTransaction) => State
/** Edits one context through the caller's transaction, preserving value-keyed fixture composition. */
function editThoughtByContext(
  stateOrContext: State | string[],
  contextOrValue: string[] | string,
  newValue?: string,
  document?: ThoughtspaceTransaction,
): State | ((state: State, document?: ThoughtspaceTransaction) => State) {
  if (Array.isArray(stateOrContext)) {
    return Object.assign(
      (state: State, transaction?: ThoughtspaceTransaction) =>
        editThoughtByContext(state, stateOrContext, contextOrValue as string, transaction),
      { requiresDocument: true as const },
    )
  }
  const context = contextOrValue as string[]
  const path = contextToPath(stateOrContext, context)
  if (!path) throw new Error(`Thought not found at context: ${context}`)
  return editThought(stateOrContext, { path, oldValue: head(context), newValue: newValue! }, document)
}

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

export default Object.assign(editThoughtByContext, { requiresDocument: true as const })
