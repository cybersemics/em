import { store } from '../store.js'

// util
import {
  ROOT_TOKEN,
  SCHEMA_ROOT,
} from '../constants.js'

// util
import {
  getThought,
  hashContext,
  syncRemote,
} from '../util.js'

// change root → __ROOT__
export const root = state => {

  const { thoughtIndex, contextIndex, cursor } = state

  const migrateRootContextUpdates = {
    [hashContext(['root'])]: null,
    [hashContext([ROOT_TOKEN])]: contextIndex[hashContext([ROOT_TOKEN])],
  }

  console.info('Migrating "root"...')

  const thoughtIndexUpdates = {}
  thoughtIndexUpdates.root = null
  thoughtIndexUpdates[ROOT_TOKEN] = getThought(ROOT_TOKEN, thoughtIndex)
  syncRemote(thoughtIndexUpdates, migrateRootContextUpdates, null, { schemaVersion: SCHEMA_ROOT }, () => {
    console.info('Done')
  })

  // re-render after everything has been updated
  // only if there is no cursor, otherwise it interferes with editing
  if (!cursor) {
    store.dispatch({ type: 'render' })
  }
}
