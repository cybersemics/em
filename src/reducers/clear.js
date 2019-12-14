import * as localForage from 'localforage'

// constants
import {
  ROOT_TOKEN,
  TUTORIAL_STEP_NONE,
} from '../constants.js'

// util
import {
  initialState,
  hashThought,
  timestamp,
} from '../util.js'

// SIDE EFFECTS: localStorage, scroll
// preserves some settings
export const clear = state => {
  localForage.clear().then(() =>
    Promise.all([
      localForage.setItem('settings-dark', state.settings.dark),
      localStorage.setItem('settings-tutorialStep', TUTORIAL_STEP_NONE),
      localStorage.setItem('modal-complete-welcome', true),
    ])
  ).catch(err => {
    throw new Error(err)
  })

  setTimeout(() => {
    window.scrollTo(0, 0)
  })

  return Object.assign({}, initialState(), {
    'modal-complete-welcome': true,
    showModal: null,
    isLoading: false,
    // override welcome tutorial thoughtIndex
    thoughtIndex: {
      [hashThought(ROOT_TOKEN)]: {
        value: ROOT_TOKEN,
        memberOf: [],
        created: timestamp(),
        lastUpdated: timestamp()
      }
    },
    settings: {
      dark: state.settings.dark,
      tutorialStep: TUTORIAL_STEP_NONE
    }
  })
}
