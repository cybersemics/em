// util
import {
  initialState,
} from '../util.js'

export default () => ({
  ...initialState(),
  isLoading: false,
  'modal-complete-welcome': true,
  showModal: null,
})
