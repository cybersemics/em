// util
import {
  timestamp,
} from '../util.js'

// updates thoughtIndex and contextIndex with any number of thoughts
export default (state, { thoughtIndexUpdates, contextIndexUpdates, proseViews, forceRender }) => {

  const thoughtIndexNew = {
    ...state.thoughtIndex,
    ...thoughtIndexUpdates
  }

  // delete null thoughts
  if (thoughtIndexUpdates) {
    Object.keys(thoughtIndexUpdates).forEach(key => {
      if (thoughtIndexUpdates[key] == null) {
        delete thoughtIndexNew[key] // eslint-disable-line fp/no-delete
      }
    })
  }

  const contextIndexNew = {
    ...state.contextIndex,
    ...contextIndexUpdates
  }

  // delete empty children
  Object.keys(contextIndexUpdates).forEach(contextEncoded => {
    if (!contextIndexUpdates[contextEncoded] || contextIndexUpdates[contextEncoded].length === 0) {
      delete contextIndexNew[contextEncoded] // eslint-disable-line fp/no-delete
    }
  })

  return {
    // remove null thoughts
    contextIndex: contextIndexNew,
    dataNonce: state.dataNonce + (forceRender ? 1 : 0),
    lastUpdated: timestamp(),
    proseViews: {
      ...state.proseViews,
      ...proseViews,
    },
    thoughtIndex: thoughtIndexNew,
  }
}
