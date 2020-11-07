import _ from 'lodash'
import { render } from '../reducers'
import { reducerFlow } from '../util'
import { State } from '../util/initialState'
import { Index, Path, Timestamp } from '../types'

interface Options {
  contextViews?: any,
  cursor?: Path,
  lastUpdated?: Timestamp,
  recentlyEdited?: Index<any>,
  schemaVersion?: number,
}

/** Merges recentlyEdited and schemaVersion into state. */
const loadLocalState = (state: State, { contextViews, cursor, lastUpdated, recentlyEdited, schemaVersion }: Options) =>
  reducerFlow([

    // update recentlyEdited and schemaVersion
    state => ({
      ...state,
      contextViews: contextViews || state.contextViews,
      cursor: cursor || state.cursor,
      lastUpdated: lastUpdated || state.lastUpdated,
      recentlyEdited: {
        ...state.recentlyEdited,
        ...recentlyEdited
      },
      schemaVersion: schemaVersion || state.schemaVersion,
    }),

    // re-render
    render,

  ])(state)

export default _.curryRight(loadLocalState)
