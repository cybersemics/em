// util
import {
  timestamp,
} from '../util.js'

// updates thoughtIndex and contextChildren with any number of items
export const thoughtIndex = (state, { thoughtIndex, contextChildrenUpdates, forceRender }) => {

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

  const newContextChildren = {
    ...state.contextChildren,
    ...contextChildrenUpdates
  }

  // delete empty children
  Object.keys(contextChildrenUpdates).forEach(contextEncoded => {
    if (!contextChildrenUpdates[contextEncoded] || contextChildrenUpdates[contextEncoded].length === 0) {
      delete newContextChildren[contextEncoded] // eslint-disable-line fp/no-delete
    }
  })

  return {
    // remove null items
    dataNonce: state.dataNonce + (forceRender ? 1 : 0),
    thoughtIndex: newData,
    contextChildren: newContextChildren,
    lastUpdated: timestamp(),
  }
}
