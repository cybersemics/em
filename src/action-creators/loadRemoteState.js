import { decode as firebaseDecode } from 'firebase-encode'
import { migrate } from '../migrations/index'
import * as db from '../db'
import { EMPTY_TOKEN, SCHEMA_HASHKEYS } from '../constants'
import { logWithTime } from '../util'
import { updateThoughts } from '../reducers'

/** Save all firebase state to state and localStorage. */
export const loadState = async (dispatch, newState, oldState) => {

  // delete local thoughts that no longer exists in firebase
  // only if remote was updated more recently than local since it is O(n)
  if (oldState.lastUpdated <= newState.lastUpdated) {
    Object.keys(oldState.thoughts.thoughtIndex).forEach(key => {
      if (!(key in newState.thoughts.thoughtIndex)) {
        // do not force render here, but after all values have been deleted
        dispatch({ type: 'deleteData', value: oldState.thoughts.thoughtIndex[key].value })
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

    return updated
      ? {
        ...accum,
        [key]: thought
      }
      : accum
  }, {})

  logWithTime('loadRemoteState: thoughtIndexUpdates generated')

  // run in background
  db.updateThoughtIndex(thoughtIndexUpdates)

  logWithTime('loadRemoteState: updateThoughtIndex')

  // contextEncodedRaw is firebase encoded
  const contextIndexUpdates = Object.keys(newState.thoughts.contextIndex || {}).reduce((accum, contextEncodedRaw) => {

    const contextEncoded = newState.schemaVersion < SCHEMA_HASHKEYS
      ? contextEncodedRaw === EMPTY_TOKEN ? '' : firebaseDecode(contextEncodedRaw)
      : contextEncodedRaw
    const parentEntryOld = oldState.thoughts.contextIndex[contextEncoded]
    const parentEntryNew = newState.thoughts.contextIndex[contextEncoded]
    const updated = !parentEntryOld
      || parentEntryNew.lastUpdated > parentEntryOld.lastUpdated
      // root will be empty but have a newer lastUpdated on a fresh start
      // WARNING: If children are added to the root before the remote state is loaded, they will be overwritten
      || parentEntryOld.children.length === 0

    // update if entry does not exist locally or is newer
    return updated
      ? {
        ...accum,
        [contextEncoded]: parentEntryNew,
      }
      : accum

  }, {})

  logWithTime('loadRemoteState: contextIndexUpdates generated')

  // run in background
  db.updateContextIndex(contextIndexUpdates)

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
    dispatch({
      type: 'updateThoughts',
      thoughtIndexUpdates,
      contextIndexUpdates,
      // do not persist to remote database since that is where the data is originating
      forceRender: true,
      recentlyEdited: newState.recentlyEdited,
      remote: false,
    })
  }

  logWithTime('loadRemoteState: updateThoughts')
}

/** Migrates both the old state (local) and the new state (remote) before merging. */
const loadRemoteState = newState => (dispatch, getState) => {

  const oldState = getState()
  const { schemaVersion: schemaVersionOriginal } = newState

  return Promise.all([
    migrate(newState),
    migrate(oldState),
  ])
    .then(([newStateUpdates, oldStateUpdates]) => {
      logWithTime('loadRemoteState: migrated')

      const { thoughtIndexUpdates, contextIndexUpdates, schemaVersion } = newStateUpdates

      // if the schema version changed, sync updates and pass the migrated state to loadState
      if (schemaVersion > schemaVersionOriginal) {

        const updateThoughtsArgs = {
          contextIndexUpdates,
          thoughtIndexUpdates,
          forceRender: true,
          updates: { schemaVersion },
        }

        const newStateMigrated = updateThoughts(newState, updateThoughtsArgs)
        const oldStateMigrated = updateThoughts(oldState, updateThoughtsArgs)

        dispatch({
          type: 'updateThoughts',
          ...updateThoughtsArgs,
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
    .then(([newState, oldState]) => loadState(dispatch, newState, oldState))
}

export default loadRemoteState
