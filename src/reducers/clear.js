// util
import {
  initialState,
} from '../util'

/** Resets to initial state, excluding a few UI settings that are preserved. */
export default () => ({
  ...initialState(),
  autologin: false,
  isLoading: false,
  'modal-complete-welcome': true,
  showModal: null,
  tutorial: false,
})
