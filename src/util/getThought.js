import { store } from '../store.js'

// util
import { hashThought } from './hashThought.js'

export const getThought = (value, thoughtIndex = store.getState().present.thoughtIndex) =>
  thoughtIndex[hashThought(value)]

// useful for debugging
window.getThought = getThought
