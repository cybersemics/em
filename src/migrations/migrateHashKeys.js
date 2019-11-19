import * as murmurHash3 from 'murmurhash3js'

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

export const migrateHashKeys = value => {

  console.info(`Migrating ${Object.keys(value.data).length} data keys...`)

  // hash the data key using hashThought

  // TODO: Handle collisions
  const dataUpdates = reduceObj(value.data, (key, item, accum) => {
    const hash = hashThought(key)

    // At time of writing, lastUpdated is stored on the item object, but not on each individual context in item.memberOf
    // Rather than losing the lastUpdated for the merged context, inject it into the context object for possible restoration
    const addLastUpdatedCurrent = parent => ({ ...parent, lastUpdated: item.lastUpdated })
    const addLastUpdatedAccum = parent => ({ ...parent, lastUpdated: accum[hash].lastUpdated })

    // do not submit an update if the hash matches the key
    return hash === key ? {} : {
      [key]: null,
      [hash]: {
        ...item,
        // inject lastUpdated into context object (as described above)
        memberOf: (item.memberOf || []).map(addLastUpdatedCurrent)
          .concat(
            ((accum[hash] || {}).memberOf || []).map(addLastUpdatedAccum) || []
          )
      }
    }
  })

  console.info(`Migrating ${Object.keys(value.contextChildren).length} contextChildren keys...`)

  // encodeItems now uses murmurhash to limit key length
  // hash each old contextEncoded to get them to match
  const contextChildrenUpdates = reduceObj(value.contextChildren, (key, value) => {
    return {
      [key]: null,
      [murmurHash3.x64.hash128(key)]: value
    }
  })

  console.info(`Deleting old contextChildren from localStorage...`)

  // have to manually delete contextChildren since it is appended with '-' now
  for (let contextEncoded in contextChildrenUpdates) {
    if (contextChildrenUpdates[contextEncoded] === null) {
      // delete localStorage['contextChildren' + contextEncoded]
    }
  }

  console.info(`Syncing ${Object.keys(dataUpdates).length}...`)

  console.log(dataUpdates, contextChildrenUpdates, { updates: { schemaVersion: SCHEMA_HASHKEYS }, forceRender: true })
  // TODO: Remove remote: false to enable
  // queue is too big for localStorage
  sync(dataUpdates, contextChildrenUpdates, { updates: { schemaVersion: SCHEMA_HASHKEYS }, local: false, remote: false, forceRender: true, callback: () => {
    console.info('Done')
  }})
}
