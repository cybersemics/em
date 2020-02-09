import localForage from 'localforage'
import settings from '../reducers/settings.js'

// constants
import {
  SCHEMA_HASHKEYS as SCHEMA_FROM,
  SCHEMA_META_SETTINGS as SCHEMA_TO,
  TUTORIAL_STEP_START,
} from '../constants.js'

// util
import {
  sync,
} from '../util.js'

export const schemaVersionFrom = SCHEMA_FROM
export const schemaVersionTo = SCHEMA_TO

export const migrate = state => {
  // convert localForage settings into meta settings
  return Promise.all([
    localForage.getItem('dark'),
    localForage.getItem('scaleSize'),
    localForage.getItem('tutorial'),
    localForage.getItem('tutorialStep')
  ]).then(([dark, scaleSize, tutorial, tutorialStep]) => {

    // remove settings from state and remote
    sync({}, {}, { updates: {
      settings: null
    }})

    return {
      ...state,
      // tutorial
      ...(scaleSize
        ? settings(state, {
          key: 'Tutorial',
          value: tutorial ? 'On' : 'Off'
        })
        : null
      ),
      // tutorial step
      ...(scaleSize
        ? settings(state, {
          key: 'Tutorial Step',
          value: +tutorialStep || TUTORIAL_STEP_START
        })
        : null
      ),
      ...(scaleSize
        ? settings(state, {
          key: 'Font Size',
          value: scaleSize * 16
        })
        : null
      ),
      // only set a Theme if Light is specifically set
      ...(dark === false
        ? settings(state, {
          key: 'Theme',
          value: 'Light'
        })
        : null
      ),
      schemaVersion: schemaVersionTo,
    }
  })
}
