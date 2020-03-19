import { decode as firebaseDecode } from 'firebase-encode'
import { store } from '../store.js'
import { migrate } from '../migrations/index.js'

// constants
import {
  EMPTY_TOKEN,
  SCHEMA_HASHKEYS,
} from '../constants.js'

// util
import {
  equalPath,
  sync,
} from '../util.js'
import { updateThoughtIndex, updateContextIndex, bulkUpdateThoughtIndex, bulkUpdateContextIndex } from '../db.js'

/** Save all firebase state to state and localStorage. */
export const loadState = (newState, oldState) => {

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

  // thoughtIndex
  // keyRaw is firebase encoded
  const thoughtIndexUpdates = Object.keys(newState.thoughtIndex).reduce((accum, keyRaw) => {

    const key = newState.schemaVersion < SCHEMA_HASHKEYS
      ? (keyRaw === EMPTY_TOKEN ? '' : firebaseDecode(keyRaw))
      : keyRaw
    const thought = newState.thoughtIndex[keyRaw]
    const oldThought = oldState.thoughtIndex[key]
    const updated = thought && (!oldThought || thought.lastUpdated > oldThought.lastUpdated)

    if (updated) {
      // do not force render here, but after all values have been added
      updateThoughtIndex(key, thought)
    }

    return updated ? Object.assign({}, accum, {
      [key]: thought
    }) : accum
  }, {})

  bulkUpdateThoughtIndex(thoughtIndexUpdates)

  // contextEncodedRaw is firebase encoded
  const contextIndexUpdates = Object.keys(newState.contextIndex || {}).reduce((accum, contextEncodedRaw) => {

    const subthoughts = newState.contextIndex[contextEncodedRaw]
    const contextEncoded = newState.schemaVersion < SCHEMA_HASHKEYS
      ? (contextEncodedRaw === EMPTY_TOKEN ? ''
        : firebaseDecode(contextEncodedRaw))
      : contextEncodedRaw
    const subthoughtsOld = oldState.contextIndex[contextEncoded] || []

    // TODO: Add lastUpdated to contextIndex. Requires migration.
    // subthoughts.lastUpdated > oldSubthoughts.lastUpdated
    // technically subthoughts is a disparate list of ranked thought objects (as opposed to an intersection representing a single context), but equalPath works
    if (subthoughts && subthoughts.length > 0 && !equalPath(subthoughts, subthoughtsOld)) {

      return {
        ...accum,
        [contextEncoded]: subthoughts
      }
    }
    else {
      return accum
    }

  }, {})

  bulkUpdateContextIndex(contextIndexUpdates)

  // delete local contextIndex that no longer exists in firebase
  // only if remote was updated more recently than local since it is O(n)
  if (oldState.lastUpdated <= newState.lastUpdated) {
    Object.keys(oldState.contextIndex).forEach(contextEncoded => {
      if (!(contextEncoded in (newState.contextIndex || {}))) {
        contextIndexUpdates[contextEncoded] = null
      }
    })
  }

  if (Object.keys(thoughtIndexUpdates).length > 0) {
    store.dispatch({
      type: 'thoughtIndex',
      thoughtIndexUpdates,
      contextIndexUpdates,
      recentlyEdited: newState.recentlyEdited,
      ignoreNullThoughts: true,
      forceRender: true,
    })
  }
}

// migrate both the old state (local) and the new state (remote) before merging
export default newState => {

  const oldState = store.getState()
  const { schemaVersion: schemaVersionOriginal } = newState

  return Promise.all([
    migrate(newState),
    migrate(oldState),
  ])
    .then(([newStateMigrated, oldStateMigrated]) => {

      const { thoughtIndexUpdates, contextIndexUpdates, schemaVersion } = newStateMigrated

      // if the schema version changed, sync updates and pass the migrated state to loadState
      if (schemaVersion > schemaVersionOriginal) {
        sync(thoughtIndexUpdates, contextIndexUpdates, {
          updates: { schemaVersion }, state: true, local: true, forceRender: true, callback: () => {
            console.info('Remote migrations complete.')
          }
        })

        return [newStateMigrated, oldStateMigrated]
      }
      else {
        return [newState, oldState]
      }
    })
    .then(([newState, oldState]) => loadState(newState, oldState))
}
