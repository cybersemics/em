import { State } from '../@types'
import { newThought } from '../reducers'
import { rankThoughtsFirstMatch } from '../selectors'
import _ from 'lodash'

import { NewThoughtPayload } from '../reducers/newThought'
/**
 * Creates new thought at the given unranked path first matched.
 */
const newThoughtAtFirstMatch = (state: State, payload: Omit<NewThoughtPayload, 'at'> & { at: string[] }): State => {
  const path = rankThoughtsFirstMatch(state, payload.at)
  if (!path) throw new Error(`Ranked thoughts not found for context: ${payload.at}`)
  return newThought(state, {
    ...payload,
    at: path,
  })
}

export default _.curryRight(newThoughtAtFirstMatch)
