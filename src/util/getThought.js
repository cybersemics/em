import { store } from '../store.js'

// util
import { hashThought } from './hashThought.js'

export const getThought = (key, data = store.getState().data) =>
  data[hashThought(key)]
