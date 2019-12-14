import { store } from '../store.js'

// util
import { getThought } from './getThought.js'

/** Returns true if the head of the given context exists in the thoughtIndex */
export const exists = (key, thoughtIndex = store.getState().thoughtIndex) =>
  key != null && !!getThought(key, thoughtIndex)
