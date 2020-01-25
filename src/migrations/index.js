// migrations
import { hashKeys } from './hashKeys.js'

// constants
import {
  SCHEMA_LATEST,
  SCHEMA_ROOT,
} from '../constants.js'

const migrations = {
  [SCHEMA_ROOT]: hashKeys,
}

// migrate the given state based on its schemaVersion
// continue migrating until schemaVersion === SCHEMA_LATEST
// error if no migration is found for a given schemaVersion
export const migrate = state => {

  const { schemaVersion } = state

  // schema is up-to-date. no migrations needed.
  return schemaVersion === SCHEMA_LATEST ? Promise.resolve(state)
    // schema version not found
    : !migrations[schemaVersion] ? Promise.reject(new Error('migrate: Unrecognized schemaVersion: ' + schemaVersion))
    // migrate schema
    : migrations[schemaVersion](state)
      // RECURSION
      .then(migrate)
}
