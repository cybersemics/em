
// migrations
import {
  migrateHashKeys,
} from './migrateHashKeys'

// constants
import {
  SCHEMA_ROOT,
} from '../constants.js'

export const migrate = value => {
  (
    // switch on value.schemaVersion and pass value
    ({

      [SCHEMA_ROOT]: migrateHashKeys

    })[value.schemaVersion]
    || (value => {
      console.error('migrate: Unrecognized schemaVersion:', value.schemaVersion)
    })
  )(value)
}
