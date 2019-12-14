// util
import {
  timestamp,
} from '../util.js'

// updates thoughtIndex and contextIndex with any number of items
export const thoughtIndex = (state, { thoughtIndex, contextIndexUpdates, forceRender }) => {

  const newData = {
    ...state.thoughtIndex,
    ...thoughtIndex
  }

  // delete null items
  if (thoughtIndex) {
    Object.keys(thoughtIndex).forEach(key => {
      if (thoughtIndex[key] == null) {
        delete newData[key] // eslint-disable-line fp/no-delete
      }
    })
  }

  const newcontextIndex = {
    ...state.contextIndex,
    ...contextIndexUpdates
  }

  // delete empty children
  Object.keys(contextIndexUpdates).forEach(contextEncoded => {
    if (!contextIndexUpdates[contextEncoded] || contextIndexUpdates[contextEncoded].length === 0) {
      delete newcontextIndex[contextEncoded] // eslint-disable-line fp/no-delete
    }
  })

  return {
    // remove null items
    dataNonce: state.dataNonce + (forceRender ? 1 : 0),
    thoughtIndex: newData,
    contextIndex: newcontextIndex,
    lastUpdated: timestamp(),
  }
}
