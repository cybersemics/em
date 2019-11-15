// util
import {
  timestamp,
} from '../util.js'

// updates data and contextChildren with any number of items
export const data = (state, { data, contextChildrenUpdates, forceRender }) => {

  const newData = {
    ...state.data,
    ...data
  }

  // delete null items
  if (data) {
    for (let key in data) {
      if (data[key] == null) {
        delete newData[key]
      }
    }
  }

  const newContextChildren = {
    ...state.contextChildren,
    ...contextChildrenUpdates
  }

  // delete empty children
  for (let contextEncoded in contextChildrenUpdates) {
    if (!contextChildrenUpdates[contextEncoded] || contextChildrenUpdates[contextEncoded].length === 0) {
      delete newContextChildren[contextEncoded]
    }
  }

  return {
    // remove null items
    dataNonce: state.dataNonce + (forceRender ? 1 : 0),
    data: newData,
    contextChildren: newContextChildren,
    lastUpdated: timestamp(),
  }
}
