import render from './render'

// util
import {
  expandThoughts,
  sync,
  timestamp,
} from '../util'

/**
 * Updates thoughtIndex and contextIndex with any number of thoughts
 * SIDE EFFECT: Sync thoughts here before thoughtIndexUpdates and contextIndexUpdates get merged. By the time there is a new state it is too late, and I want to avoid moving everything into impure action-creators.
 */
export default (state, { thoughtIndexUpdates, contextIndexUpdates, forceRender, recentlyEdited, contextChain, updates, callback }) => {

  const thoughtIndex = {
    ...state.thoughtIndex,
    ...thoughtIndexUpdates
  }

  const contextIndex = {
    ...state.contextIndex,
    ...contextIndexUpdates
  }

  const recentlyEditedNew = recentlyEdited || state.recentlyEdited

  setTimeout(() => {
    sync(thoughtIndexUpdates, contextIndexUpdates, { forceRender, recentlyEdited: recentlyEditedNew, updates, callback })
  })

  return {
    contextIndex,
    expanded: expandThoughts(state.cursor, thoughtIndex, contextIndex, state.contextViews, contextChain),
    recentlyEdited: recentlyEditedNew,
    thoughtIndex,
    ...(forceRender ? {
      ...render(state),
      lastUpdated: timestamp(),
    } : null),
  }
}
