// constants
import {
  SCHEMA_HASHKEYS as SCHEMA_FROM,
  SCHEMA_META_SETTINGS as SCHEMA_TO,
} from '../constants.js'

export const schemaVersionFrom = SCHEMA_FROM
export const schemaVersionTo = SCHEMA_TO

export const migrate = state => {
  return Promise.resolve({
    ...state,
    metaSettings: true,
    schemaVersion: schemaVersionTo
  })
}
