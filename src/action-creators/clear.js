import { clearAll } from '../db'

import {
  EM_TOKEN,
  INITIAL_SETTINGS,
} from '../constants.js'

// util
import {
  importText,
} from '../util.js'

// action-creators
import clear from '../action-creators/clear'

export default () => dispatch => {
  clearAll().catch(err => {
    throw new Error(err)
  })

  dispatch(clear())

  setTimeout(() => {
    importText([{ value: EM_TOKEN, rank: 0 }], INITIAL_SETTINGS)
    window.scrollTo(0, 0)
  })
}
