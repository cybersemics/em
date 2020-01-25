import * as localForage from 'localforage'
import { store } from '../store.js'
import { migrate } from '../migrations/index.js'
import loadThoughts from './loadThoughts.js'

// constants
import {
  SCHEMA_HASHKEYS,
  TUTORIAL_STEP_START,
} from '../constants.js'

// util
import {
  sync,
} from '../util.js'

/** Save all firebase state to state and localStorage. */
export default newState => {

  const oldState = store.getState()
  const settings = newState.settings || {}

  // settings
  // avoid unnecessary actions if values are identical
  if (settings.dark !== oldState.settings.dark) {
    store.dispatch({
      type: 'settings',
      key: 'dark',
      value: settings.dark || false,
      remote: false
    })
  }

  if (settings.tutorial !== oldState.settings.tutorial) {
    store.dispatch({
      type: 'settings',
      key: 'tutorial',
      value: settings.tutorial != null ? settings.tutorial : true,
      remote: false
    })
  }

  if (settings.tutorialStep !== oldState.settings.tutorialStep) {
    store.dispatch({
      type: 'settings',
      key: 'tutorialStep',
      value: settings.tutorialStep || TUTORIAL_STEP_START,
      remote: false
    })
  }

  // persist proseViews locally
  // TODO: handle merges
  Object.keys(newState.proseViews || {}).forEach(key => {
    if (newState.proseViews[key]) {
      localForage.setItem('proseViews-' + key, true)
    }
  })

  // delete local thoughts that no longer exists in firebase
  // only if remote was updated more recently than local since it is O(n)
  if (oldState.lastUpdated <= newState.lastUpdated) {
    Object.keys(oldState.thoughtIndex).forEach(key => {
      if (!(key in newState.thoughtIndex)) {
        // do not force render here, but after all values have been deleted
        store.dispatch({ type: 'deleteData', value: oldState.thoughtIndex[key].value })
      }
    })
  }

  loadThoughts(newState, oldState)

  // give time for loadThoughts to complete
  setTimeout(() => {
    const { schemaVersion: schemaVersionOld } = newState
    migrate(newState).then(({ thoughtIndexUpdates, contextIndexUpdates, schemaVersion }) => {

      // if the schema version changed, sync updates
      if (schemaVersion > schemaVersionOld) {
        sync(thoughtIndexUpdates, contextIndexUpdates, { updates: { schemaVersion: SCHEMA_HASHKEYS }, local: false, forceRender: true, callback: () => {
          console.info('Migrations complete.')
        } })
      }

    })
  }, 100)
}
