import State from '../@types/State'
import contextToPath from '../selectors/contextToPath'
import _ from 'lodash'

import newThought, { NewThoughtPayload } from '../reducers/newThought'
/**
 * Creates new thought at the given unranked path first matched.
 */
const newThoughtAtFirstMatch = (state: State, payload: Omit<NewThoughtPayload, 'at'> & { at: string[] }): State => {
  const path = contextToPath(state, payload.at)
  if (!path) throw new Error(`Ranked thoughts not found for context: ${payload.at}`)
  return newThought(state, {
    ...payload,
    at: path,
  })
}

export default _.curryRight(newThoughtAtFirstMatch)
