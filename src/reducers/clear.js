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

let test = 'Will you LET me?'

// SIDE EFFECTS: localStorage, scroll
// preserves some settings
export const clear = state => {
  localStorage.clear()
  localStorage['settings-dark'] = state.settings.dark
  localStorage['settings-tutorialStep'] = TUTORIAL_STEP_NONE
  localStorage['helper-complete-welcome'] = true

  setTimeout(() => {
    window.scrollTo(0, 0)
  })

  return Object.assign({}, initialState(), {
    'helper-complete-welcome': true,
    showHelper: null,
    // override welcome tutorial data
    data: {
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
