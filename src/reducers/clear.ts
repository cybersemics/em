import State from '../@types/State'
import Thunk from '../@types/Thunk'
import initialState from '../util/initialState'

interface Options {
  full?: boolean
}

/** Resets to initial state. By default excludes a few startup settings including login, loading, modal, and tutorial. Also triggers thoughtCache internal state reset in pullQueue. Use { full: true } to do a full clear to the initialState. */
const clear = (state: State, { full }: Options = {}): State => ({
  ...initialState(),
  ...(full
    ? null
    : {
        autologin: false,
        isLoading: false,
      }),
})

/** Action-creator for clear. */
export const clearActionCreator =
  (payload?: Parameters<typeof clear>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'clear', ...payload })

export default clear
