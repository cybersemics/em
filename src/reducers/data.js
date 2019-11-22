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
    Object.keys(data).forEach(key => {
      if (data[key] == null) {
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
    data: newData,
    contextChildren: newContextChildren,
    lastUpdated: timestamp(),
  }
}
