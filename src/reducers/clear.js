// util
import {
  initialState,
} from '../util'

// preserves some settings
export default () => ({
  ...initialState(),
  autologin: false,
  isLoading: false,
  'modal-complete-welcome': true,
  showModal: null,
  tutorial: false,
})
