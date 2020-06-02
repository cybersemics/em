import { decode as firebaseDecode } from 'firebase-encode'
import { store } from '../store'
import { migrate } from '../migrations/index'
import { updateContextIndex, updateThoughtIndex } from '../db'

// constants
import {
  EMPTY_TOKEN,
  SCHEMA_HASHKEYS,
} from '../constants'

// util
import {
  equalPath,
  logWithTime,
} from '../util'

/** Save all firebase state to state and localStorage. */
export const loadState = (newState, oldState) => {

  // delete local thoughts that no longer exists in firebase
  // only if remote was updated more recently than local since it is O(n)
  if (oldState.lastUpdated <= newState.lastUpdated) {
    Object.keys(oldState.thoughts.thoughtIndex).forEach(key => {
      if (!(key in newState.thoughts.thoughtIndex)) {
        // do not force render here, but after all values have been deleted
        store.dispatch({ type: 'deleteData', value: oldState.thoughts.thoughtIndex[key].value })
      }
    })
  }

  logWithTime('loadRemoteState: local thoughtIndex entries deleted')

  // thoughtIndex
  // keyRaw is firebase encoded
  const thoughtIndexUpdates = Object.keys(newState.thoughts.thoughtIndex).reduce((accum, keyRaw) => {

    const key = newState.schemaVersion < SCHEMA_HASHKEYS
      ? keyRaw === EMPTY_TOKEN ? '' : firebaseDecode(keyRaw)
      : keyRaw
    const thought = newState.thoughts.thoughtIndex[keyRaw]
    const oldThought = oldState.thoughts.thoughtIndex[key]
    const updated = thought && (!oldThought || thought.lastUpdated > oldThought.lastUpdated)

    return updated ? Object.assign({}, accum, {
      [key]: thought
    }) : accum
  }, {})

  logWithTime('loadRemoteState: thoughtIndexUpdates generated')

  updateThoughtIndex(thoughtIndexUpdates)

  logWithTime('loadRemoteState: updateThoughtIndex')

  // contextEncodedRaw is firebase encoded
  const contextIndexUpdates = Object.keys(newState.thoughts.contextIndex || {}).reduce((accum, contextEncodedRaw) => {

    const subthoughts = newState.thoughts.contextIndex[contextEncodedRaw]
    const contextEncoded = newState.schemaVersion < SCHEMA_HASHKEYS
      ? contextEncodedRaw === EMPTY_TOKEN ? ''
      : firebaseDecode(contextEncodedRaw)
      : contextEncodedRaw
    const subthoughtsOld = oldState.thoughts.contextIndex[contextEncoded] || []

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

  logWithTime('loadRemoteState: contextIndexUpdates generated')

  updateContextIndex(contextIndexUpdates)

  logWithTime('loadRemoteState: updateContextIndex')

  // delete local contextIndex that no longer exists in firebase
  // only if remote was updated more recently than local since it is O(n)
  if (oldState.lastUpdated <= newState.lastUpdated) {
    Object.keys(oldState.thoughts.contextIndex).forEach(contextEncoded => {
      if (!(contextEncoded in (newState.thoughts.contextIndex || {}))) {
        contextIndexUpdates[contextEncoded] = null
      }
    })
  }

  logWithTime('loadRemoteState: local contextIndex entries deleted')

  if (Object.keys(thoughtIndexUpdates).length > 0) {
    logWithTime('updateThoughts')
    store.dispatch({
      type: 'updateThoughts',
      thoughtIndexUpdates,
      contextIndexUpdates,
      recentlyEdited: newState.recentlyEdited,
      forceRender: true,
    })
  }

  logWithTime('loadRemoteState: updateThoughts')
}

/** Migrates both the old state (local) and the new state (remote) before merging. */
export default newState => (dispatch, getState) => {

  const oldState = getState()
  const { schemaVersion: schemaVersionOriginal } = newState

  return Promise.all([
    migrate(newState),
    migrate(oldState),
  ])
    .then(([newStateMigrated, oldStateMigrated]) => {
      logWithTime('loadRemoteState: migrated')

      const { thoughtIndexUpdates, contextIndexUpdates, schemaVersion } = newStateMigrated

      // if the schema version changed, sync updates and pass the migrated state to loadState
      if (schemaVersion > schemaVersionOriginal) {

        dispatch({
          type: 'updateThoughts',
          contextIndexUpdates,
          thoughtIndexUpdates,
          forceRender: true,
          updates: { schemaVersion },
          callback: () => {
            console.info('Remote migrations complete.')
          },
        })

        return [newStateMigrated, oldStateMigrated]
      }
      else {
        return [newState, oldState]
      }
    })
    .then(([newState, oldState]) => loadState(newState, oldState))
}
