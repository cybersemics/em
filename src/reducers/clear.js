import { ROOT_TOKEN, TUTORIAL_STEP4_END } from '../constants'
import { timestamp, resetTranslateContentIntoView } from '../util'
import { initialState } from '../store-utils'

export const clear = (state) => () => {
  localStorage.clear()
  localStorage['settings-dark'] = state.settings.dark
  localStorage['settings-tutorialStep'] = TUTORIAL_STEP4_END
  localStorage['helper-complete-welcome'] = true

  setTimeout(() => {
    window.scrollTo(0, 0)
    resetTranslateContentIntoView()
  })

  return Object.assign({}, initialState(), {
    'helper-complete-welcome': true,
    showHelper: null,
    // override welcome tutorial data
    data: {
      [ROOT_TOKEN]: {
        value: ROOT_TOKEN,
        memberOf: [],
        created: timestamp(),
        lastUpdated: timestamp()
      }
    },
    settings: {
      dark: state.settings.dark
    }
  })
}