import * as murmurHash3 from 'murmurhash3js'
import * as localForage from 'localforage'

// constants
import {
  SCHEMA_HASHKEYS,
} from '../constants.js'

// util
import {
  hashThought,
  reduceObj,
  sync,
} from '../util.js'

export const hashKeys = state => {

  const { thoughtIndex, contextSubthoughts } = state

  console.info(`Migrating ${Object.keys(thoughtIndex).length} thoughtIndex keys...`)

  // hash the thoughtIndex key using hashThought

  // TODO: Handle collisions
  const thoughtIndexUpdates = reduceObj(thoughtIndex, (key, thought, accum) => {
    const hash = hashThought(key)

    // At time of writing, lastUpdated is stored on the thought object, but not on each individual context in thought.contexts
    // Rather than losing the lastUpdated for the merged context, inject it into the context object for possible restoration
    const addLastUpdatedCurrent = parent => ({ ...parent, lastUpdated: thought.lastUpdated })
    const addLastUpdatedAccum = parent => ({ ...parent, lastUpdated: accum[hash].lastUpdated })

    // do not submit an update if the hash matches the key
    return hash === key ? {} : {
      [key]: null,
      [hash]: {
        ...thought,
        // inject lastUpdated into context object (as described above)
        contexts: (thought.contexts || []).map(addLastUpdatedCurrent)
          .concat(
            ((accum[hash] || {}).contexts || []).map(addLastUpdatedAccum) || []
          )
      }
    }
  })

  console.info(`Migrating ${Object.keys(contextSubthoughts).length} contextIndex keys...`)

  // hashContext now uses murmurhash to limit key length
  // hash each old contextEncoded to get them to match
  const contextIndexUpdates = reduceObj(contextSubthoughts, (key, value) => {
    return {
      [key]: null,
      [murmurHash3.x64.hash128(key)]: value
    }
  })

  console.info(`Deleting old contextIndex from localStorage...`)

  // have to manually delete contextIndex since it is appended with '-' now
  const removals = Object.keys(contextIndexUpdates).map(contextEncoded =>
    contextIndexUpdates[contextEncoded] === null
      ? localForage.removeItem('contextSubthoughts' + contextEncoded).catch(err => {
        throw new Error(err)
      })
      : Promise.resolve()
  )

  console.info(`Syncing ${Object.keys(thoughtIndexUpdates).length}...`)

  return Promise.all(removals).then(() =>
    sync(thoughtIndexUpdates, contextIndexUpdates, { updates: { schemaVersion: SCHEMA_HASHKEYS }, local: false, bypassQueue: true, forceRender: true, callback: () => {
      console.info('Done')
    } })
  )
}
