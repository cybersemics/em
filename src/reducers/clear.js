import * as localForage from 'localforage'

// constants
import {
  EM_TOKEN,
  INITIAL_SETTINGS,
} from '../constants.js'

// util
import {
  importText,
  initialState,
} from '../util.js'

// SIDE EFFECTS: scroll
// preserves some settings
export default state => {
  localForage.clear().catch(err => {
    throw new Error(err)
  })

  setTimeout(() => {
    importText([{ value: EM_TOKEN, rank: 0 }], INITIAL_SETTINGS)
    window.scrollTo(0, 0)
  })

  return {
    ...initialState(),
    'modal-complete-welcome': true,
    showModal: null,
    isLoading: false,
  }
}
