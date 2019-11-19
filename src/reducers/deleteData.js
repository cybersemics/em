// util
import {
  encodeItems,
  getThought,
  hashThought,
  timestamp,
} from '../util.js'

// SIDE EFFECTS: localStorage
export const deleteData = (state, { value, forceRender }) => {

  const data = Object.assign({}, state.data)
  const item = getThought(value, state.data)
  delete data[hashThought(value)]
  delete localStorage['data-' + hashThought(value)]
  localStorage.lastUpdated = timestamp()

  // delete value from all contexts
  const contextChildren = Object.assign({}, state.contextChildren)
  if (item && item.memberOf && item.memberOf.length > 0) {
    item.memberOf.forEach(parent => {
      if (!parent || !parent.context) {
        console.error(`Invariant Violation: parent of ${value} has no context: ${JSON.toString(parent)}`)
        return
      }
      const contextEncoded = encodeItems(parent.context)
      contextChildren[contextEncoded] = (contextChildren[contextEncoded] || [])
        .filter(child => child.key !== value)
      if (contextChildren[contextEncoded].length === 0) {
        delete contextChildren[contextEncoded]
      }
    })
  }

  return {
    data,
    contextChildren,
    lastUpdated: timestamp(),
    dataNonce: state.dataNonce + (forceRender ? 1 : 0)
  }
}
