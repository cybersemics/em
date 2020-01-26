// constants
import {
  SCHEMA_LATEST,
} from '../constants.js'

// migrations
import * as hashKeys from './hashKeys.js'

const migrations = [
  hashKeys,
]

// index migrations by schemaVersionFrom
const migrationIndex = migrations.reduce((accum, cur) => {
  if (accum[cur.schemaVersionFrom]) {
    throw new Error('Duplicate schemaVersion migration: ' + cur.schemaVersionFrom)
  }
  return {
    ...accum,
    [cur.schemaVersionFrom]: cur.migrate
  }
}, {})

// migrate the given state based on its schemaVersion
// continue migrating until schemaVersion === SCHEMA_LATEST
// error if no migration is found for a given schemaVersion
export const migrate = state => {

  const { schemaVersion } = state

  // schema is up-to-date. no migrations needed.
  return schemaVersion === SCHEMA_LATEST ? Promise.resolve(state)
    // schema version not found
    : !migrationIndex[schemaVersion] ? Promise.reject(new Error('migrate: Unrecognized schemaVersion: ' + schemaVersion))
    // migrate schema
    : (
      console.info(`Migrating schemaVersion ${schemaVersion}...`),
      migrationIndex[schemaVersion](state)
    )
    .then(newState => {

      if (state.schemaVersion >= newState.schemaVersion) {
        throw new Error('Migration Validation Error: Expected schemaVersionFrom < schemaVersionTo for migration of schemaVersion ' + state.schemaVersion)
      }
      else {
        console.info(`Migrated schemaVersion ${schemaVersion} → ${newState.schemaVersion}`)
      }

      // RECURSION
      return migrate(newState)
    })
}
