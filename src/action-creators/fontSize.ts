import { Thunk } from '../types'
import { storage } from '../util/storage'

/** Sets fontSize in state and localStorage.. */
const fontSize =
  (value: number): Thunk =>
  (dispatch, getState) => {
    dispatch({ type: 'fontSize', value })
    setTimeout(() => {
      storage.setItem('fontSize', String(value))
    })
  }

export default fontSize
