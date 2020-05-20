import globals from '../globals'

import {
  ERROR_TIMEOUT,
} from '../constants'

/** Dispatches an error. */
export default error => (dispatch, getState) => {

  // clear the error in ERROR_TIMEOUT milliseconds
  if (error) {
    globals.errorTimer = window.setTimeout(() => {
      dispatch({ type: 'error', value: null })
    }, ERROR_TIMEOUT)
  }
  // if the error is being cleared manually, kill the timer
  else {
    window.clearTimeout(globals.errorTimer)
  }

  dispatch({ type: 'error', value: error })
}
