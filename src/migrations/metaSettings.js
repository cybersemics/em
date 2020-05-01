// constants
import {
  EM_TOKEN,
  INITIAL_SETTINGS,
  SCHEMA_HASHKEYS as SCHEMA_FROM,
  SCHEMA_META_SETTINGS as SCHEMA_TO,
} from '../constants'

// util
import {
  importText,
  sync,
} from '../util'

export const schemaVersionFrom = SCHEMA_FROM
export const schemaVersionTo = SCHEMA_TO

export const migrate = state => {

  // this also updates the remote
  return importText([{ value: EM_TOKEN, rank: 0 }], INITIAL_SETTINGS, { preventSync: true }).then(({ thoughtIndexUpdates, contextIndexUpdates }) => {

    // remove old settings from state, local, and remote
    sync({}, {}, {
      updates: {
        settings: null
      }
    }).then(() => {
      localStorage.removeItem('settings-dark')
      localStorage.removeItem('settings-scaleSize')
      localStorage.removeItem('settings-tutorial')
      localStorage.removeItem('settings-tutorialStep')

      if (state.settings && state.settings.dark != null) {
        localStorage.setItem('Settings/Theme', state.settings.dark ? 'Dark' : 'Light')
      }
      if (state.settings && state.settings.scaleSize) {
        localStorage.setItem('Settings/Font Size', state.settings.scaleSize * 16)
      }
      if (state.settings && state.settings.tutorial != null) {
        localStorage.setItem('Settings/Tutorial', state.settings.tutorial ? 'On' : 'Off')
      }
      if (state.settings && state.settings.tutorialStep) {
        localStorage.setItem('Settings/Tutorial Step', state.settings.tutorialStep)
      }
    })

    const stateUpdated = {

      // may only contains state from remote
      ...state,

      // merge initial settings thought structure
      thoughtIndex: {
        ...state.thoughtIndex,
        ...thoughtIndexUpdates,
      },
      contextIndex: {
        ...state.contextIndex,
        ...contextIndexUpdates,
      }
    }

    return {
      ...stateUpdated,
      schemaVersion: schemaVersionTo,
    }
  })
}
