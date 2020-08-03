import { initialState } from '../util'

/** Resets to initial state, excluding a few UI settings that are preserved. Also triggers thoughtCache internal state reset in thoughtCacheMiddleware. */
const clear = () => ({
  ...initialState(),
  autologin: false,
  isLoading: false,
  'modal-complete-welcome': true,
  showModal: null,
  tutorial: false,
})

export default clear
