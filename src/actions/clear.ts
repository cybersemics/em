import State from '../@types/State'
import ThoughtspaceTransaction from '../@types/ThoughtspaceTransaction'
import Thunk from '../@types/Thunk'
import { HOME_PATH, HOME_TOKEN } from '../constants'
import { getAllChildren } from '../selectors/getChildren'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import command from '../util/command'
import initialState from '../util/initialState'
import reducerFlow from '../util/reducerFlow'
import deleteThought from './deleteThought'

/** Resets UI state without deleting the document unless local or remote clearing is explicitly requested. */
const clear = (
  state: State,
  options: {
    /** Clear all thoughts from IndexedDB. */
    local?: boolean
    /** Clear all thoughts from the server. */
    remote?: boolean
    /** Set autologin and isLoading to true. */
    full?: boolean
  },
  document?: ThoughtspaceTransaction,
): State => {
  // TODO: Properly type options to be optional without breaking curryReducer.
  const full = !!options?.full
  const local = !!options?.local
  const remote = !!options?.remote

  return reducerFlow([
    // Clear navigation selection before deleting thoughts so updateThoughts does not expand stale paths.
    state => ({
      ...state,
      cursor: null,
      multicursors: {},
    }),
    // A UI reset is not an eviction or document mutation.
    ...(local || remote
      ? getAllChildren(state, HOME_TOKEN).map(childId =>
          deleteThought({ local, remote, pathParent: HOME_PATH, thoughtId: childId }),
        )
      : []),
    // reset state
    state => ({
      ...initialState(),
      thoughts: state.thoughts,
      // by default, do not reset autologin and isLoading
      ...(full ? {} : { autologin: false, isLoading: false }),
    }),
  ])(state, document)
}

/** Action-creator for clear. */
export const clearActionCreator =
  (payload?: Parameters<typeof clear>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'clear', ...payload })

export default command(clear)

// Register this action's metadata
registerActionMetadata('clear', {
  undoable: false,
})
