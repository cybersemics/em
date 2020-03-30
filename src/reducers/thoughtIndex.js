import render from './render.js'
import _ from 'lodash'
import * as immer from 'immer'

// util
import {
  expandThoughts,
  timestamp,
} from '../util.js'

// updates thoughtIndex and contextIndex with any number of thoughts
export default (state, { thoughtIndexUpdates, contextIndexUpdates, recentlyEdited, forceRender, ignoreNullThoughts }) => {

  const thoughtIndexNew = {
    ...state.thoughtIndex,
    ...thoughtIndexUpdates
  }

  // use immer and _.set to update the deep contextIndex child paths
  const contextIndexNew = immer.produce(state.contextIndex, draft => {
    Object.entries(contextIndexUpdates).forEach(([path, value]) => {
      _.set(draft, path, value)
    })
  })

  if (!ignoreNullThoughts) {
    // delete null thoughts
    if (thoughtIndexUpdates) {
      Object.keys(thoughtIndexUpdates).forEach(key => {
        if (thoughtIndexUpdates[key] == null) {
          delete thoughtIndexNew[key] // eslint-disable-line fp/no-delete
        }
      })
    }

    // delete empty children
    // if (contextIndexUpdates) {
    //   Object.keys(contextIndexUpdates).forEach(contextEncoded => {
    //     if (!contextIndexUpdates[contextEncoded] || Object.keys(contextIndexUpdates[contextEncoded]).length === 0) {
    //       delete contextIndexNew[contextEncoded] // eslint-disable-line fp/no-delete
    //     }
    //   })
    // }
  }

  return {
    // remove null thoughts
    contextIndex: contextIndexNew,
    thoughtIndex: thoughtIndexNew,
    expanded: expandThoughts(state.cursor, thoughtIndexNew, contextIndexNew, state.contextViews),
    ...(recentlyEdited ? { recentlyEdited } : null),
    ...(forceRender ? {
      ...render(state),
      lastUpdated: timestamp(),
    } : null),
  }
}
