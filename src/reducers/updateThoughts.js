import render from './render'

// util
import {
  mergeUpdates,
  sync,
  timestamp,
} from '../util'

// selectors
import {
  expandThoughts,
} from '../selectors'

/**
 * Updates thoughtIndex and contextIndex with any number of thoughts
 * SIDE EFFECT: Sync thoughts here before thoughtIndexUpdates and contextIndexUpdates get merged. By the time there is a new state it is too late, and I want to avoid moving everything into impure action-creators.
 */
export default (state, { thoughtIndexUpdates, contextIndexUpdates, forceRender, recentlyEdited, contextChain, updates, callback }) => {

  const thoughtIndex = mergeUpdates(state.thoughtIndex, thoughtIndexUpdates)
  const contextIndex = mergeUpdates(state.contextIndex, contextIndexUpdates)
  const recentlyEditedNew = recentlyEdited || state.recentlyEdited

  setTimeout(() => {
    sync(thoughtIndexUpdates, contextIndexUpdates, { forceRender, recentlyEdited: recentlyEditedNew, updates, callback })
  })

  return {
    contextIndex,
    expanded: expandThoughts(state, state.cursor, contextChain),
    recentlyEdited: recentlyEditedNew,
    thoughtIndex,
    ...forceRender ? {
      ...render(state),
      lastUpdated: timestamp(),
    } : null,
  }
}
