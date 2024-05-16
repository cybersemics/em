import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { HOME_PATH, HOME_TOKEN } from '../constants'
import { getAllChildren } from '../selectors/getChildren'
import initialState from '../util/initialState'
import reducerFlow from '../util/reducerFlow'
import deleteThought from './deleteThought'

/** Resets to initial state. By default excludes a few startup settings including login, loading, modal, and tutorial. Also triggers thoughtCache internal state reset in pullQueue. Use { full: true } to do a full clear to the initialState. */
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
): State => {
  // TODO: Properly type options to be optional without breaking curryReducer.
  const full = !!options?.full
  const local = !!options?.local
  const remote = !!options?.remote

  return reducerFlow([
    // delete all thoughts
    ...getAllChildren(state, HOME_TOKEN).map(childId =>
      deleteThought({ local: local, remote: remote, pathParent: HOME_PATH, thoughtId: childId }),
    ),
    // reset state
    state => ({
      ...initialState(),
      // preserve pushQueue, otherwise local + remote changes will not be pushed
      pushQueue: local && remote ? state.pushQueue : [],
      // by default, do not reset autologin and isLoading
      ...(full ? {} : { autologin: false, isLoading: false }),
    }),
  ])(state)
}

/** Action-creator for clear. */
export const clearActionCreator =
  (payload?: Parameters<typeof clear>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'clear', ...payload })

export default clear
