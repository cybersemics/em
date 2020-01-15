import { store } from '../store.js'

// migrations
import {
  migrateHashKeys,
} from './migrateHashKeys'

// constants
import {
  SCHEMA_LATEST,
  SCHEMA_ROOT,
} from '../constants.js'

const migrations = {
  [SCHEMA_ROOT]: migrateHashKeys
}

// migrate the given state based on its schemaVersion
// continue migrating until schemaVersion === SCHEMA_LATEST
// error if no migration is found for a given schemaVersion
export const migrate = state => {

  const { schemaVersion } = state

  // schema is up-to-date. no migrations needed.
  return schemaVersion === SCHEMA_LATEST ? null
    // schema version not found
    : !migrations[schemaVersion] ? Promise.reject(new Error('migrate: Unrecognized schemaVersion: ' + schemaVersion))
    // migrate schema
    : migrations[schemaVersion](state)
      // RECURSION
      // by this time the store will contain the newly migrated state
      .then(() => new Promise((resolve, reject) => {
        // TODO: Need to retrieve updated state or accurately detect when local state has been updated
        // In the mean time, wait one second for local state to be updated from firebase
        setTimeout(() => resolve(migrate(store.getState())), 1000)
      }))
}
