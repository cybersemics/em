import { initialState } from '../util'

/** Resets to initial state, excluding a few UI settings that are preserved. */
const clear = () => ({
  ...initialState(),
  autologin: false,
  isLoading: false,
  'modal-complete-welcome': true,
  showModal: null,
  tutorial: false,
})

export default clear
