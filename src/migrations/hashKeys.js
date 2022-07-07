import _ from 'lodash'
import * as murmurHash3 from 'murmurhash3js'
import { SCHEMA_HASHKEYS, SCHEMA_ROOT } from '../constants'
import hashThought from '../util/hashThought'

export const schemaVersionFrom = SCHEMA_ROOT
export const schemaVersionTo = SCHEMA_HASHKEYS

/** Migrates unhashed keys to hashed keys. */
export const migrate = state => {
  const {
    thoughts: { lexemeIndex, contextThoughts },
  } = state

  console.info(`Migrating ${Object.keys(lexemeIndex).length} lexemeIndex keys...`)

  // hash the lexemeIndex key using hashThought

  // TODO: Handle collisions
  const lexemeIndexUpdates = _.transform(
    lexemeIndex,
    (accum, lexeme, key) => {
      const hash = hashThought(key)

      /** The property lastUpdated is currently stored on the thought object, but not on each individual context in thought.contexts. Rather than losing the lastUpdated for the merged context, inject it into the context object for possible restoration. */
      const addLastUpdatedCurrent = parent => ({ ...parent, lastUpdated: lexeme.lastUpdated })

      /** Accumulate lastUpdated. */
      const addLastUpdatedAccum = parent => ({ ...parent, lastUpdated: accum[hash].lastUpdated })

      // do not submit an update if the hash matches the key
      if (hash === key) {
        accum[key] = null
        accum[hash] = {
          ...lexeme,
          // inject lastUpdated into context object (as described above)
          contexts: (lexeme.contexts || [])
            .map(addLastUpdatedCurrent)
            .concat(((accum[hash] || {}).contexts || []).map(addLastUpdatedAccum) || []),
        }
      }
    },
    {},
  )

  console.info(`Migrating ${Object.keys(contextThoughts).length} thoughtIndex keys...`)

  // hashContext now uses murmurhash to limit key length
  // hash each old contextEncoded to get them to match
  const thoughtIndexUpdates = _.transform(
    contextThoughts,
    (accum, value, key) => {
      accum[key] = null
      accum[murmurHash3.x64.hash128(key)] = value
    },
    {},
  )

  console.info('Deleting old thoughtIndex from localStorage...')

  return Promise.resolve({
    lexemeIndexUpdates,
    thoughtIndexUpdates,
    schemaVersion: SCHEMA_HASHKEYS,
  })
}
