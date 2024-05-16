import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import newThought, { NewThoughtPayload } from '../actions/newThought'

/** Alias for newThought with insertNewSubthought: true. */
const newSubthought = (state: State, payload: NewThoughtPayload | string) => {
  // optionally allow string value to be passed as entire payload
  if (typeof payload === 'string') {
    payload = { value: payload }
  }

  return newThought(state, { ...payload, insertNewSubthought: true })
}

/** Action-creator for newSubthought. */
export const newSubthoughtActionCreator = (): Thunk => dispatch => dispatch({ type: 'newSubthought' })

export default _.curryRight(newSubthought)
