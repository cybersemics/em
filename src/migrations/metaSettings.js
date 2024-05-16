import { importTextActionCreator as importText } from '../actions/importText'
import {
  EM_TOKEN,
  INITIAL_SETTINGS,
  SCHEMA_HASHKEYS as SCHEMA_FROM,
  SCHEMA_META_SETTINGS as SCHEMA_TO,
} from '../constants'
import store from '../stores/app'
import push from '../util/push'
import storage from '../util/storage'

export const schemaVersionFrom = SCHEMA_FROM
export const schemaVersionTo = SCHEMA_TO

/** Migrates the settings to metaprogramming attributes. */
export const migrate = async state => {
  const { lexemeIndexUpdates, thoughtIndexUpdates } = store.dispatch(
    importText({
      path: [{ value: EM_TOKEN, rank: 0 }],
      text: INITIAL_SETTINGS,
      preventSync: true,
    }),
  )

  // remove old settings from state, local, and remote
  push(
    {},
    {},
    {
      updates: {
        settings: null,
      },
    },
  ).then(() => {
    storage.removeItem('settings-dark')
    storage.removeItem('settings-scaleSize')
    storage.removeItem('settings-tutorial')
    storage.removeItem('settings-tutorialStep')

    if (state.settings && state.settings.dark != null) {
      storage.setItem('Settings/Theme', state.settings.dark ? 'Dark' : 'Light')
    }
    if (state.settings && state.settings.tutorial != null) {
      storage.setItem('Settings/Tutorial', state.settings.tutorial ? 'On' : 'Off')
    }
    if (state.settings && state.settings.tutorialStep) {
      storage.setItem('Settings/Tutorial Step', state.settings.tutorialStep)
    }
  })

  const stateUpdated = {
    // may only contains state from remote
    ...state,

    // merge initial settings thought structure
    thoughts: {
      ...state.thoughts,
      thoughtIndex: {
        ...state.thoughts.thoughtIndex,
        ...thoughtIndexUpdates,
      },
      lexemeIndex: {
        ...state.thoughts.lexemeIndex,
        ...lexemeIndexUpdates,
      },
    },
  }

  return {
    ...stateUpdated,
    schemaVersion: schemaVersionTo,
  }
}
