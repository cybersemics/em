import { store } from '../store.js'
import { sync } from '../util.js'
import { hashContext } from './hashContext.js'

export const updatePinnedThought = (newPath, oldPath, { pinnedThought = store.getState().pinnedThought }) => {

  if (oldPath) {
    if (pinnedThought[hashContext(oldPath)]) delete pinnedThought[hashContext(oldPath)] // eslint-disable-line fp/no-delete
    else return Object.assign({}, pinnedThought)
  }
  const hash = hashContext(newPath)
  pinnedThought[hash] ? delete pinnedThought[hash] : pinnedThought[hash] = true // eslint-disable-line fp/no-delete

  setTimeout(() => {
    sync({}, {}, { updates: { pinnedThought } })
  })
  return Object.assign({}, pinnedThought)
}
