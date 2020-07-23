import _ from 'lodash'
import { State } from '../util/initialState'
import newThought, { NewThoughtPayload } from '../reducers/newThought'

/** Alias for newThought with insertNewSubthought: true. */
const newSubthought = (state: State, payload: NewThoughtPayload | string) => {

  // optionally allow string value to be passed as entire payload
  if (typeof payload === 'string') {
    payload = { value: payload }
  }

  return newThought(state, { ...payload, insertNewSubthought: true })
}

export default _.curryRight(newSubthought)
