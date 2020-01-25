import { decode as firebaseDecode } from 'firebase-encode'
import * as localForage from 'localforage'
import { store } from '../store.js'

// constants
import {
  EMPTY_TOKEN,
  ROOT_TOKEN,
  SCHEMA_HASHKEYS,
} from '../constants.js'

// util
import {
  hashContext,
  equalPath,
  getThought,
} from '../util.js'

/** Loads newState from Firebase into local store */
export default (newState, oldState) => {

  const schemaVersion = newState.schemaVersion || 0 // convert to integer to allow numerical comparison

  // thoughtIndex
  // keyRaw is firebase encoded
  const thoughtIndexUpdates = Object.keys(newState.thoughtIndex).reduce((accum, keyRaw) => {

    const key = schemaVersion < SCHEMA_HASHKEYS
      ? (keyRaw === EMPTY_TOKEN ? '' : firebaseDecode(keyRaw))
      : keyRaw
    const thought = newState.thoughtIndex[keyRaw]
    const oldThought = oldState.thoughtIndex[key]
    const updated = thought && (!oldThought || thought.lastUpdated > oldThought.lastUpdated)

    if (updated) {
      // do not force render here, but after all values have been added
      localForage.setItem('thoughtIndex-' + key, thought)
    }

    return updated ? Object.assign({}, accum, {
      [key]: thought
    }) : accum
  }, {})

  // contextEncodedRaw is firebase encoded
  const contextIndexUpdates = Object.keys(newState.contextIndex || {}).reduce((accum, contextEncodedRaw) => {

    const subthoughts = newState.contextIndex[contextEncodedRaw]
    const contextEncoded = schemaVersion < SCHEMA_HASHKEYS
      ? (contextEncodedRaw === EMPTY_TOKEN ? ''
        : contextEncodedRaw === hashContext(['root']) && !getThought(ROOT_TOKEN, newState.thoughtIndex) ? hashContext([ROOT_TOKEN])
          : firebaseDecode(contextEncodedRaw))
      : contextEncodedRaw
    const subthoughtsOld = oldState.contextIndex[contextEncoded] || []

    // TODO: Add lastUpdated to contextIndex. Requires migration.
    // subthoughts.lastUpdated > oldSubthoughts.lastUpdated
    // technically subthoughts is a disparate list of ranked thought objects (as opposed to an intersection representing a single context), but equalPath works
    if (subthoughts && subthoughts.length > 0 && !equalPath(subthoughts, subthoughtsOld)) {
      localForage.setItem('contextIndex-' + contextEncoded, subthoughts)

      return {
        ...accum,
        [contextEncoded]: subthoughts
      }
    }
    else {
      return accum
    }

  }, {})

  // delete local contextIndex that no longer exists in firebase
  // only if remote was updated more recently than local since it is O(n)
  if (oldState.lastUpdated <= newState.lastUpdated) {
    Object.keys(oldState.contextIndex).forEach(contextEncoded => {
      if (!(contextEncoded in (newState.contextIndex || {}))) {
        contextIndexUpdates[contextEncoded] = null
      }
    })
  }

  // TODO: Re-render only thoughts that have changed
  store.dispatch({
    type: 'thoughtIndex',
    thoughtIndexUpdates,
    contextIndexUpdates,
    proseViews: newState.proseViews,
    forceRender: true
  })
}
