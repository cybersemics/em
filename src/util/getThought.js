import { store } from '../store'

// util
import { hashThought } from './hashThought'

export const getThought = (value, thoughtIndex = store.getState().thoughtIndex) =>
  thoughtIndex[hashThought(value)]

// useful for debugging
window.getThought = getThought
