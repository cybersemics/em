import _ from 'lodash'
import { Index, Path, State, Timestamp } from '../@types'

interface Options {
  contextViews?: any
  cursor?: Path
  lastUpdated?: Timestamp
  recentlyEdited?: Index<any>
  schemaVersion?: number
}

/** Merges recentlyEdited and schemaVersion into state. */
const loadLocalState = (
  state: State,
  { contextViews, cursor, lastUpdated, recentlyEdited, schemaVersion }: Options,
) => ({
  ...state,
  contextViews: contextViews || state.contextViews,
  cursor: cursor || state.cursor,
  lastUpdated: lastUpdated || state.lastUpdated,
  recentlyEdited: {
    ...state.recentlyEdited,
    ...recentlyEdited,
  },
  schemaVersion: schemaVersion || state.schemaVersion,
})

export default _.curryRight(loadLocalState)
