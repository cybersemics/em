import { store } from '../store.js'

// util
import { getThought } from './getThought.js'

/** Returns true if the signifier of the given context exists in the data */
export const exists = (key, data = store.getState().data) =>
  key != null && !!getThought(key, data)
