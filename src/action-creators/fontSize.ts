import { Thunk } from '../types'
import { storage } from '../util/localStorage'

/** Sets fontSize in state and localStorage.. */
const fontSize =
  (value: number): Thunk =>
  (dispatch, getState) => {
    dispatch({ type: 'fontSize', value })
    setTimeout(() => {
      storage.fontSize = value
    })
  }

export default fontSize
