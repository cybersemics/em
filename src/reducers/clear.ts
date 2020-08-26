import { State, initialState } from '../util/initialState'

interface Options {
  full?: boolean,
}

/** Resets to initial state. By default excludes a few startup settings including login, loading, modal, and tutorial. Use { full: true } to do a full clear to the initialState. */
const clear = (state: State, { full }: Options = {}) => ({
  ...initialState(),
  ...full ? null : {
    autologin: false,
    isLoading: false,
    'modal-complete-welcome': true,
    showModal: null,
    tutorial: false,
  }
})

export default clear
