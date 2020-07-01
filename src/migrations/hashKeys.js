import _ from 'lodash'
import * as murmurHash3 from 'murmurhash3js'
import { hashThought } from '../util'
import { SCHEMA_HASHKEYS, SCHEMA_ROOT } from '../constants'

export const schemaVersionFrom = SCHEMA_ROOT
export const schemaVersionTo = SCHEMA_HASHKEYS

/** Migrates unhashed keys to hashed keys. */
export const migrate = state => {

  const { thoughts: { thoughtIndex, contextThoughts } } = state

  console.info(`Migrating ${Object.keys(thoughtIndex).length} thoughtIndex keys...`)

  // hash the thoughtIndex key using hashThought

  // TODO: Handle collisions
  const thoughtIndexUpdates = _.transform(thoughtIndex, (accum, thought, key) => {
    const hash = hashThought(key)

    /** The property lastUpdated is currently stored on the thought object, but not on each individual context in thought.contexts. Rather than losing the lastUpdated for the merged context, inject it into the context object for possible restoration. */
    const addLastUpdatedCurrent = parent => ({ ...parent, lastUpdated: thought.lastUpdated })

    /** Accumulate lastUpdated. */
    const addLastUpdatedAccum = parent => ({ ...parent, lastUpdated: accum[hash].lastUpdated })

    // do not submit an update if the hash matches the key
    if (hash === key) {
      accum[key] = null
      accum[hash] = {
        ...thought,
        // inject lastUpdated into context object (as described above)
        contexts: (thought.contexts || []).map(addLastUpdatedCurrent)
          .concat(
            ((accum[hash] || {}).contexts || []).map(addLastUpdatedAccum) || []
          )
      }
    }
  }, {})

  console.info(`Migrating ${Object.keys(contextThoughts).length} contextIndex keys...`)

  // hashContext now uses murmurhash to limit key length
  // hash each old contextEncoded to get them to match
  const contextIndexUpdates = _.transform(contextThoughts, (accum, value, key) => {
    accum[key] = null
    accum[murmurHash3.x64.hash128(key)] = value
  }, {})

  console.info(`Deleting old contextIndex from localStorage...`)

  return Promise.resolve({
    thoughtIndexUpdates,
    contextIndexUpdates,
    schemaVersion: SCHEMA_HASHKEYS
  })
}
