import { store } from '../store'
import globals from '../globals'

import {
  ERROR_TIMEOUT,
} from '../constants'

export const error = error => {

  // clear the error in ERROR_TIMEOUT milliseconds
  if (error) {
    globals.errorTimer = window.setTimeout(() => {
      store.dispatch({ type: 'error', value: null })
    }, ERROR_TIMEOUT)
  }
  // if the error is being cleared manually, kill the timer
  else {
    window.clearTimeout(globals.errorTimer)
  }

  store.dispatch({ type: 'error', value: error })
}
