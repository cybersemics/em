import { syncRemoteData } from '../store-utils'
import { sigKey } from '../util'

export const codeChange = (state) => ({ itemsRanked, newValue }) => {

  const value = sigKey(itemsRanked)
  const oldItem = state.data[value]
  const newItem = Object.assign({}, oldItem, {
    code: newValue
  })

  state.data[value] = newItem

  setTimeout(() => {
    localStorage['data-' + value] = JSON.stringify(newItem)
    syncRemoteData({
      [value]: newItem
    }, {})
  })

  return {
    data: Object.assign({}, state.data)
  }
}