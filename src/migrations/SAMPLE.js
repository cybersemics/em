// constants
import {
  SCHEMA_FROM,
  SCHEMA_TO,
} from '../constants'

export const schemaVersionFrom = SCHEMA_FROM
export const schemaVersionTo = SCHEMA_TO

/** Migrates the state from SCHEMA_FROM to SCHEMA_TO. */
export const migrate = state => {
  return Promise.resolve({
    ...state,
    schemaVersion: schemaVersionTo
  })
}
