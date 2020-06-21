import { render } from '../reducers'
import { reducerFlow } from '../util'

/** Merges recentlyEdited and schemaVersion into state. */
const loadLocalState = (state, { contextViews, cursor, lastUpdated, recentlyEdited, schemaVersion }) =>
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
