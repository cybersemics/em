import _ from 'lodash'
import Index from '../@types/IndexType'
import Path from '../@types/Path'
import State from '../@types/State'

interface Options {
  contextViews?: any
  cursor?: Path
  recentlyEdited?: Index<any>
  schemaVersion?: number
}

/** Merges recentlyEdited and schemaVersion into state. */
const loadLocalState = (state: State, { contextViews, cursor, recentlyEdited, schemaVersion }: Options) => ({
  ...state,
  contextViews: contextViews || state.contextViews,
  cursor: cursor || state.cursor,
  recentlyEdited: {
    ...state.recentlyEdited,
    ...recentlyEdited,
  },
  schemaVersion: schemaVersion || state.schemaVersion,
})

export default _.curryRight(loadLocalState)
