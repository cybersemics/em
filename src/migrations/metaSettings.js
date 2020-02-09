import localForage from 'localforage'
import settings from '../reducers/settings.js'

// constants
import {
  EM_TOKEN,
  INITIAL_SETTINGS,
  SCHEMA_HASHKEYS as SCHEMA_FROM,
  SCHEMA_META_SETTINGS as SCHEMA_TO,
} from '../constants.js'

// util
import {
  importText,
  initialState,
  sync,
} from '../util.js'

export const schemaVersionFrom = SCHEMA_FROM
export const schemaVersionTo = SCHEMA_TO

export const migrate = state => {

  // convert localForage settings into meta settings
  // this also updates the remote
  return importText([{ value: EM_TOKEN, rank: 0 }], INITIAL_SETTINGS).then(({ thoughtIndexUpdates, contextIndexUpdates }) => {

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
      localForage.removeItem('settings-dark')
      localForage.removeItem('settings-scaleSize')
      localForage.removeItem('settings-tutorial')
      localForage.removeItem('settings-tutorialStep')
    })

    const stateUpdated = {

      // may only contains state from remote
      ...state,

      // merge initial settings thought structure
      thoughtIndex: {
        ...thoughtIndexUpdates,
        ...state.thoughtIndex
      },
      contextIndex: {
        ...contextIndexUpdates,
        ...state.contextIndex
      }
    }

    const stateUpdatedWithInitial = {

      // contains some state that is not on the remote
      ...initialState(),

      // may only contains state from remote
      ...stateUpdated,

    }

    return {
      ...stateUpdated,

      // copy prior settings

      // tutorial
      ...(state.settings && state.settings.tutorial != null
        ? settings(stateUpdatedWithInitial, {
          key: 'Tutorial',
          value: state.settings.tutorial ? 'On' : 'Off',
        })
        : null
      ),
      // tutorial step
      ...(state.settings && state.settings.tutorialStep
        ? settings(stateUpdatedWithInitial, {
          key: 'Tutorial Step',
          value: state.settings.tutorialStep,
        })
        : null
      ),
      ...(state.settings && state.settings.scaleSize
        ? settings(stateUpdatedWithInitial, {
          key: 'Font Size',
          value: state.settings.scaleSize * 16,
        })
        : null
      ),
      // only set a Theme if Light is specifically set
      ...(state.settings && state.settings.dark != null
        ? settings(stateUpdatedWithInitial, {
          key: 'Theme',
          value: state.settings.dark ? 'Dark' : 'Light',
        })
        : null
      ),
      schemaVersion: schemaVersionTo,
    }
  })
}
