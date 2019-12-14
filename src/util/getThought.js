import { store } from '../store.js'

// util
import { hashThought } from './hashThought.js'

export const getThought = (key, thoughtIndex = store.getState().thoughtIndex) =>
  thoughtIndex[hashThought(key)]
