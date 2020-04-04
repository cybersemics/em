import { store } from '../store'

// util
import { getThought } from './getThought'

/** Returns true if the head of the given context exists in the thoughtIndex */
export const exists = (value, thoughtIndex = store.getState().thoughtIndex) =>
  value != null && !!getThought(value, thoughtIndex)
