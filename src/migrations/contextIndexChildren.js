import { reduceObj } from '../util'

// constants
import {
  SCHEMA_CONTEXTINDEX_CHILDREN,
  SCHEMA_META_SETTINGS,
} from '../constants'

export const schemaVersionFrom = SCHEMA_META_SETTINGS
export const schemaVersionTo = SCHEMA_CONTEXTINDEX_CHILDREN

/** Migrates unhashed keys to hashed keys. */
export const migrate = state => {

  const { thoughts: { contextIndex } } = state

  console.info(`Migrating ${Object.keys(contextIndex).length} contextIndex children...`)

  const contextIndexUpdates = reduceObj(contextIndex, (key, value) => ({
    [key]: {
      children: contextIndex[key],
      // set lastUpdated to newest child lastUpdated
      lastUpdated: contextIndex[key].reduce(
        (accum, child) => child.lastUpdated > accum ? child.lastUpdated : accum,
        '' // any time stamp will evaluate to newer than empty string
      )
    }
  }))

  return Promise.resolve({
    contextIndexUpdates,
    thoughtIndexUpdates: {},
    schemaVersion: SCHEMA_CONTEXTINDEX_CHILDREN
  })
}
