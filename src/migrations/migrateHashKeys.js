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

  console.info('Migrating hash keys...')

  // hash the data key using hashThought
  const dataUpdates = reduceObj(value.data, (key, value) => {
    const hash = hashThought(key)
    // do not submit an update if the hash matches the key
    return hash === key ? {} : {
      [key]: null,
      [hash]: value
    }
  })

  // encodeItems now uses murmurhash to limit key length
  // hash each old contextEncoded to get them to match
  const contextChildrenUpdates = reduceObj(value.contextChildren, (key, value) => ({
    [key]: null,
    [murmurHash3.x64.hash128(key)]: value
  }))

  // have to manually delete  contextChildren since it is appended with '-' now
  for (let contextEncoded in contextChildrenUpdates) {
    if (contextChildrenUpdates[contextEncoded] === null) {
      console.info('Deleting old contextChildren' + contextEncoded)
      delete localStorage['contextChildren' + contextEncoded]
    }
  }

  console.info(`Syncing ${Object.keys(dataUpdates).length} data updates...`)
  sync(dataUpdates, contextChildrenUpdates, { updates: { schemaVersion: SCHEMA_HASHKEYS }, forceRender: true, callback: () => {
    console.info('Done')
  }})
}
