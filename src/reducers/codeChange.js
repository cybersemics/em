// util
import {
  getThought,
  hashThought,
  sigKey,
  syncRemote,
} from '../util.js'

// SIDE EFFECTS: localStorage, syncRemote
export const codeChange = ({ data }, { itemsRanked, newValue }) => {

  const value = sigKey(itemsRanked)
  const oldItem = getThought(value, data)
  const newItem = Object.assign({}, oldItem, {
    code: newValue
  })

  data[hashThought(value)] = newItem

  setTimeout(() => {
    localStorage['data-' + hashThought(value)] = JSON.stringify(newItem)
    syncRemote({
      [value]: newItem
    }, {})
  })

  return {
    data: Object.assign({}, data)
  }
}