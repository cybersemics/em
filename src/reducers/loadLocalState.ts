import { render } from '../reducers'
import { reducerFlow } from '../util'
import { State } from '../util/initialState'
import { Path, Timestamp } from '../types'
import { GenericObject } from '../utilTypes'

interface Options {
  contextViews?: any,
  cursor?: Path,
  lastUpdated?: Timestamp,
  recentlyEdited?: GenericObject<any>,
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
      cursorBeforeEdit: cursor || state.cursor,
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

export default loadLocalState
