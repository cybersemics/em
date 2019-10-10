import { timestamp } from '../util'

export const data = (state) => ({ data, contextChildrenUpdates, forceRender }) => {

  const newData = data ? Object.assign({}, state.data, data) : state.data

  // delete null items
  if (data) {
    for (let key in data) {
      if (data[key] == null) {
        delete newData[key]
      }
    }
  }

  const newContextChildren = Object.assign({}, state.contextChildren, contextChildrenUpdates)

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
    lastUpdated: timestamp(),
    contextChildren: newContextChildren
  }
}