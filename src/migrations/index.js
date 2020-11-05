/** Here's documentation for migrations. */

// constants
import {
  SCHEMA_LATEST,
} from '../constants'

// migrations
import * as hashKeys from './hashKeys'
import * as metaSettings from './metaSettings'

const migrations = [
  hashKeys,
  metaSettings,
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

/** Migrates the given state based on its schemaVersion.
 * Continue migrating until schemaVersion === SCHEMA_LATEST.
 * Error if no migration is found for a given schemaVersion.
 */
export const migrate = state => {

  const { schemaVersion } = state

  // no schemaVersion (e.g. new local store) schema is up-to-date. no migrations needed.
  // Do not error if schemaVersion > SCHEMA_LATEST, as migration deployment may have been reverted
  return !schemaVersion || schemaVersion >= SCHEMA_LATEST ? Promise.resolve(state)
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
